/**
 * api/index.js - THE BACKEND ENGINE
 * ADDED: Database columns for custom slugs and a public API endpoint for crowds.bio
 * ADDED: OAuth Provider capabilities and WordPress API Proxy
 */

import express from 'express';
import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe'; 
import crypto from 'crypto'; 

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

const FSAN_ENDPOINT = `${UNA_BASE_URL}/m/fsan/wordpress/get-fields`;
const FSAN_TOKEN = "j7PGMBb4nZylvLGVV0cgd7ZOvpCBJkDO"; 

const sql = neon(process.env.DATABASE_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// --- HELPER FUNCTIONS ---

async function ensureSchema() {
    try {
        await sql`ALTER TABLE bridge_customers ADD COLUMN IF NOT EXISTS bridge_status VARCHAR(50) DEFAULT 'pending'`;
        await sql`CREATE TABLE IF NOT EXISTS bridge_patreon_users (email VARCHAR(255) PRIMARY KEY, tier VARCHAR(255), status VARCHAR(50))`;
        await sql`CREATE TABLE IF NOT EXISTS bridge_business_cards (user_id INTEGER PRIMARY KEY, card_data JSONB)`;
        try { await sql`ALTER TABLE bridge_business_cards ADD COLUMN custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS wp_oauth_codes (
            code VARCHAR(255) PRIMARY KEY, 
            user_id INTEGER, 
            profile_link TEXT,
            redirect_uri TEXT, 
            expires_at TIMESTAMP
        )`;
        await sql`CREATE TABLE IF NOT EXISTS wp_access_tokens (
            token VARCHAR(255) PRIMARY KEY, 
            user_id INTEGER, 
            profile_link TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        
        try { await sql`ALTER TABLE wp_oauth_codes ADD COLUMN profile_link TEXT`; } catch(e){}
        try { await sql`ALTER TABLE wp_access_tokens ADD COLUMN profile_link TEXT`; } catch(e){}
    } catch (e) {
        console.error("Schema check notice:", e.message);
    }
}

async function getAuthenticatedUser(token) {
    if (!token) return null;
    try {
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        if (meData && meData.id) return meData;
        return null;
    } catch (e) { return null; }
}

async function grantCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, action: 'add' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}

async function revokeCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, action: 'remove' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}

// --- API ENDPOINTS ---

app.post('/api/auth/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', UNA_CLIENT_ID);
        params.append('client_secret', UNA_CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', redirect_uri); 
        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
        const data = await response.json();
        if (data.error) return res.status(400).json(data);
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Failed to exchange auth code" }); }
});

app.get('/api/get-user', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user });
});

app.get('/api/get-communities', async (req, res) => {
    const meData = await getAuthenticatedUser(req.headers.authorization);
    if (!meData || !meData.profile_link) return res.status(401).json({ error: "Invalid OAuth session" });
    try {
        let userProfileUrl = meData.profile_link;
        userProfileUrl = userProfileUrl.replace('https://studio.', 'https://www.');
        if (!userProfileUrl.includes('www.')) { userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com'); }
        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN); 
        formData.append('user', userProfileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');
        const fsanRes = await fetch(FSAN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        const text = await fsanRes.text();
        let parsedData = null;
        try { parsedData = JSON.parse(text); } catch (e) { return res.json({ crowds: [], spaces: [] }); }
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) return res.json({ crowds: [], spaces: [] });

        const crowds = []; const spaces = []; let currentCategory = null;
        parsedData.allow_view_to.values.forEach(item => {
            if (item.type === 'group_header') { if (item.value === 'CROWD') currentCategory = 'CROWD'; if (item.value === 'SPACE') currentCategory = 'SPACE';
            } else if (item.type === 'group_end') { currentCategory = null;
            } else if (item.key !== undefined && typeof item.key === 'number') {
                const trueId = Math.abs(item.key).toString();
                if (currentCategory === 'CROWD') crowds.push({ id: trueId, title: item.value });
                else if (currentCategory === 'SPACE') spaces.push({ id: trueId, title: item.value });
            }
        });
        res.json({ crowds, spaces });
    } catch (error) { res.status(500).json({ error: "Failed to fetch community assets" }); }
});

app.get('/api/get-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        const userId = parseInt(user.id);
        const rows = await sql`SELECT stripe_secret_key FROM bridge_settings WHERE user_id = ${userId}`;
        res.json({ settings: rows[0] || {} });
    } catch (error) { res.status(500).json({ error: "Failed to fetch settings." }); }
});

app.post('/api/save-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { stripeKey } = req.body;
    try {
        const userId = parseInt(user.id);
        const cleanKey = stripeKey ? stripeKey.trim() : '';
        await sql`INSERT INTO bridge_settings (user_id, stripe_secret_key) VALUES (${userId}, ${cleanKey}) ON CONFLICT (user_id) DO UPDATE SET stripe_secret_key = EXCLUDED.stripe_secret_key`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to save settings." }); }
});

app.get('/api/get-mappings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        const rows = await sql`SELECT * FROM bridge_mappings WHERE user_id = ${user.id}`;
        const mappedData = rows.map(row => ({ id: row.id, provider: row.provider, productId: row.stripe_product_id, unaModule: row.una_module, unaId: row.una_content_id.toString() }));
        res.json({ mappings: mappedData });
    } catch (error) { res.status(500).json({ error: "Failed to fetch mappings" }); }
});

app.post('/api/save-mappings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { mappings } = req.body;
    try {
        await sql`DELETE FROM bridge_mappings WHERE user_id = ${user.id}`;
        if (mappings && mappings.length > 0) {
            for (const map of mappings) {
                if (map.productId && map.unaModule && map.unaId) {
                    const provider = map.provider || 'stripe';
                    const contentId = parseInt(map.unaId);
                    await sql`INSERT INTO bridge_mappings (user_id, creator_id, provider, stripe_product_id, una_module, una_content_id) VALUES (${user.id}, ${user.id}, ${provider}, ${map.productId}, ${map.unaModule}, ${contentId})`;
                }
            }
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to save mappings" }); }
});

app.get('/api/get-card', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const userId = parseInt(user.id);
        const rows = await sql`SELECT card_data, custom_slug FROM bridge_business_cards WHERE user_id = ${userId}`;
        res.json({ card: rows.length > 0 ? rows[0].card_data : null, slug: rows.length > 0 ? rows[0].custom_slug : '' });
    } catch (error) { res.status(500).json({ error: "Failed to fetch card" }); }
});

app.post('/api/save-card', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const userId = parseInt(user.id);
        const cardData = req.body.card;
        const slug = req.body.slug ? req.body.slug.toLowerCase().trim() : null;

        if (slug) {
            const check = await sql`SELECT user_id FROM bridge_business_cards WHERE custom_slug = ${slug} AND user_id != ${userId}`;
            if (check.length > 0) return res.status(400).json({ error: "That link is already taken! Please choose another." });
        }

        await sql`
            INSERT INTO bridge_business_cards (user_id, card_data, custom_slug) 
            VALUES (${userId}, ${cardData}, ${slug})
            ON CONFLICT (user_id) 
            DO UPDATE SET card_data = EXCLUDED.card_data, custom_slug = EXCLUDED.custom_slug
        `;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to save card" }); }
});

app.get('/api/public-card/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const slug = req.params.slug.toLowerCase().trim();
        const rows = await sql`SELECT card_data FROM bridge_business_cards WHERE custom_slug = ${slug}`;
        if (rows.length > 0) {
            res.json({ success: true, card: rows[0].card_data });
        } else {
            res.status(404).json({ error: "Card not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to load card" });
    }
});

app.post('/api/get-stripe-products', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "No API key provided" });
    try {
        const stripe = new Stripe(apiKey.trim());
        const products = await stripe.products.list({ limit: 100, active: true });
        res.json({ products: products.data.map(p => ({ id: p.id, name: p.name })) });
    } catch (error) { res.status(400).json({ error: `Stripe says: ${error.message}` }); }
});

app.post('/api/patreon-import', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { users, mappings } = req.body; 
    try {
        await ensureSchema();
        const mappingsMap = {};
        mappings.forEach(m => { mappingsMap[m.productId] = { module: m.unaModule, id: m.unaId }; });
        const existingDb = await sql`SELECT email, tier, status FROM bridge_patreon_users`;
        const incomingMap = {};
        users.forEach(u => { if (mappingsMap[u.tier]) incomingMap[u.email] = u.tier; });

        let importCount = 0; let revokeCount = 0;
        for (const dbUser of existingDb) {
            if (dbUser.status === 'bridged' && !incomingMap[dbUser.email]) {
                const oldMapping = mappingsMap[dbUser.tier];
                if (oldMapping) await revokeCommunityAccess(dbUser.email, oldMapping.module, oldMapping.id);
                await sql`UPDATE bridge_patreon_users SET status = 'revoked' WHERE email = ${dbUser.email}`;
                revokeCount++;
                await new Promise(resolve => setTimeout(resolve, 250)); 
            }
        }
        for (const [email, tier] of Object.entries(incomingMap)) {
            const { module, id } = mappingsMap[tier];
            const result = await grantCommunityAccess(email, module, id);
            const newStatus = result.success ? 'bridged' : 'pending';
            await sql`INSERT INTO bridge_patreon_users (email, tier, status) VALUES (${email}, ${tier}, ${newStatus}) ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status`;
            if (result.success) importCount++;
            await new Promise(resolve => setTimeout(resolve, 250)); 
        }
        res.json({ success: true, added: importCount, revoked: revokeCount });
    } catch (error) { res.status(500).json({ error: "Failed to process Patreon import." }); }
});

app.get('/api/get-subscribers', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const settingsRows = await sql`SELECT stripe_secret_key FROM bridge_settings WHERE user_id = ${user.id}`;
        if (settingsRows.length === 0 || !settingsRows[0].stripe_secret_key) return res.json({ stats: [] });
        const stripe = new Stripe(settingsRows[0].stripe_secret_key);
        const mappingRows = await sql`SELECT stripe_product_id FROM bridge_mappings WHERE user_id = ${user.id}`;
        const mappedProductIds = new Set(mappingRows.map(r => r.stripe_product_id));
        const products = await stripe.products.list({ active: true, limit: 100 });
        const productMap = {};
        products.data.forEach(p => productMap[p.id] = p.name);
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status || 'pending');

        const stats = {};
        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] })) {
            const productId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            if (!productId) continue;
            if (!stats[productId]) {
                stats[productId] = { productId: productId, productName: productMap[productId] || 'Unknown Product', isMapped: mappedProductIds.has(productId), totalCount: 0, bridgedCount: 0, users: [] };
            }
            stats[productId].totalCount++;
            const email = sub.customer?.email || 'No email';
            let displayStatus = 'Stripe Only'; let isRevoked = false; let isBridged = false;

            if (mappedProductIds.has(productId)) {
                const dbStatus = statusMap[email];
                if (dbStatus === 'revoked') { displayStatus = 'Access Revoked'; isRevoked = true; } 
                else if (dbStatus === 'bridged') { displayStatus = 'Active'; isBridged = true; stats[productId].bridgedCount++; } 
                else { displayStatus = 'Inactive'; }
            }
            stats[productId].users.push({ name: sub.customer?.name || 'Customer', email: email, status: displayStatus, isRevoked: isRevoked, isBridged: isBridged });
        }
        res.json({ stats: Object.values(stats) });
    } catch (error) { res.status(500).json({ error: "Failed to fetch subscriber stats." }); }
});

app.post('/api/sync-subscribers', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const settingsRows = await sql`SELECT stripe_secret_key FROM bridge_settings WHERE user_id = ${user.id}`;
        if (settingsRows.length === 0) return res.status(400).json({ error: "Stripe key not found." });
        const stripe = new Stripe(settingsRows[0].stripe_secret_key);
        const mappingRows = await sql`SELECT stripe_product_id, una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id}`;
        const mappingsMap = {};
        mappingRows.forEach(row => mappingsMap[row.stripe_product_id] = { module: row.una_module, id: row.una_content_id });
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

        let syncCount = 0;
        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] })) {
            const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            const customerEmail = sub.customer?.email;
            if (stripeProductId && customerEmail && mappingsMap[stripeProductId]) {
                if (statusMap[customerEmail] === 'revoked') continue;
                const { module, id } = mappingsMap[stripeProductId];
                const result = await grantCommunityAccess(customerEmail, module, id);
                const newStatus = result.success ? 'bridged' : 'pending';
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${sub.customer.id}, ${customerEmail}, ${newStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status`;
                if (result.success) syncCount++;
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        res.json({ success: true, count: syncCount });
    } catch (error) { res.status(500).json({ error: "Failed to sync subscribers." }); }
});

