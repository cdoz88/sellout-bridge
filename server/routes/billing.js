import express from 'express';
import Stripe from 'stripe'; 
import { sql, getAuthenticatedUser, ensureSchema, grantCommunityAccess, revokeCommunityAccess, UNA_BASE_URL, UNA_SECRET } from '../config.js';

const router = express.Router();

// --- HELPER FUNCTION: EXECUTE AUTO-JOIN RULES ON ROLE CHANGE ---
const triggerAutoJoinsForUser = async (userEmail, userRoleId) => {
    try {
        if (!userEmail || !userRoleId) return;
        
        const rules = await sql`SELECT * FROM bridge_auto_joins`;
        if (!rules || rules.length === 0) return;

        for (const rule of rules) {
            const targetRoles = JSON.parse(rule.target_roles || '[]');
            
            if (targetRoles.includes(Number(userRoleId))) {
                const urlObj = new URL(rule.target_url);
                const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
                const moduleType = pathParts[0] === 'crowd' ? 'bx_spaces' : 'bx_groups';
                const slug = pathParts[pathParts.length - 1];

                const result = await grantCommunityAccess(userEmail.trim().toLowerCase(), moduleType, slug);
                if (!result.success) {
                    console.error(`Auto-Join Execution Failed for ${userEmail}:`, result.error);
                }
            }
        }
    } catch (error) {
        console.error("Auto-Join Execution Error:", error);
    }
};

