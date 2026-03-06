/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Added strict response logging to see exactly why UNA rejects the command.
 */

import express from 'express';
import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe'; 

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

const FSAN_ENDPOINT = `${UNA_BASE_URL}/m/fsan/wordpress/get-fields`;
const FSAN_TOKEN = "j7PGMBb4nZylvLGVV0cgd7ZOvpCBJkDO"; 

const sql = neon(process.env.DATABASE_URL);

app.use(express.json());

// --- HELPER FUNCTIONS ---

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
        const response = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: module,
                method: 'serviceAddMember',
                params: [contentId, email],
                key: UNA_SECRET
            })
        });
        
        // FIX: Grab the actual response from UNA
        const responseData = await response.text(); 
        console.log(`[UNA API RESPONSE - GRANT] for ${email}:`, responseData);
        
    } catch (err) {
        console.error("[ERROR] Grant Access:", err);
    }
}

async function revokeCommunityAccess(email, module, contentId) {
    try {
        const response = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: module,
                method: 'serviceRemoveMember', 
                params: [contentId, email],
                key: UNA_SECRET
            })
        });
        
        // FIX: Grab the actual response from UNA
        const responseData = await response.text();
        console.log(`[UNA API RESPONSE - REVOKE] for ${email}:`, responseData);
        
    } catch (err) {
        console.error("[ERROR] Revoke Access:", err);
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

// GET SAVED API KEYS
app.get('/api/get-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
        const userId = parseInt(user.id);
        const rows = await sql`SELECT stripe_secret_key FROM bridge_settings WHERE user_id = ${userId}`;
        res.json({ settings: rows[0] || {} });
    } catch (error) {
        console.error("Settings Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch settings from database." });
    }
});

// SAVE API KEYS
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
        console.error("Settings Save Error:", error);
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

// --- THE SMART WEBHOOK HANDLER ---

app.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;
    
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email;
            const customerId = session.customer; 
            const stripeProductId = session.metadata?.product_id;

            if (customerId && customerEmail) {
                await sql`
                    INSERT INTO bridge_customers (stripe_customer_id, email) 
                    VALUES (${customerId}, ${customerEmail})
                    ON CONFLICT (stripe_customer_id) 
                    DO UPDATE SET email = ${customerEmail}
                `;
            }

            if (stripeProductId && customerEmail) {
                const rows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                if (rows.length > 0) {
                    const { una_module, una_content_id } = rows[0];
                    await grantCommunityAccess(customerEmail, una_module, una_content_id);
                }
            }
        } 
        
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            const stripeProductId = subscription.plan?.product || subscription.items?.data[0]?.price?.product;

            if (customerId && stripeProductId) {
                const customerRows = await sql`SELECT email FROM bridge_customers WHERE stripe_customer_id = ${customerId}`;
                
                if (customerRows.length > 0) {
                    const customerEmail = customerRows[0].email;
                    const mappingRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                    
                    if (mappingRows.length > 0) {
                        const { una_module, una_content_id } = mappingRows[0];
                        await revokeCommunityAccess(customerEmail, una_module, una_content_id);
                    }
                }
            }
        }

        else if (event.type === 'customer.subscription.updated') {
             const subscription = event.data.object;
             const status = subscription.status; 
             const customerId = subscription.customer;
             const stripeProductId = subscription.plan?.product || subscription.items?.data[0]?.price?.product;

             if (customerId && stripeProductId) {
                 const customerRows = await sql`SELECT email FROM bridge_customers WHERE stripe_customer_id = ${customerId}`;
                 
                 if (customerRows.length > 0) {
                     const customerEmail = customerRows[0].email;
                     const mappingRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId}`;
                     
                     if (mappingRows.length > 0) {
                         const { una_module, una_content_id } = mappingRows[0];
                         
                         if (status === 'unpaid' || status === 'past_due' || status === 'canceled') {
                             await revokeCommunityAccess(customerEmail, una_module, una_content_id);
                         } 
                         else if (status === 'active') {
                             await grantCommunityAccess(customerEmail, una_module, una_content_id);
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