app.post('/api/toggle-user-access', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { email, productId, action } = req.body; 
    try {
        await ensureSchema();
        const mappingRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND stripe_product_id = ${productId}`;
        if (mappingRows.length === 0) return res.status(400).json({ error: "Mapping not found." });
        const { una_module, una_content_id } = mappingRows[0];
        if (action === 'revoke') {
            await revokeCommunityAccess(email, una_module, una_content_id);
            await sql`UPDATE bridge_customers SET bridge_status = 'revoked' WHERE email = ${email}`;
        } else {
            const result = await grantCommunityAccess(email, una_module, una_content_id);
            const newStatus = result.success ? 'bridged' : 'pending';
            await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${email}`;
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to toggle access." }); }
});

app.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;
    try {
        await ensureSchema();
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email;
            const customerId = session.customer; 
            const stripeProductId = session.metadata?.product_id;
            let bridgeStatus = 'pending';
            if (stripeProductId && customerEmail) {
                const rows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                if (rows.length > 0) {
                    const result = await grantCommunityAccess(customerEmail, rows[0].una_module, rows[0].una_content_id);
                    bridgeStatus = result.success ? 'bridged' : 'pending';
                }
            }
            if (customerId && customerEmail) {
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${customerId}, ${customerEmail}, ${bridgeStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status`;
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
                    const mapRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                    if (mapRows.length > 0) {
                        await revokeCommunityAccess(customerEmail, mapRows[0].una_module, mapRows[0].una_content_id);
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
                     const mapRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                     if (mapRows.length > 0) {
                         const currentStatus = customerRows[0].bridge_status;
                         if (currentStatus !== 'revoked') {
                             if (status === 'unpaid' || status === 'past_due' || status === 'canceled') {
                                 await revokeCommunityAccess(customerEmail, mapRows[0].una_module, mapRows[0].una_content_id);
                                 await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                             } else if (status === 'active') {
                                 const result = await grantCommunityAccess(customerEmail, mapRows[0].una_module, mapRows[0].una_content_id);
                                 const newStatus = result.success ? 'bridged' : 'pending';
                                 await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${customerEmail}`;
                             }
                         }
                     }
                 }
             }
        }
    } catch (error) { console.error('Webhook Error Processing:', error); }
    res.json({ received: true });
});

