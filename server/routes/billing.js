import express from 'express';
import Stripe from 'stripe'; 
import { sql, getAuthenticatedUser, ensureSchema, grantCommunityAccess, revokeCommunityAccess, UNA_BASE_URL, UNA_SECRET } from '../config.js';

const router = express.Router();

router.get('/api/cron/sync-meters', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized. Invalid CRON_SECRET.' });
        }

        if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe Key Missing");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const settings = await sql`SELECT user_id, platform_customer_id, stripe_account_id FROM bridge_settings WHERE platform_customer_id IS NOT NULL`;
        let eventsSent = 0;

        for (const s of settings) {
            let activeStripeCount = 0;
            if (s.stripe_account_id) {
                const mappingRows = await sql`SELECT stripe_product_id FROM bridge_mappings WHERE user_id = ${s.user_id} AND provider = 'stripe'`;
                const mappedProductIds = new Set(mappingRows.map(r => r.stripe_product_id));
                const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers WHERE creator_id = ${s.user_id} AND stripe_customer_id NOT LIKE 'pp_csv_%'`;
                const statusMap = {};
                customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

                try {
                    for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: s.stripe_account_id })) {
                        const productId = sub.plan?.product || sub.items?.data[0]?.price?.product;
                        const email = sub.customer?.email;
                        if (mappedProductIds.has(productId) && statusMap[email] === 'bridged') activeStripeCount++;
                    }
                } catch(e) {}
            }

            const ppRows = await sql`SELECT count(*) FROM bridge_customers WHERE creator_id = ${s.user_id} AND bridge_status = 'bridged' AND stripe_customer_id LIKE 'pp_csv_%'`;
            const ppCount = parseInt(ppRows[0].count) || 0;
            
            const pRows = await sql`SELECT count(*) FROM bridge_patreon_users WHERE creator_id = ${s.user_id} AND status = 'bridged'`;
            const pCount = parseInt(pRows[0].count) || 0;
            
            const mRows = await sql`SELECT count(DISTINCT email) FROM bridge_manual_users WHERE user_id = ${s.user_id} AND status = 'bridged' AND is_free_teammate = FALSE`;
            const mCount = parseInt(mRows[0].count) || 0;
            
            const totalBillableUsers = activeStripeCount + ppCount + pCount + mCount;
            
            try {
                await stripe.billing.meterEvents.create({
                    event_name: 'bridged_users_snapshot',
                    payload: { value: totalBillableUsers.toString(), stripe_customer_id: s.platform_customer_id },
                });
                eventsSent++;
            } catch(err) {}
        }
        res.json({ success: true, eventsSent });
    } catch (error) { res.status(500).json({ error: "Cron Failed" }); }
});

// --- NEW: THE AUTOMATED AFFILIATE PAYOUT CRON JOB ---
router.get('/api/cron/issue-credits', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized. Invalid CRON_SECRET.' });
        }

        if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe Key Missing");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await ensureSchema();
        
        // Find all creators who have a billing relationship with Sellout Crowds
        const settings = await sql`SELECT user_id, creator_email, platform_customer_id, lifetime_credited FROM bridge_settings WHERE platform_customer_id IS NOT NULL`;
        
        let creditsIssued = 0;
        let totalValueIssued = 0;
        let logs = [];

        for (const s of settings) {
            if (!s.creator_email) continue;

            try {
                // 1. Fetch their Lifetime Commission straight from UNA
                const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                    body: JSON.stringify({ action: 'get_affiliate_stats', email: s.creator_email })
                });
                
                const data = await response.json();
                if (!data || !data.success || !data.stats) continue;

                const lifetimeEarned = parseFloat(data.stats.commission || 0);
                const lifetimeCredited = parseFloat(s.lifetime_credited || 0);
                
                // 2. Calculate if they are owed money for this month
                const newCreditOwed = lifetimeEarned - lifetimeCredited;

                // 3. If they earned more than $0.01 this month, automate the credit!
                if (newCreditOwed >= 0.01) {
                    // In Stripe, applying a credit to a customer balance is a NEGATIVE amount
                    const amountInCents = Math.round(newCreditOwed * 100);
                    
                    await stripe.customers.createBalanceTransaction(
                        s.platform_customer_id,
                        {
                            amount: -amountInCents, // Negative = applying a credit!
                            currency: 'usd',
                            description: `Scouting Revenue Credit (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`
                        }
                    );

                    // 4. Update the DB so we don't double-pay them next month
                    await sql`UPDATE bridge_settings SET lifetime_credited = lifetime_credited + ${newCreditOwed} WHERE user_id = ${s.user_id}`;
                    
                    creditsIssued++;
                    totalValueIssued += newCreditOwed;
                    logs.push(`Issued $${newCreditOwed.toFixed(2)} to ${s.creator_email}`);
                }

            } catch (innerErr) {
                logs.push(`Failed to process ${s.creator_email}: ${innerErr.message}`);
            }
        }

        res.json({ success: true, creditsIssued, totalValueIssued, logs });
    } catch (error) { 
        res.status(500).json({ error: "Credit Cron Failed: " + error.message }); 
    }
});

router.get('/api/billing-estimate', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const sRows = await sql`SELECT stripe_account_id FROM bridge_settings WHERE user_id = ${user.id}`;
        const stripeAccountId = sRows.length > 0 ? sRows[0].stripe_account_id : null;

        const tRows = await sql`SELECT count(*) FROM bridge_team_seats WHERE owner_id = ${user.id}`;
        const teamCount = parseInt(tRows[0].count) || 0;

        const isEnterprise = Number(user.role) === 12;

        let freeSeats = 0;
        if (isEnterprise) freeSeats = Infinity;
        else if (Number(user.role) === 17) freeSeats = 6;
        else if (Number(user.role) === 16) freeSeats = 3;

        const billableTeamCount = Math.max(0, teamCount - freeSeats);

        let activeStripeCount = 0;
        if (stripeAccountId && process.env.STRIPE_SECRET_KEY) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const mappingRows = await sql`SELECT stripe_product_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
            const mappedProductIds = new Set(mappingRows.map(r => r.stripe_product_id));
            const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers WHERE creator_id = ${user.id} AND stripe_customer_id NOT LIKE 'pp_csv_%'`;
            const statusMap = {};
            customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

            try {
                for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: stripeAccountId })) {
                    const productId = sub.plan?.product || sub.items?.data[0]?.price?.product;
                    const email = sub.customer?.email;
                    if (mappedProductIds.has(productId) && statusMap[email] === 'bridged') activeStripeCount++;
                }
            } catch(e) {}
        }

        const ppRows = await sql`SELECT count(*) FROM bridge_customers WHERE creator_id = ${user.id} AND bridge_status = 'bridged' AND stripe_customer_id LIKE 'pp_csv_%'`;
        const ppCount = parseInt(ppRows[0].count) || 0;
        
        const pRows = await sql`SELECT count(*) FROM bridge_patreon_users WHERE creator_id = ${user.id} AND status = 'bridged'`;
        const pCount = parseInt(pRows[0].count) || 0;
        
        const mRows = await sql`SELECT count(DISTINCT email) FROM bridge_manual_users WHERE user_id = ${user.id} AND status = 'bridged' AND is_free_teammate = FALSE`;
        const mCount = parseInt(mRows[0].count) || 0;

        res.json({ 
            teamCount, 
            freeSeats,
            billableTeamCount,
            isEnterprise,
            bridgedCount: activeStripeCount + ppCount + pCount + mCount 
        });
    } catch (error) { res.status(500).json({ error: "Failed to fetch estimate" }); }
});

router.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;
    try {
        await ensureSchema();
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email;
            const customerId = session.customer; 
            const stripeProductId = session.metadata?.product_id;
            let bridgeStatus = 'pending';
            let userId = null;
            
            if (stripeProductId && customerEmail) {
                const rows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId} AND provider = 'stripe'`;
                if (rows.length > 0) {
                    userId = rows[0].user_id;
                    const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                    const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                    
                    let allSuccess = true;
                    for (const r of rows) {
                        const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        if (!result.success) allSuccess = false;
                    }
                    bridgeStatus = allSuccess ? 'bridged' : 'pending';
                }
            }
            if (customerId && customerEmail && userId) {
                await sql`INSERT INTO bridge_customers (stripe_customer_id, creator_id, email, bridge_status) VALUES (${customerId}, ${userId}, ${customerEmail}, ${bridgeStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status, creator_id = EXCLUDED.creator_id`;
            }
        } 
        else if (event.type === 'customer.subscription.deleted') {
            const sub = event.data.object;
            const customerId = sub.customer;
            const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            if (customerId && stripeProductId) {
                const customerRows = await sql`SELECT email FROM bridge_customers WHERE stripe_customer_id = ${customerId}`;
                if (customerRows.length > 0) {
                    const customerEmail = customerRows[0].email;
                    const mapRows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId} AND provider = 'stripe'`;
                    if (mapRows.length > 0) {
                        const userId = mapRows[0].user_id;
                        const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                        const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                        
                        for (const r of mapRows) {
                            await revokeCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        }
                        await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                    }
                }
            }
        }
        else if (event.type === 'customer.subscription.updated') {
             const sub = event.data.object;
             const status = sub.status; 
             const customerId = sub.customer;
             const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
             if (customerId && stripeProductId) {
                 const customerRows = await sql`SELECT email FROM bridge_customers WHERE stripe_customer_id = ${customerId}`;
                 if (customerRows.length > 0) {
                     const customerEmail = customerRows[0].email;
                     const mapRows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId} AND provider = 'stripe'`;
                     if (mapRows.length > 0) {
                         const userId = mapRows[0].user_id;
                         const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                         const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                         
                         const currentStatus = customerRows[0].bridge_status;
                         if (currentStatus !== 'revoked') {
                             if (status === 'unpaid' || status === 'past_due' || status === 'canceled') {
                                 for (const r of mapRows) {
                                     await revokeCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                                 }
                                 await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                             } else if (status === 'active') {
                                 let allSuccess = true;
                                 for (const r of mapRows) {
                                     const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                                     if (!result.success) allSuccess = false;
                                 }
                                 const newStatus = allSuccess ? 'bridged' : 'pending';
                                 await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${customerEmail}`;
                             }
                         }
                     }
                 }
             }
        }
    } catch (error) {}
    res.json({ received: true });
});

router.post('/api/paypal-webhook', async (req, res) => {
    const event = req.body;
    try {
        await ensureSchema();
        if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const sub = event.resource;
            const customerEmail = sub.subscriber?.email_address;
            const customerId = sub.id; 
            const planId = sub.plan_id;
            let bridgeStatus = 'pending';
            let userId = null;
            if (planId && customerEmail) {
                const rows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${planId} AND provider = 'paypal'`;
                if (rows.length > 0) {
                    userId = rows[0].user_id;
                    const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                    const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                    
                    let allSuccess = true;
                    for (const r of rows) {
                        const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        if (!result.success) allSuccess = false;
                    }
                    bridgeStatus = allSuccess ? 'bridged' : 'pending';
                }
            }
            if (customerId && customerEmail && userId) {
                await sql`INSERT INTO bridge_customers (stripe_customer_id, creator_id, email, bridge_status) VALUES (${customerId}, ${userId}, ${customerEmail}, ${bridgeStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status, creator_id = EXCLUDED.creator_id`;
            }
        } 
        else if (['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.EXPIRED'].includes(event.event_type)) {
            const sub = event.resource;
            const customerId = sub.id;
            const planId = sub.plan_id;
            if (customerId && planId) {
                const customerRows = await sql`SELECT email FROM bridge_customers WHERE stripe_customer_id = ${customerId}`;
                if (customerRows.length > 0) {
                    const customerEmail = customerRows[0].email;
                    const mapRows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${planId} AND provider = 'paypal'`;
                    if (mapRows.length > 0) {
                        const userId = mapRows[0].user_id;
                        const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                        const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                        
                        for (const r of mapRows) {
                            await revokeCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        }
                        await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                    }
                }
            }
        }
    } catch (error) {}
    res.json({ received: true });
});

export default router;