// --- HELPER FUNCTION: REVOKE AUTO-JOIN RULES ON DOWNGRADE ---
const revokeAutoJoinsForUser = async (userEmail) => {
    try {
        if (!userEmail) return;
        
        const rules = await sql`SELECT * FROM bridge_auto_joins`;
        if (!rules || rules.length === 0) return;

        for (const rule of rules) {
            const urlObj = new URL(rule.target_url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            const moduleType = pathParts[0] === 'crowd' ? 'bx_spaces' : 'bx_groups';
            const slug = pathParts[pathParts.length - 1];

            const result = await revokeCommunityAccess(userEmail.trim().toLowerCase(), moduleType, slug);
            if (!result.success) {
                console.error(`Auto-Join Revocation Failed for ${userEmail}:`, result.error);
            }
        }
    } catch (error) {
        console.error("Auto-Join Revocation Error:", error);
    }
};

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

router.get('/api/cron/issue-credits', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized. Invalid CRON_SECRET.' });
        }

        if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe Key Missing");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await ensureSchema();
        
        const settings = await sql`SELECT user_id, creator_email, platform_customer_id, lifetime_credited FROM bridge_settings WHERE platform_customer_id IS NOT NULL`;
        
        let creditsIssued = 0;
        let totalValueIssued = 0;
        let logs = [];

        for (const s of settings) {
            if (!s.creator_email) continue;

            try {
                let totalEarned = 0;

                // 1. Get Owner's direct stats
                const ownerRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                    body: JSON.stringify({ action: 'get_affiliate_stats', email: s.creator_email })
                });
                const ownerData = await ownerRes.json();
                if (ownerData && ownerData.success && ownerData.stats) {
                    totalEarned += parseFloat(ownerData.stats.commission || 0);
                }

                // 2. Get Teammate Auto-Pool Stats (Removed the crashing status check)
                const teammates = await sql`SELECT teammate_email FROM bridge_team_seats WHERE owner_id = ${s.user_id}`;
                for (const tm of teammates) {
                    if(!tm.teammate_email) continue;
                    try {
                        const tmRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                            body: JSON.stringify({ action: 'get_affiliate_stats', email: tm.teammate_email })
                        });
                        const tmData = await tmRes.json();
                        if (tmData && tmData.success && tmData.stats) {
                            totalEarned += parseFloat(tmData.stats.commission || 0);
                        }
                    } catch (e) {
                        logs.push(`Failed teammate fetch for ${tm.teammate_email}`);
                    }
                }

                // 3. Calculate and Issue
                const lifetimeCredited = parseFloat(s.lifetime_credited || 0);
                const newCreditOwed = totalEarned - lifetimeCredited;

                if (newCreditOwed >= 0.01) {
                    const amountInCents = Math.round(newCreditOwed * 100);
                    await stripe.customers.createBalanceTransaction(
                        s.platform_customer_id,
                        {
                            amount: -amountInCents,
                            currency: 'usd',
                            description: `Scouting Revenue Credit (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`
                        }
                    );
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

// --- UPDATED STATS ROUTE WITH BULLETPROOF LINK MAPPING ---
router.get('/api/affiliates/stats', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();

        const myEmail = user.email.trim().toLowerCase();
        const roleId = Number(user.role);
        const isTeammate = roleId === 18;

        // Find the owner of the team
        let workspaceId = user.id;
        if (isTeammate) {
            const seatRows = await sql`SELECT owner_id FROM bridge_team_seats WHERE teammate_email = ${myEmail}`;
            if (seatRows.length > 0) workspaceId = seatRows[0].owner_id;
        }

        // Get the Boss's email
        let creatorEmail = myEmail;
        const settings = await sql`SELECT creator_email FROM bridge_settings WHERE user_id = ${workspaceId}`;
        if (settings.length > 0 && settings[0].creator_email) {
            creatorEmail = settings[0].creator_email.trim().toLowerCase();
        }

        // Gather Team Roster
        let emailsToFetch = [myEmail];
        let teamEmails = [];

        // If it's the Boss viewing the page, pull ALL teammates explicitly from the database
        if (!isTeammate) {
            if (creatorEmail !== myEmail) emailsToFetch.push(creatorEmail);
            
            // Extract teammates
            const teamRows = await sql`SELECT teammate_email FROM bridge_team_seats WHERE owner_id = ${workspaceId}`;
            teamRows.forEach(r => {
                if (r.teammate_email) {
                    const clean = r.teammate_email.toLowerCase().trim();
                    emailsToFetch.push(clean);
                    teamEmails.push(clean);
                }
            });
        }

        const uniqueEmails = [...new Set(emailsToFetch)].filter(Boolean);

        // BULLETPROOF CUSTOM LINK MAPPING (Handles both old email schema and new user_id schema)
        const slugs = await sql`SELECT * FROM bridge_scout_links`;
        const usersDb = await sql`SELECT id, email FROM users`;
        const userMap = {};
        usersDb.forEach(u => userMap[u.id] = u.email.toLowerCase().trim());

        const slugMap = {};
        slugs.forEach(s => {
            // Map by direct email if it exists
            if (s.email) slugMap[s.email.toLowerCase().trim()] = s.custom_slug;
            // Map by user_id -> email if the newer schema is used
            if (s.user_id && userMap[s.user_id]) slugMap[userMap[s.user_id]] = s.custom_slug;
        });

        // Fetch rich profiles from UNA (Avatars & Names)
        let profiles = {};
        try {
            const profileRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                body: JSON.stringify({ action: 'get_profiles', emails: uniqueEmails })
            });
            const profileData = await profileRes.json();
            if (profileData.success && profileData.profiles) {
                profiles = profileData.profiles;
            }
        } catch(e) { console.error(e); }

        let combinedStats = { clicks: 0, joins: 0, commission: 0 };
        let combinedReferrals = [];
        let teamBreakdown = [];
        let myLink = '';

        for (const targetEmail of uniqueEmails) {
            let activeLink = '';
            let tJoins = 0;
            let tCommission = 0;
            const customSlug = slugMap[targetEmail];
            const tProf = profiles[targetEmail] || {};

            try {
                const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                    body: JSON.stringify({ action: 'get_affiliate_stats', email: targetEmail })
                });
                const data = await response.json();
                
                // Smart Link Fallback
                try {
                    if (customSlug) {
                        activeLink = `https://scout.selloutcrowds.com/${customSlug}`;
                    } else if (data.success && data.link) {
                        const urlParts = data.link.split('/');
                        activeLink = `https://scout.selloutcrowds.com/${urlParts[urlParts.length - 1]}`;
                    } else if (tProf.url) {
                        const urlParts = tProf.url.split('/');
                        activeLink = `https://scout.selloutcrowds.com/${urlParts[urlParts.length - 1]}`;
                    }
                } catch (err) {}

                if (targetEmail === myEmail) {
                    myLink = activeLink || myLink;
                }

                if (data.success && data.stats) {
                    if (isTeammate) {
                        if (targetEmail === myEmail) {
                            combinedStats = data.stats;
                            combinedReferrals = data.referrals || [];
                        }
                    } else {
                        combinedStats.joins += (data.stats.joins || 0);
                        combinedStats.commission += parseFloat(data.stats.commission || 0);
                        
                        const taggedRefs = (data.referrals || []).map(r => ({
                            ...r,
                            recruited_by: (targetEmail === creatorEmail || targetEmail === myEmail) ? 'You' : targetEmail
                        }));
                        combinedReferrals = [...combinedReferrals, ...taggedRefs];

                        tJoins = data.stats.joins || 0;
                        tCommission = data.stats.commission || 0;
                    }
                }
            } catch (err) {}

            // PUSH TO LEADERBOARD
            if (!isTeammate && teamEmails.includes(targetEmail)) {
                teamBreakdown.push({
                    email: targetEmail,
                    name: tProf.name || targetEmail,
                    avatar: tProf.avatar || null,
                    link: activeLink,
                    joins: tJoins,
                    commission: tCommission
                });
            }
        }

        combinedStats.commission = combinedStats.commission.toFixed(2);
        combinedReferrals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        res.json({
            success: true,
            stats: combinedStats,
            link: myLink,
            referrals: combinedReferrals,
            teamBreakdown: isTeammate ? [] : teamBreakdown
        });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to fetch affiliate stats" }); 
    }
});