// ==========================================
// OAUTH PROVIDER ENDPOINTS
// ==========================================

app.post('/api/oauth/approve', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { client_id, redirect_uri } = req.body;
    
    if (client_id !== 'wordpress_global_app') {
        return res.status(400).json({ error: "Invalid client_id" });
    }

    try {
        await ensureSchema();
        
        let profileLink = user.url || user.link || user.profile_url || user.profile_link || '';
        
        const code = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); 

        await sql`
            INSERT INTO wp_oauth_codes (code, user_id, profile_link, redirect_uri, expires_at) 
            VALUES (${code}, ${user.id}, ${profileLink}, ${redirect_uri}, ${expiresAt})
        `;

        res.json({ success: true, code: code });
    } catch (error) {
        console.error("Failed to generate auth code:", error);
        res.status(500).json({ error: "Server error generating code" });
    }
});

app.post('/oauth/token', async (req, res) => {
    const { grant_type, client_id, code, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code' || client_id !== 'wordpress_global_app') {
        return res.status(400).json({ error: "invalid_request" });
    }

    try {
        await ensureSchema();

        const rows = await sql`SELECT user_id, profile_link, redirect_uri, expires_at FROM wp_oauth_codes WHERE code = ${code}`;
        
        if (rows.length === 0) {
            return res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired code" });
        }

        const authCode = rows[0];

        if (new Date() > new Date(authCode.expires_at) || authCode.redirect_uri !== redirect_uri) {
            await sql`DELETE FROM wp_oauth_codes WHERE code = ${code}`; 
            return res.status(400).json({ error: "invalid_grant", error_description: "Code expired or URI mismatch" });
        }

        await sql`DELETE FROM wp_oauth_codes WHERE code = ${code}`;

        const accessToken = 'sc_wp_' + crypto.randomBytes(24).toString('hex');

        await sql`
            INSERT INTO wp_access_tokens (token, user_id, profile_link) 
            VALUES (${accessToken}, ${authCode.user_id}, ${authCode.profile_link})
        `;

        res.json({
            access_token: accessToken,
            token_type: "bearer",
            profile_url: authCode.profile_link 
        });

    } catch (error) {
        console.error("Token exchange error:", error);
        res.status(500).json({ error: "server_error" });
    }
});

