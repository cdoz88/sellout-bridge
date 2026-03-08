/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Updated display statuses to "Active", "Inactive", and "Access Revoked"
 */

import express from 'express';
import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe'; 

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

const FSAN_ENDPOINT = `${UNA_BASE_URL}/m/fsan/wordpress/get-fields`;
const FSAN_TOKEN = "j7PGMBb4nZylvLGVV0cgd7ZOvpCBJkDO"; 

const sql = neon(process.env.DATABASE_URL);

app.use(express.json());

// --- HELPER FUNCTIONS ---

async function ensureSchema() {
    try {
        await sql`ALTER TABLE bridge_customers ADD COLUMN IF NOT EXISTS bridge_status VARCHAR(50) DEFAULT 'pending'`;
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
    } catch (e) {
        return null;
    }
}

async function grantCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${UNA_SECRET}`
            },
            body: JSON.stringify({ email: email, space_id: contentId, action: 'add' })
        });
        
        const responseText = await response.text();
        try {
            const data = JSON.parse(responseText);
            console.log(`[GRANT] ${email}:`, data);
            return data; 
        } catch (e) {
            return { error: responseText };
        }
    } catch (err) {
        return { error: err.message };
    }
}

async function revokeCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${UNA_SECRET}`
            },
            body: JSON.stringify({ email: email, space_id: contentId, action: 'remove' })
        });
        
        const responseText = await response.text();
        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { error: responseText };
        }
    } catch (err) {
        return { error: err.message };
    }
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

        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        if (data.error) return res.status(400).json(data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to exchange auth code" });
    }
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
        if (!userProfileUrl.includes('www.')) {
             userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com'); 
        }

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN); 
        formData.append('user', userProfileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const text = await fsanRes.text();
        let parsedData = null;
        try { parsedData = JSON.parse(text); } catch (e) { return res.json({ crowds: [], spaces: [] }); }
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) return res.json({ crowds: [], spaces: [] });

        const crowds = [];
        const spaces = [];
        let currentCategory = null;

        parsedData.allow_view_to.values.forEach(item => {
            if (item.type === 'group_header') {
                if (item.value === 'CROWD') currentCategory = 'CROWD';
                if (item.value === 'SPACE') currentCategory = 'SPACE';
            } else if (item.type === 'group_end') {
                currentCategory = null;
            } else if (item.key !== undefined && typeof item.key === 'number') {
                const trueId = Math.abs(item.key).toString();
                if (currentCategory === 'CROWD') crowds.push({ id: trueId, title: item.value });
                else if (currentCategory === 'SPACE') spaces.push({ id: trueId, title: item.value });
            }
        });

        res.json({ crowds, spaces });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch community assets" });
    }
});

app.get('/api/get-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
        const userId = parseInt(user.id);
        const rows = await sql`SELECT stripe_secret_key FROM bridge_settings WHERE user_id = ${userId}`;
        res.json({ settings: rows[0] || {} });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings from database." });
    }
});

app.post('/api/save-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { stripeKey } = req.body;
    try {
        const userId = parseInt(user.id);
        const cleanKey = stripeKey ? stripeKey.trim() : '';
        
        await sql`
            INSERT INTO bridge_settings (user_id, stripe_secret_key) 
            VALUES (${userId}, ${cleanKey})
            ON CONFLICT (user_id) 
            DO UPDATE SET stripe_secret_key = EXCLUDED.stripe_secret_key
        `;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save settings to Postgres database." });
    }
});

app.get('/api/get-mappings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
        const rows = await sql`SELECT * FROM bridge_mappings WHERE user_id = ${user.id}`;
        const mappedData = rows.map(row => ({
            id: row.id,
            provider: row.provider,
            productId: row.stripe_product_id,
            unaModule: row.una_module,
            unaId: row.una_content_id.toString()
        }));
        res.json({ mappings: mappedData });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch mappings from database" });
    }
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
                    await sql`
                        INSERT INTO bridge_mappings (user_id, creator_id, provider, stripe_product_id, una_module, una_content_id) 
                        VALUES (${user.id}, ${user.id}, ${provider}, ${map.productId}, ${map.unaModule}, ${contentId})
                    `;
                }
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save mappings to database" });
    }
});

app.post('/api/get-stripe-products', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "No API key provided" });

    try {
        const cleanKey = apiKey.trim(); 
        const stripe = new Stripe(cleanKey);
        const products = await stripe.products.list({ limit: 100, active: true });
        const formattedProducts = products.data.map(p => ({ id: p.id, name: p.name }));
        res.json({ products: formattedProducts });
    } catch (error) {
        res.status(400).json({ error: `Stripe says: ${error.message}` });
    }
});

// --- GET AUDIENCE STATS ---
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
                stats[productId] = {
                    productId: productId,
                    productName: productMap[productId] || 'Unknown Product',
                    isMapped: mappedProductIds.has(productId),
                    totalCount: 0,
                    bridgedCount: 0,
                    users: []
                };
            }

            stats[productId].totalCount++;
            const email = sub.customer?.email || 'No email';
            
            let displayStatus = 'Stripe Only';
            let isRevoked = false;
            let isBridged = false;

            if (mappedProductIds.has(productId)) {
                const dbStatus = statusMap[email];
                // FIX: Updated text exactly to "Access Revoked", "Active", and "Inactive"
                if (dbStatus === 'revoked') {
                    displayStatus = 'Access Revoked';
                    isRevoked = true;
                } else if (dbStatus === 'bridged') {
                    displayStatus = 'Active'; 
                    isBridged = true;
                    stats[productId].bridgedCount++;
                } else {
                    displayStatus = 'Inactive'; 
                }
            }

            stats[productId].users.push({
                name: sub.customer?.name || 'Customer',
                email: email,
                status: displayStatus,
                isRevoked: isRevoked,
                isBridged: isBridged
            });
        }

        res.json({ stats: Object.values(stats) });
    } catch (error) {
        console.error("Stats Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch subscriber stats." });
    }
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
                
                await sql`
                    INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) 
                    VALUES (${sub.customer.id}, ${customerEmail}, ${newStatus})
                    ON CONFLICT (stripe_customer_id) 
                    DO UPDATE SET email = ${customerEmail}, bridge_status = ${newStatus}
                `;

                if (result.success) syncCount++;
            }
        }
        res.json({ success: true, count: syncCount });
    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ error: "Failed to sync subscribers." });
    }
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
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle access." });
    }
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
                await sql`
                    INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) 
                    VALUES (${customerId}, ${customerEmail}, ${bridgeStatus})
                    ON CONFLICT (stripe_customer_id) 
                    DO UPDATE SET email = ${customerEmail}, bridge_status = ${bridgeStatus}
                `;
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

    } catch (error) {
        console.error('Webhook Error Processing:', error);
    }
    res.json({ received: true });
});

export default app;