// --- Custom Scout Link APIs ---

router.post('/api/scout/custom-link', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const { customSlug, unaUsername } = req.body;
        if (!customSlug || !unaUsername) return res.status(400).json({ error: "Missing parameters" });
        
        const cleanSlug = customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
        const existing = await sql`SELECT user_id FROM bridge_scout_links WHERE custom_slug = ${cleanSlug} AND user_id != ${user.id}`;
        if (existing.length > 0) {
            return res.status(400).json({ error: "That custom link is already taken!" });
        }
        
        await sql`INSERT INTO bridge_scout_links (user_id, custom_slug, una_username) VALUES (${user.id}, ${cleanSlug}, ${unaUsername}) ON CONFLICT (user_id) DO UPDATE SET custom_slug = EXCLUDED.custom_slug, una_username = EXCLUDED.una_username`;
        res.json({ success: true, slug: cleanSlug });
    } catch (error) {
        res.status(500).json({ error: "Failed to save custom link" });
    }
});

router.post('/api/scout/custom-link/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        await sql`DELETE FROM bridge_scout_links WHERE user_id = ${user.id}`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to reset custom link" });
    }
});

router.get('/api/scout/custom-link', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const rows = await sql`SELECT custom_slug FROM bridge_scout_links WHERE user_id = ${user.id}`;
        if (rows.length > 0) {
            res.json({ success: true, slug: rows[0].custom_slug });
        } else {
            res.json({ success: true, slug: null });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch custom link" });
    }
});

router.get('/api/resolve-scout/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const { slug } = req.params;
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const rows = await sql`SELECT una_username FROM bridge_scout_links WHERE custom_slug = ${cleanSlug}`;
        
        if (rows.length > 0) {
            res.json({ success: true, username: rows[0].una_username });
        } else {
            res.json({ success: false, error: "Not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to resolve link" });
    }
});

// -----------------------------------

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

            // TRIGGER AUTO-JOIN CHECK FOR THE CREATOR
            if (customerEmail) {
                const userRows = await sql`SELECT role FROM users WHERE email = ${customerEmail}`;
                if (userRows.length > 0) {
                    await triggerAutoJoinsForUser(customerEmail, userRows[0].role);
                }
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

                    // DOWNGRADE ACL ROLE AND REVOKE AUTO-JOINS
                    try {
                        await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                            body: JSON.stringify({ email: customerEmail, action: 'revoke_teammate' }) 
                        });
                        await revokeAutoJoinsForUser(customerEmail);
                    } catch (e) { console.error("Failed to downgrade user:", e); }
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

                                 // DOWNGRADE ACL ROLE AND REVOKE AUTO-JOINS
                                 try {
                                     await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                                         body: JSON.stringify({ email: customerEmail, action: 'revoke_teammate' }) 
                                     });
                                     await revokeAutoJoinsForUser(customerEmail);
                                 } catch (e) { console.error("Failed to downgrade user:", e); }
                             } else if (status === 'active') {
                                 let allSuccess = true;
                                 for (const r of mapRows) {
                                     const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                                     if (!result.success) allSuccess = false;
                                 }
                                 const newStatus = allSuccess ? 'bridged' : 'pending';
                                 await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${customerEmail}`;

                                 // TRIGGER AUTO-JOIN CHECK FOR THE CREATOR
                                 const userRows = await sql`SELECT role FROM users WHERE email = ${customerEmail}`;
                                 if (userRows.length > 0) {
                                     await triggerAutoJoinsForUser(customerEmail, userRows[0].role);
                                 }
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

            // TRIGGER AUTO-JOIN CHECK FOR THE CREATOR
            if (customerEmail) {
                const userRows = await sql`SELECT role FROM users WHERE email = ${customerEmail}`;
                if (userRows.length > 0) {
                    await triggerAutoJoinsForUser(customerEmail, userRows[0].role);
                }
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

                    // DOWNGRADE ACL ROLE AND REVOKE AUTO-JOINS
                    try {
                        await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                            body: JSON.stringify({ email: customerEmail, action: 'revoke_teammate' }) 
                        });
                        await revokeAutoJoinsForUser(customerEmail);
                    } catch (e) { console.error("Failed to downgrade user:", e); }
                }
            }
        }
    } catch (error) {}
    res.json({ received: true });
});

export default router;