// ==========================================
// WORDPRESS API PROXY ENDPOINTS
// ==========================================

app.post('/api/wp/get-fields', async (req, res) => {
    const { access_token, user, domain } = req.body;
    
    if (!access_token) {
        return res.status(200).json({ error: "Missing access token" });
    }

    try {
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid or expired access token. Please reconnect in settings." });

        const targetUser = user || rows[0].profile_link || '';

        // Safe URLSearchParams that natively translates to PHP's $_POST
        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', targetUser);
        formData.append('domain', domain || 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, { 
            method: 'POST', 
            body: formData,
            headers: {
                'User-Agent': 'UNA',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const text = await fsanRes.text();

        try {
            const json = JSON.parse(text);
            json._debug_user = targetUser; 
            return res.json(json);
        } catch(e) {
            return res.status(200).json({ error: "UNA did not return valid JSON. Raw response: " + text.substring(0, 100) });
        }
    } catch (error) {
        console.error("WP Proxy get-fields error:", error);
        return res.status(200).json({ error: "Hub Server Error: " + error.message });
    }
});

app.post('/api/wp/:action', async (req, res) => {
    const { action } = req.params;
    const validActions = ['create-post', 'edit-post', 'delete-post'];
    if (!validActions.includes(action)) return res.status(400).json({ error: "Invalid proxy action" });

    const { access_token, user, domain, data } = req.body;
    
    if (!access_token) {
        return res.status(200).json({ error: "Missing access token" });
    }
    
    try {
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid access token" });

        const targetUser = user || rows[0].profile_link || '';

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', targetUser);
        formData.append('domain', domain || 'https://bridge.selloutcrowds.com');

        if (data && typeof data === 'object') {
            for (const key in data) {
                formData.append(`data[${key}]`, data[key]);
            }
        }

        // FIX: Ensure action proxy hits the correct studio URL, avoiding the fantasysportsadvice bug
        const endpoint = `${UNA_BASE_URL}/m/fsan/wordpress/${action}`;
        
        const fsanRes = await fetch(endpoint, { 
            method: 'POST', 
            body: formData,
            headers: {
                'User-Agent': 'UNA',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const text = await fsanRes.text();
        
        try {
            const json = JSON.parse(text);
            return res.json(json);
        } catch(e) {
            return res.status(200).json({ error: "UNA did not return JSON. Raw: " + text.substring(0, 100) });
        }
    } catch (error) {
        console.error(`WP Proxy ${action} error:`, error);
        return res.status(200).json({ error: "Hub Server Error: " + error.message });
    }
});

export default app;