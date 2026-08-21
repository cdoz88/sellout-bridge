import express from 'express';
import Stripe from 'stripe'; 
import crypto from 'crypto'; 
import { sql, getAuthenticatedUser, ensureSchema, ensureExpansionsSubscription, grantCommunityAccess, revokeCommunityAccess, UNA_BASE_URL, UNA_SECRET } from '../config.js';

const router = express.Router();
const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];

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

// --- AUTO-JOIN ROUTES ---
router.get('/api/admin/auto-joins', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`CREATE TABLE IF NOT EXISTS bridge_auto_joins (
            id SERIAL PRIMARY KEY,
            target_url TEXT NOT NULL,
            target_roles TEXT NOT NULL
        )`;
        const rules = await sql`SELECT * FROM bridge_auto_joins ORDER BY id DESC`;
        res.json({ rules });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/api/admin/auto-joins', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        const { target_url, roles } = req.body;
        await sql`CREATE TABLE IF NOT EXISTS bridge_auto_joins (
            id SERIAL PRIMARY KEY,
            target_url TEXT NOT NULL,
            target_roles TEXT NOT NULL
        )`;
        await sql`INSERT INTO bridge_auto_joins (target_url, target_roles) VALUES (${target_url}, ${JSON.stringify(roles)})`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/api/admin/auto-joins/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`DELETE FROM bridge_auto_joins WHERE id = ${req.body.id}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// TEST SIMULATOR ENDPOINT (UPGRADE)
router.post('/api/admin/auto-joins/simulate', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        const { email, roleId } = req.body;
        if (!email || !roleId) return res.status(400).json({ error: "Missing email or role for simulation." });

        // 1. UPGRADE THE USER'S ROLE IN UNA FIRST (Reuses the generic assign endpoint)
        const upgradeRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
            body: JSON.stringify({ 
                email: email.trim().toLowerCase(), 
                action: 'assign_teammate', 
                level_id: Number(roleId) 
            })
        });
        const upgradeData = await upgradeRes.json();
        
        if (!upgradeData.success) {
            return res.status(400).json({ error: `UNA Bridge Error (Role Upgrade): ${upgradeData.error || 'Failed to connect.'}` });
        }

        // 2. RUN THE AUTO-JOIN ROUTING RULES
        const rules = await sql`SELECT * FROM bridge_auto_joins`;
        if (!rules || rules.length === 0) return res.json({ success: true, message: `User upgraded to role ${roleId}, but no active rules found to trigger.` });

        let triggeredCount = 0;
        for (const rule of rules) {
            const targetRoles = JSON.parse(rule.target_roles || '[]');
            
            if (targetRoles.includes(Number(roleId))) {
                const urlObj = new URL(rule.target_url);
                const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
                const moduleType = pathParts[0] === 'crowd' ? 'bx_spaces' : 'bx_groups';
                const slug = pathParts[pathParts.length - 1];

                const result = await grantCommunityAccess(email.trim().toLowerCase(), moduleType, slug);
                if (result.success) {
                    triggeredCount++;
                } else {
                    return res.status(400).json({ error: `UNA Bridge Error (Community Join): ${result.error || 'Failed to connect.'}` });
                }
            }
        }

        if (triggeredCount === 0) {
            return res.json({ success: true, message: `User upgraded successfully, but no auto-join rules matched this specific role.` });
        }

        res.json({ success: true, message: `Success! User upgraded and ${triggeredCount} auto-join rule(s) executed for ${email}!` });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// TEST SIMULATOR ENDPOINT (DOWNGRADE)
router.post('/api/admin/auto-joins/simulate-downgrade', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Missing email for simulation." });

        // 1. DOWNGRADE THE USER'S ROLE IN UNA FIRST
        const downgradeRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
            body: JSON.stringify({ 
                email: email.trim().toLowerCase(), 
                action: 'revoke_teammate' 
            })
        });
        const downgradeData = await downgradeRes.json();
        
        if (!downgradeData.success) {
            return res.status(400).json({ error: `UNA Bridge Error (Role Downgrade): ${downgradeData.error || 'Failed to connect.'}` });
        }

        // 2. RUN THE AUTO-JOIN REVOCATION RULES
        await revokeAutoJoinsForUser(email);

        res.json({ success: true, message: `Success! User downgraded to Fan and removed from associated auto-join communities!` });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// --- EXISTING BRIDGE ROUTES ---
router.get('/api/get-aliases', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        const rows = await sql`SELECT * FROM bridge_email_aliases WHERE user_id = ${user.id} ORDER BY id DESC`;
        res.json({ aliases: rows });
    } catch (error) { res.status(500).json({ error: "Failed to fetch aliases" }); }
});

router.post('/api/add-alias', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { originalEmail, aliasEmail } = req.body;
        if (!originalEmail || !aliasEmail) return res.status(400).json({ error: "Missing fields" });
        
        await ensureSchema();
        await sql`INSERT INTO bridge_email_aliases (user_id, original_email, alias_email) VALUES (${user.id}, ${originalEmail.trim().toLowerCase()}, ${aliasEmail.trim().toLowerCase()}) ON CONFLICT (user_id, original_email) DO UPDATE SET alias_email = EXCLUDED.alias_email`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to add alias" }); }
});

router.post('/api/remove-alias', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await sql`DELETE FROM bridge_email_aliases WHERE id = ${req.body.id} AND user_id = ${user.id}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to remove alias" }); }
});

router.get('/api/get-manual-users', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        const rows = await sql`SELECT * FROM bridge_manual_users WHERE user_id = ${user.id} AND is_free_teammate = FALSE ORDER BY id DESC`;
        
        const grouped = {};
        rows.forEach(row => {
            if (!grouped[row.email]) grouped[row.email] = { email: row.email, status: row.status, communities: [] };
            grouped[row.email].communities.push({ id: row.id, module: row.una_module, contentId: row.una_content_id });
        });
        res.json({ users: Object.values(grouped) });
    } catch (error) { res.status(500).json({ error: "Failed to fetch manual users" }); }
});

router.post('/api/add-manual-user', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { email, communities } = req.body;
        if (!email || !communities || communities.length === 0) return res.status(400).json({ error: "Missing info" });
        
        await ensureSchema();
        try { await ensureExpansionsSubscription(user); } catch (e) { return res.status(400).json({ error: "Failed billing." }); }

        const cleanEmail = email.trim().toLowerCase();
        let allSuccess = true;
        let lastError = "";

        for (const comm of communities) {
            const lastUnderscore = comm.lastIndexOf('_');
            const module = comm.substring(0, lastUnderscore);
            const id = comm.substring(lastUnderscore + 1);

            const result = await grantCommunityAccess(cleanEmail, module, id);
            const newStatus = result.success ? 'bridged' : 'pending';
            if (!result.success) { allSuccess = false; lastError = result.error; }

            await sql`INSERT INTO bridge_manual_users (user_id, email, una_module, una_content_id, status, is_free_teammate) VALUES (${user.id}, ${cleanEmail}, ${module}, ${id}, ${newStatus}, FALSE) ON CONFLICT (user_id, email, una_module, una_content_id) DO UPDATE SET status = EXCLUDED.status, is_free_teammate = FALSE`;
        }
        res.json({ success: true, notice: !allSuccess ? lastError : null });
    } catch (error) { res.status(500).json({ error: "Failed to add manual user" }); }
});

router.post('/api/remove-manual-user', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { id, email, unaModule, unaId } = req.body;
        await ensureSchema();
        await revokeCommunityAccess(email, unaModule, unaId);
        await sql`DELETE FROM bridge_manual_users WHERE id = ${id} AND user_id = ${user.id}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/get-settings', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        const rows = await sql`SELECT stripe_account_id, paypal_client_id, platform_customer_id FROM bridge_settings WHERE user_id = ${user.id}`;
        res.json({ settings: { stripe_account_id: rows[0]?.stripe_account_id, paypal_client_id: rows[0]?.paypal_client_id, paypal_is_connected: !!rows[0]?.paypal_client_id, platform_customer_id: rows[0]?.platform_customer_id } });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/get-mappings', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const rows = await sql`SELECT * FROM bridge_mappings WHERE user_id = ${user.id}`;
        
        const grouped = {};
        rows.forEach(row => {
            const key = `${row.provider}_${row.stripe_product_id}`;
            if (!grouped[key]) grouped[key] = { id: row.id, provider: row.provider, productId: row.stripe_product_id, communities: [] };
            grouped[key].communities.push(`${row.una_module}_${row.una_content_id}`);
        });
        res.json({ mappings: Object.values(grouped) });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/save-mappings', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { mappings } = req.body;
        await sql`DELETE FROM bridge_mappings WHERE user_id = ${user.id}`;
        
        try { await ensureExpansionsSubscription(user); } catch (e) { return res.status(400).json({ error: "Failed billing init" }); }
        
        if (mappings && mappings.length > 0) {
            for (const map of mappings) {
                if (map.productId && map.communities && map.communities.length > 0) {
                    for (const comm of map.communities) {
                        const lastUnderscore = comm.lastIndexOf('_');
                        const module = comm.substring(0, lastUnderscore);
                        const contentId = parseInt(comm.substring(lastUnderscore + 1));
                        await sql`INSERT INTO bridge_mappings (user_id, creator_id, provider, stripe_product_id, una_module, una_content_id) VALUES (${user.id}, ${user.id}, ${map.provider || 'stripe'}, ${map.productId}, ${module}, ${contentId})`;
                    }
                }
            }
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/stripe/oauth/callback', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Missing authorization code" });
        if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Platform Stripe Secret Key missing" });

        const response = await fetch('https://connect.stripe.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'authorization_code', code: code, client_secret: process.env.STRIPE_SECRET_KEY })
        });
        
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error_description || data.error });
        
        await ensureSchema();
        await sql`INSERT INTO bridge_settings (user_id, stripe_account_id) VALUES (${user.id}, ${data.stripe_user_id}) ON CONFLICT (user_id) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id`;
        res.json({ success: true, accountId: data.stripe_user_id });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/stripe/oauth/disconnect', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        await sql`UPDATE bridge_settings SET stripe_account_id = NULL WHERE user_id = ${user.id}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/get-stripe-products', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if (!req.body.accountId) return res.status(400).json({ error: "No account ID" });
        if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing key" });

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const products = await stripe.products.list({ limit: 100, active: true }, { stripeAccount: req.body.accountId });
        res.json({ products: products.data.map(p => ({ id: p.id, name: p.name })) });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

router.post('/api/save-paypal-keys', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { clientId, secretKey } = req.body;
        if (!clientId || !secretKey) return res.status(400).json({ error: "Missing Keys" });

        const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials`
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error("Invalid Credentials.");

        await ensureSchema();
        await sql`INSERT INTO bridge_settings (user_id, paypal_client_id, paypal_secret_key) VALUES (${user.id}, ${clientId}, ${secretKey}) ON CONFLICT (user_id) DO UPDATE SET paypal_client_id = EXCLUDED.paypal_client_id, paypal_secret_key = EXCLUDED.paypal_secret_key`;
        res.json({ success: true, accountId: clientId });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/api/paypal/oauth/disconnect', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await sql`UPDATE bridge_settings SET paypal_client_id = NULL, paypal_secret_key = NULL WHERE user_id = ${user.id}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/get-paypal-products', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const settings = await sql`SELECT paypal_client_id, paypal_secret_key FROM bridge_settings WHERE user_id = ${user.id}`;
        if (!settings.length || !settings[0].paypal_client_id) return res.status(400).json({ error: "Keys not found." });

        const auth = Buffer.from(`${settings[0].paypal_client_id}:${settings[0].paypal_secret_key}`).toString('base64');
        const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=client_credentials`
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error("Failed auth");

        const plansRes = await fetch('https://api-m.paypal.com/v1/billing/plans?page_size=50', { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } });
        const plansData = await plansRes.json();

        res.json({ products: plansData.plans ? plansData.plans.map(p => ({ id: p.id, name: p.name })) : [] });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

router.post('/api/patreon-import', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { users, mappings } = req.body; 
        
        try { await ensureExpansionsSubscription(user); } catch(e) {}

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const mappingsMap = {};
        mappings.forEach(m => { mappingsMap[m.productId] = m.communities || []; });
        
        const existingDb = await sql`SELECT email, tier, status FROM bridge_patreon_users`;
        const incomingMap = {};
        users.forEach(u => { if (mappingsMap[u.tier]) incomingMap[u.email] = u.tier; });

        let importCount = 0; let revokeCount = 0;
        for (const dbUser of existingDb) {
            if (dbUser.status === 'bridged' && !incomingMap[dbUser.email]) {
                const oldMappingComms = mappingsMap[dbUser.tier];
                if (oldMappingComms && oldMappingComms.length > 0) {
                    for (const comm of oldMappingComms) {
                        const lastUnderscore = comm.lastIndexOf('_');
                        await revokeCommunityAccess(aliasesMap[dbUser.email] || dbUser.email, comm.substring(0, lastUnderscore), comm.substring(lastUnderscore + 1));
                    }
                }
                await sql`UPDATE bridge_patreon_users SET status = 'revoked' WHERE email = ${dbUser.email}`;
                revokeCount++;
            }
        }
        for (const [email, tier] of Object.entries(incomingMap)) {
            const comms = mappingsMap[tier];
            let allSuccess = true;
            if (comms && comms.length > 0) {
                for (const comm of comms) {
                    const lastUnderscore = comm.lastIndexOf('_');
                    const result = await grantCommunityAccess(aliasesMap[email] || email, comm.substring(0, lastUnderscore), comm.substring(lastUnderscore + 1));
                    if (!result.success) allSuccess = false;
                }
            }
            await sql`INSERT INTO bridge_patreon_users (email, creator_id, tier, status) VALUES (${email}, ${user.id}, ${tier}, ${allSuccess ? 'bridged' : 'pending'}) ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status, creator_id = EXCLUDED.creator_id`;
            if (allSuccess) importCount++;
        }
        res.json({ success: true, added: importCount, revoked: revokeCount });
    } catch (error) { res.status(500).json({ error: "Failed to process Patreon import." }); }
});

router.post('/api/paypal-import', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { users, mappings } = req.body; 
        
        try { await ensureExpansionsSubscription(user); } catch(e) {}

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const mappingsMap = {};
        mappings.forEach(m => { mappingsMap[m.productId] = m.communities || []; });
        
        let importCount = 0; 
        for (const u of users) {
            const comms = mappingsMap[u.plan];
            if (comms && comms.length > 0) {
                let allSuccess = true;
                for (const comm of comms) {
                    const lastUnderscore = comm.lastIndexOf('_');
                    const result = await grantCommunityAccess(aliasesMap[u.email] || u.email, comm.substring(0, lastUnderscore), comm.substring(lastUnderscore + 1));
                    if (!result.success) allSuccess = false;
                }
                const dummyStripeId = `pp_csv_${crypto.randomBytes(8).toString('hex')}`;
                await sql`INSERT INTO bridge_customers (stripe_customer_id, creator_id, email, bridge_status) VALUES (${dummyStripeId}, ${user.id}, ${u.email}, ${allSuccess ? 'bridged' : 'pending'}) ON CONFLICT (stripe_customer_id) DO NOTHING`;
                if (allSuccess) importCount++;
            }
        }
        res.json({ success: true, added: importCount });
    } catch (error) { res.status(500).json({ error: "Failed to process PayPal import." }); }
});

router.get('/api/get-subscribers', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if (!process.env.STRIPE_SECRET_KEY) return res.json({ stats: [] });

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const settingsRows = await sql`SELECT stripe_account_id FROM bridge_settings WHERE user_id = ${user.id}`;
        if (settingsRows.length === 0 || !settingsRows[0].stripe_account_id) return res.json({ stats: [] });
        
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const mappingRows = await sql`SELECT stripe_product_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
        const mappedProductIds = new Set(mappingRows.map(r => r.stripe_product_id));
        
        const products = await stripe.products.list({ active: true, limit: 100 }, { stripeAccount: settingsRows[0].stripe_account_id });
        const productMap = {};
        products.data.forEach(p => productMap[p.id] = p.name);
        
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers WHERE creator_id = ${user.id}`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status || 'pending');

        const stats = {};
        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: settingsRows[0].stripe_account_id })) {
            const productId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            if (!productId) continue;
            if (!stats[productId]) {
                stats[productId] = { productId, productName: productMap[productId] || 'Unknown Product', isMapped: mappedProductIds.has(productId), totalCount: 0, bridgedCount: 0, users: [] };
            }
            stats[productId].totalCount++;
            
            const email = sub.customer?.email || 'No email';
            const displayEmail = aliasesMap[email] ? `${email} ➔ ${aliasesMap[email]}` : email;
            let displayStatus = 'Stripe Only'; let isRevoked = false; let isBridged = false;

            if (mappedProductIds.has(productId)) {
                if (statusMap[email] === 'revoked') { displayStatus = 'Access Revoked'; isRevoked = true; } 
                else if (statusMap[email] === 'bridged') { displayStatus = 'Active'; isBridged = true; stats[productId].bridgedCount++; } 
                else displayStatus = 'Inactive';
            }
            stats[productId].users.push({ name: sub.customer?.name || 'Customer', email, displayEmail, status: displayStatus, isRevoked, isBridged });
        }
        res.json({ stats: Object.values(stats) });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/sync-subscribers', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        try { await ensureExpansionsSubscription(user); } catch(e) {}
        if (req.body.provider === 'paypal') return res.status(400).json({ error: "PayPal does not support automatic bulk syncing." });
        if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Platform Stripe key not configured." });

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const settingsRows = await sql`SELECT stripe_account_id FROM bridge_settings WHERE user_id = ${user.id}`;
        if (!settingsRows.length || !settingsRows[0].stripe_account_id) return res.status(400).json({ error: "Stripe account not connected." });
        
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const mappingRows = await sql`SELECT stripe_product_id, una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
        const mappingsMap = {};
        mappingRows.forEach(row => {
            if (!mappingsMap[row.stripe_product_id]) mappingsMap[row.stripe_product_id] = [];
            mappingsMap[row.stripe_product_id].push({ module: row.una_module, id: row.una_content_id });
        });
        
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers WHERE creator_id = ${user.id}`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

        let syncCount = 0;
        let debugLogs = [];

        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: settingsRows[0].stripe_account_id })) {
            const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            const customerEmail = sub.customer?.email;
            const comms = mappingsMap[stripeProductId];
            
            if (stripeProductId && customerEmail && comms && comms.length > 0) {
                if (statusMap[customerEmail] === 'revoked') continue;
                
                let allSuccess = true;
                let failReasons = [];
                for (const c of comms) {
                    const result = await grantCommunityAccess(aliasesMap[customerEmail] || customerEmail, c.module, c.id);
                    if (!result.success) { allSuccess = false; failReasons.push(result.error); }
                }
                
                if (!allSuccess) debugLogs.push(`Failed to sync ${customerEmail}: ${failReasons.join(' | ')}`);
                await sql`INSERT INTO bridge_customers (stripe_customer_id, creator_id, email, bridge_status) VALUES (${sub.customer.id}, ${user.id}, ${customerEmail}, ${allSuccess ? 'bridged' : 'pending'}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status, creator_id = EXCLUDED.creator_id`;
                if (allSuccess) syncCount++;
            }
        }
        res.json({ success: true, count: syncCount, debug: debugLogs });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/toggle-user-access', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { email, productId, action } = req.body; 
        
        const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${user.id} AND original_email = ${email}`;
        const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : email;

        const mappingRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND stripe_product_id = ${productId}`;
        
        let allSuccess = true;
        for (const row of mappingRows) {
            if (action === 'revoke') {
                await revokeCommunityAccess(targetEmail, row.una_module, row.una_content_id);
            } else {
                const result = await grantCommunityAccess(targetEmail, row.una_module, row.una_content_id);
                if (!result.success) allSuccess = false;
            }
        }
        await sql`UPDATE bridge_customers SET bridge_status = ${action === 'revoke' ? 'revoked' : (allSuccess ? 'bridged' : 'pending')} WHERE email = ${email}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to toggle access." }); }
});

router.get('/api/affiliates/stats', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const settings = await sql`SELECT creator_email FROM bridge_settings WHERE user_id = ${user.id}`;
        const creatorEmail = settings.length > 0 ? settings[0].creator_email : user.email;

        const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
            body: JSON.stringify({ action: 'get_affiliate_stats', email: creatorEmail })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (e) { 
        res.status(500).json({ error: "Failed to fetch affiliate stats" }); 
    }
});

export default router;