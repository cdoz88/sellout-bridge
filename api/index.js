/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Hardened order_index parsing and added strict email validation
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

function createMultipartPayload(params) {
    const boundary = '----SelloutCrowdsBoundary' + Math.random().toString(36).substring(2);
    let body = '';
    
    const appendField = (key, value) => {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        body += `${value}\r\n`;
    };

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value)) {
                appendField(`${key}[${subKey}]`, subValue);
            }
        } else if (value !== undefined && value !== null) {
            appendField(key, value);
        }
    }
    body += `--${boundary}--\r\n`;
    return { body, boundary };
}

async function ensureSchema() {
    try {
        await sql`ALTER TABLE bridge_customers ADD COLUMN IF NOT EXISTS bridge_status VARCHAR(50) DEFAULT 'pending'`;
        await sql`CREATE TABLE IF NOT EXISTS bridge_patreon_users (email VARCHAR(255) PRIMARY KEY, tier VARCHAR(255), status VARCHAR(50))`;
        await sql`CREATE TABLE IF NOT EXISTS bridge_business_cards (user_id INTEGER PRIMARY KEY, card_data JSONB)`;
        try { await sql`ALTER TABLE bridge_business_cards ADD COLUMN custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_bio_pages (user_id INTEGER PRIMARY KEY, page_data JSONB)`;
        try { await sql`ALTER TABLE bridge_bio_pages ADD COLUMN custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

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
        
        try { 
            await sql`CREATE TABLE IF NOT EXISTS bridge_manual_users (
                id SERIAL PRIMARY KEY, 
                user_id INTEGER, 
                email VARCHAR(255), 
                una_module VARCHAR(50), 
                una_content_id INTEGER, 
                status VARCHAR(50) DEFAULT 'bridged', 
                UNIQUE(user_id, email, una_module, una_content_id)
            )`; 
        } catch(e) {}

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_email_aliases (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                original_email VARCHAR(255),
                alias_email VARCHAR(255),
                UNIQUE(user_id, original_email)
            )`;
        } catch(e) {}

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_asset_categories (id SERIAL PRIMARY KEY, name VARCHAR(255), is_hidden BOOLEAN DEFAULT FALSE, order_index INTEGER DEFAULT 0)`;
            await sql`CREATE TABLE IF NOT EXISTS bridge_assets (id SERIAL PRIMARY KEY, category_id INTEGER, title VARCHAR(255), file_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
            
            // Force column addition (catch will absorb error if it already exists)
            try { await sql`ALTER TABLE bridge_asset_categories ADD COLUMN order_index INTEGER DEFAULT 0`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_assets ADD COLUMN order_index INTEGER DEFAULT 0`; } catch(e) {}
        } catch(e) {}

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_guide_categories (id SERIAL PRIMARY KEY, name VARCHAR(255), is_hidden BOOLEAN DEFAULT FALSE, order_index INTEGER DEFAULT 0)`;
            await sql`CREATE TABLE IF NOT EXISTS bridge_guides (id SERIAL PRIMARY KEY, category_id INTEGER, title VARCHAR(255), type VARCHAR(50), content JSONB, order_index INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
            
            // Force column addition (catch will absorb error if it already exists)
            try { await sql`ALTER TABLE bridge_guide_categories ADD COLUMN order_index INTEGER DEFAULT 0`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_guides ADD COLUMN order_index INTEGER DEFAULT 0`; } catch(e) {}
        } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_settings (
            user_id INTEGER PRIMARY KEY,
            stripe_account_id TEXT,
            paypal_account_id TEXT,
            paypal_refresh_token TEXT
        )`;
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS stripe_account_id TEXT`; } catch(e){}
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS paypal_account_id TEXT`; } catch(e){}
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS paypal_refresh_token TEXT`; } catch(e){}

        await sql`CREATE TABLE IF NOT EXISTS bridge_mappings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            creator_id INTEGER,
            provider VARCHAR(50),
            stripe_product_id VARCHAR(255),
            una_module VARCHAR(50),
            una_content_id INTEGER
        )`;

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


// --- GUIDES ENDPOINTS ---
const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com'];

app.get('/api/guides/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        
        let categories = await sql`SELECT * FROM bridge_guide_categories ORDER BY order_index ASC, id ASC`;
        if (!isAdmin) categories = categories.filter(c => !c.is_hidden);
        
        const guides = await sql`SELECT * FROM bridge_guides ORDER BY order_index ASC, id DESC`;
        res.json({ categories, guides });
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/guides/categories', async (req, res) => {
    const { id, name, is_hidden, order_index } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        let safeOrder = 0;
        if (order_index !== undefined && order_index !== null) {
            safeOrder = parseInt(order_index, 10);
            if (isNaN(safeOrder)) safeOrder = 0;
        }

        const isHiddenBool = is_hidden === true || is_hidden === 'true';

        if (id) {
            await sql`UPDATE bridge_guide_categories SET name = ${name}, is_hidden = ${isHiddenBool}, order_index = ${safeOrder} WHERE id = ${id}`;
        } else {
            await sql`INSERT INTO bridge_guide_categories (name, is_hidden, order_index) VALUES (${name}, ${isHiddenBool}, ${safeOrder})`;
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/guides/categories/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`DELETE FROM bridge_guide_categories WHERE id = ${id}`;
        await sql`DELETE FROM bridge_guides WHERE category_id = ${id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/guides', async (req, res) => {
    const { id, category_id, title, type, content } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        if (id) {
            await sql`UPDATE bridge_guides SET category_id = ${category_id}, title = ${title}, type = ${type}, content = ${content} WHERE id = ${id}`;
        } else {
            await sql`INSERT INTO bridge_guides (category_id, title, type, content) VALUES (${category_id}, ${title}, ${type}, ${content})`;
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/guides/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`DELETE FROM bridge_guides WHERE id = ${id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- ASSET ENDPOINTS ---
app.get('/api/assets/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        
        let categories = await sql`SELECT * FROM bridge_asset_categories ORDER BY order_index ASC, id ASC`;
        if (!isAdmin) {
            categories = categories.filter(c => !c.is_hidden);
        }
        const assets = await sql`SELECT * FROM bridge_assets ORDER BY id DESC`;
        res.json({ categories, assets });
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/assets/categories', async (req, res) => {
    const { id, name, is_hidden, order_index } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        let safeOrder = 0;
        if (order_index !== undefined && order_index !== null) {
            safeOrder = parseInt(order_index, 10);
            if (isNaN(safeOrder)) safeOrder = 0;
        }

        const isHiddenBool = is_hidden === true || is_hidden === 'true';

        if (id) {
            await sql`UPDATE bridge_asset_categories SET name = ${name}, is_hidden = ${isHiddenBool}, order_index = ${safeOrder} WHERE id = ${id}`;
        } else {
            await sql`INSERT INTO bridge_asset_categories (name, is_hidden, order_index) VALUES (${name}, ${isHiddenBool}, ${safeOrder})`;
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/assets/categories/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`DELETE FROM bridge_asset_categories WHERE id = ${id}`;
        await sql`DELETE FROM bridge_assets WHERE category_id = ${id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/assets', async (req, res) => {
    const { category_id, title, file_url } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`INSERT INTO bridge_assets (category_id, title, file_url) VALUES (${category_id}, ${title}, ${file_url})`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/assets/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        await sql`DELETE FROM bridge_assets WHERE id = ${id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});


// --- OTHER API ENDPOINTS (OAuth, Users, Subscriptions, Webhooks) ---
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

app.get('/api/get-aliases', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const rows = await sql`SELECT * FROM bridge_email_aliases WHERE user_id = ${user.id} ORDER BY id DESC`;
        res.json({ aliases: rows });
    } catch (error) { res.status(500).json({ error: "Failed to fetch aliases" }); }
});

app.post('/api/add-alias', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { originalEmail, aliasEmail } = req.body;
    if (!originalEmail || !aliasEmail) return res.status(400).json({ error: "Missing fields" });
    
    try {
        await ensureSchema();
        const cleanOriginal = originalEmail.trim().toLowerCase();
        const cleanAlias = aliasEmail.trim().toLowerCase();
        
        await sql`
            INSERT INTO bridge_email_aliases (user_id, original_email, alias_email)
            VALUES (${user.id}, ${cleanOriginal}, ${cleanAlias})
            ON CONFLICT (user_id, original_email) 
            DO UPDATE SET alias_email = EXCLUDED.alias_email
        `;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to add alias" }); }
});

app.post('/api/remove-alias', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { id } = req.body;
    try {
        await sql`DELETE FROM bridge_email_aliases WHERE id = ${id} AND user_id = ${user.id}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to remove alias" }); }
});

app.get('/api/get-manual-users', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const rows = await sql`SELECT * FROM bridge_manual_users WHERE user_id = ${user.id} ORDER BY id DESC`;
        res.json({ users: rows });
    } catch (error) { res.status(500).json({ error: "Failed to fetch manual users" }); }
});

app.post('/api/add-manual-user', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { email, unaModule, unaId } = req.body;
    if (!email || !unaModule || !unaId) return res.status(400).json({ error: "Missing fields" });
    
    try {
        await ensureSchema();
        const cleanEmail = email.trim().toLowerCase();
        const result = await grantCommunityAccess(cleanEmail, unaModule, unaId);
        const newStatus = result.success ? 'bridged' : 'pending';
        
        await sql`
            INSERT INTO bridge_manual_users (user_id, email, una_module, una_content_id, status)
            VALUES (${user.id}, ${cleanEmail}, ${unaModule}, ${unaId}, ${newStatus})
            ON CONFLICT (user_id, email, una_module, una_content_id) 
            DO UPDATE SET status = EXCLUDED.status
        `;
        res.json({ success: true, result });
    } catch (error) { res.status(500).json({ error: "Failed to add manual user" }); }
});

app.post('/api/remove-manual-user', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { id, email, unaModule, unaId } = req.body;
    
    try {
        await ensureSchema();
        await revokeCommunityAccess(email, unaModule, unaId);
        await sql`DELETE FROM bridge_manual_users WHERE id = ${id} AND user_id = ${user.id}`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to remove manual user" }); }
});

app.get('/api/get-settings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const userId = parseInt(user.id);
        const rows = await sql`SELECT stripe_account_id, paypal_account_id FROM bridge_settings WHERE user_id = ${userId}`;
        res.json({ settings: rows[0] || {} });
    } catch (error) { res.status(500).json({ error: "Failed to fetch settings." }); }
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

// --- STRIPE OAUTH & WEBHOOKS ---
app.post('/api/stripe/oauth/callback', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing authorization code" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Platform Stripe Secret Key not configured in Vercel environment variables." });

    try {
        const response = await fetch('https://connect.stripe.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_secret: process.env.STRIPE_SECRET_KEY
            })
        });
        
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error_description || data.error });
        
        const accountId = data.stripe_user_id;
        
        await ensureSchema();
        const userId = parseInt(user.id);
        await sql`INSERT INTO bridge_settings (user_id, stripe_account_id) VALUES (${userId}, ${accountId}) ON CONFLICT (user_id) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id`;
        
        res.json({ success: true, accountId });
    } catch (e) {
        res.status(500).json({ error: "Failed to connect Stripe account." });
    }
});

app.post('/api/stripe/oauth/disconnect', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    try {
        await ensureSchema();
        await sql`UPDATE bridge_settings SET stripe_account_id = NULL WHERE user_id = ${parseInt(user.id)}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to disconnect account." }); }
});

app.post('/api/get-stripe-products', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { accountId } = req.body;
    
    if (!accountId) return res.status(400).json({ error: "No connected account ID provided" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Platform Stripe Secret Key not configured in Vercel environment variables." });

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const products = await stripe.products.list({ limit: 100, active: true }, { stripeAccount: accountId });
        res.json({ products: products.data.map(p => ({ id: p.id, name: p.name })) });
    } catch (error) { res.status(400).json({ error: `Stripe says: ${error.message}` }); }
});

// --- PAYPAL OAUTH & WEBHOOKS ---
app.post('/api/paypal/oauth/callback', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing authorization code" });
    
    const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET_KEY;
    if (!PAYPAL_CLIENT || !PAYPAL_SECRET) return res.status(500).json({ error: "Platform PayPal keys not configured in Vercel." });

    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
        const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=authorization_code&code=${code}`
        });
        
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error_description || data.error });
        
        const refreshToken = data.refresh_token;
        const accountId = "PayPal_Connected"; 
        
        await ensureSchema();
        const userId = parseInt(user.id);
        await sql`INSERT INTO bridge_settings (user_id, paypal_account_id, paypal_refresh_token) VALUES (${userId}, ${accountId}, ${refreshToken}) ON CONFLICT (user_id) DO UPDATE SET paypal_account_id = EXCLUDED.paypal_account_id, paypal_refresh_token = EXCLUDED.paypal_refresh_token`;
        
        res.json({ success: true, accountId });
    } catch (e) {
        res.status(500).json({ error: "Failed to connect PayPal account." });
    }
});

app.post('/api/paypal/oauth/disconnect', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        await sql`UPDATE bridge_settings SET paypal_account_id = NULL, paypal_refresh_token = NULL WHERE user_id = ${parseInt(user.id)}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to disconnect account." }); }
});

app.post('/api/get-paypal-products', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET_KEY;
    if (!PAYPAL_CLIENT || !PAYPAL_SECRET) return res.status(500).json({ error: "Platform PayPal keys not configured." });

    try {
        await ensureSchema();
        const settings = await sql`SELECT paypal_refresh_token FROM bridge_settings WHERE user_id = ${parseInt(user.id)}`;
        if (!settings.length || !settings[0].paypal_refresh_token) return res.status(400).json({ error: "PayPal not connected" });

        const refreshToken = settings[0].paypal_refresh_token;

        const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
        const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error("Failed to refresh PayPal token");

        const plansRes = await fetch('https://api-m.paypal.com/v1/billing/plans?page_size=50', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        const plansData = await plansRes.json();
        if (!plansData.plans) throw new Error("Could not fetch plans.");

        res.json({ products: plansData.plans.map(p => ({ id: p.id, name: p.name })) });
    } catch (error) { res.status(400).json({ error: `PayPal says: ${error.message}` }); }
});

// CSV IMPORTS (PATREON & PAYPAL)
app.post('/api/patreon-import', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { users, mappings } = req.body; 
    try {
        await ensureSchema();
        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const mappingsMap = {};
        mappings.forEach(m => { mappingsMap[m.productId] = { module: m.unaModule, id: m.unaId }; });
        
        const existingDb = await sql`SELECT email, tier, status FROM bridge_patreon_users`;
        const incomingMap = {};
        users.forEach(u => { if (mappingsMap[u.tier]) incomingMap[u.email] = u.tier; });

        let importCount = 0; let revokeCount = 0;
        for (const dbUser of existingDb) {
            if (dbUser.status === 'bridged' && !incomingMap[dbUser.email]) {
                const oldMapping = mappingsMap[dbUser.tier];
                if (oldMapping) {
                    const targetEmail = aliasesMap[dbUser.email] || dbUser.email;
                    await revokeCommunityAccess(targetEmail, oldMapping.module, oldMapping.id);
                }
                await sql`UPDATE bridge_patreon_users SET status = 'revoked' WHERE email = ${dbUser.email}`;
                revokeCount++;
                await new Promise(resolve => setTimeout(resolve, 250)); 
            }
        }
        for (const [email, tier] of Object.entries(incomingMap)) {
            const { module, id } = mappingsMap[tier];
            const targetEmail = aliasesMap[email] || email;
            const result = await grantCommunityAccess(targetEmail, module, id);
            
            const newStatus = result.success ? 'bridged' : 'pending';
            await sql`INSERT INTO bridge_patreon_users (email, tier, status) VALUES (${email}, ${tier}, ${newStatus}) ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status`;
            if (result.success) importCount++;
            await new Promise(resolve => setTimeout(resolve, 250)); 
        }
        res.json({ success: true, added: importCount, revoked: revokeCount });
    } catch (error) { res.status(500).json({ error: "Failed to process Patreon import." }); }
});

app.post('/api/paypal-import', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { users, mappings } = req.body; 
    try {
        await ensureSchema();

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const mappingsMap = {};
        mappings.forEach(m => { mappingsMap[m.productId] = { module: m.unaModule, id: m.unaId }; });
        
        let importCount = 0; 
        for (const u of users) {
            if (mappingsMap[u.plan]) {
                const { module, id } = mappingsMap[u.plan];
                const targetEmail = aliasesMap[u.email] || u.email;
                const result = await grantCommunityAccess(targetEmail, module, id);
                
                const newStatus = result.success ? 'bridged' : 'pending';
                const dummyStripeId = `pp_csv_${crypto.randomBytes(8).toString('hex')}`;
                
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${dummyStripeId}, ${u.email}, ${newStatus}) ON CONFLICT (stripe_customer_id) DO NOTHING`;
                
                if (result.success) importCount++;
                await new Promise(resolve => setTimeout(resolve, 250)); 
            }
        }
        res.json({ success: true, added: importCount });
    } catch (error) { res.status(500).json({ error: "Failed to process PayPal import." }); }
});

app.get('/api/get-subscribers', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    if (!process.env.STRIPE_SECRET_KEY) return res.json({ stats: [] });

    try {
        await ensureSchema();
        
        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const settingsRows = await sql`SELECT stripe_account_id FROM bridge_settings WHERE user_id = ${user.id}`;
        if (settingsRows.length === 0 || !settingsRows[0].stripe_account_id) return res.json({ stats: [] });
        
        const accountId = settingsRows[0].stripe_account_id;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const mappingRows = await sql`SELECT stripe_product_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
        const mappedProductIds = new Set(mappingRows.map(r => r.stripe_product_id));
        
        const products = await stripe.products.list({ active: true, limit: 100 }, { stripeAccount: accountId });
        const productMap = {};
        products.data.forEach(p => productMap[p.id] = p.name);
        
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status || 'pending');

        const stats = {};
        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: accountId })) {
            const productId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            if (!productId) continue;
            if (!stats[productId]) {
                stats[productId] = { productId: productId, productName: productMap[productId] || 'Unknown Product', isMapped: mappedProductIds.has(productId), totalCount: 0, bridgedCount: 0, users: [] };
            }
            stats[productId].totalCount++;
            
            const email = sub.customer?.email || 'No email';
            const alias = aliasesMap[email];
            const displayEmail = alias ? `${email} ➔ ${alias}` : email;
            
            let displayStatus = 'Stripe Only'; let isRevoked = false; let isBridged = false;

            if (mappedProductIds.has(productId)) {
                const dbStatus = statusMap[email];
                if (dbStatus === 'revoked') { displayStatus = 'Access Revoked'; isRevoked = true; } 
                else if (dbStatus === 'bridged') { displayStatus = 'Active'; isBridged = true; stats[productId].bridgedCount++; } 
                else { displayStatus = 'Inactive'; }
            }
            stats[productId].users.push({ name: sub.customer?.name || 'Customer', email: email, displayEmail: displayEmail, status: displayStatus, isRevoked: isRevoked, isBridged: isBridged });
        }
        res.json({ stats: Object.values(stats) });
    } catch (error) { res.status(500).json({ error: "Failed to fetch subscriber stats." }); }
});

app.post('/api/sync-subscribers', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { provider } = req.body;

    try {
        await ensureSchema();

        if (provider === 'paypal') {
            return res.status(400).json({ error: "PayPal does not support automatic bulk subscription syncing. Please use the CSV importer instead." });
        }

        if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Platform Stripe key not configured." });

        const aliasRows = await sql`SELECT original_email, alias_email FROM bridge_email_aliases WHERE user_id = ${user.id}`;
        const aliasesMap = {};
        aliasRows.forEach(r => aliasesMap[r.original_email] = r.alias_email);

        const settingsRows = await sql`SELECT stripe_account_id FROM bridge_settings WHERE user_id = ${user.id}`;
        if (settingsRows.length === 0 || !settingsRows[0].stripe_account_id) return res.status(400).json({ error: "Stripe account not connected." });
        
        const accountId = settingsRows[0].stripe_account_id;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const mappingRows = await sql`SELECT stripe_product_id, una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
        const mappingsMap = {};
        mappingRows.forEach(row => mappingsMap[row.stripe_product_id] = { module: row.una_module, id: row.una_content_id });
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

        let syncCount = 0;
        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: accountId })) {
            const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            const customerEmail = sub.customer?.email;
            if (stripeProductId && customerEmail && mappingsMap[stripeProductId]) {
                if (statusMap[customerEmail] === 'revoked') continue;
                
                const { module, id } = mappingsMap[stripeProductId];
                const targetEmail = aliasesMap[customerEmail] || customerEmail;
                
                const result = await grantCommunityAccess(targetEmail, module, id);
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
        
        const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${user.id} AND original_email = ${email}`;
        const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : email;

        const mappingRows = await sql`SELECT una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND stripe_product_id = ${productId}`;
        if (mappingRows.length === 0) return res.status(400).json({ error: "Mapping not found." });
        const { una_module, una_content_id } = mappingRows[0];
        
        if (action === 'revoke') {
            await revokeCommunityAccess(targetEmail, una_module, una_content_id);
            await sql`UPDATE bridge_customers SET bridge_status = 'revoked' WHERE email = ${email}`;
        } else {
            const result = await grantCommunityAccess(targetEmail, una_module, una_content_id);
            const newStatus = result.success ? 'bridged' : 'pending';
            await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${email}`;
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to toggle access." }); }
});

// WEBHOOK HANDLERS
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
                const rows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId} AND provider = 'stripe'`;
                if (rows.length > 0) {
                    const userId = rows[0].user_id;
                    const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                    const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                    
                    const result = await grantCommunityAccess(targetEmail, rows[0].una_module, rows[0].una_content_id);
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
                    const mapRows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${stripeProductId} AND provider = 'stripe'`;
                    if (mapRows.length > 0) {
                        const userId = mapRows[0].user_id;
                        const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                        const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                        
                        await revokeCommunityAccess(targetEmail, mapRows[0].una_module, mapRows[0].una_content_id);
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
                                 await revokeCommunityAccess(targetEmail, mapRows[0].una_module, mapRows[0].una_content_id);
                                 await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                             } else if (status === 'active') {
                                 const result = await grantCommunityAccess(targetEmail, mapRows[0].una_module, mapRows[0].una_content_id);
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

app.post('/api/paypal-webhook', async (req, res) => {
    const event = req.body;
    try {
        await ensureSchema();
        if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const sub = event.resource;
            const customerEmail = sub.subscriber?.email_address;
            const customerId = sub.id; 
            const planId = sub.plan_id;
            let bridgeStatus = 'pending';
            if (planId && customerEmail) {
                const rows = await sql`SELECT user_id, una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ${planId} AND provider = 'paypal'`;
                if (rows.length > 0) {
                    const userId = rows[0].user_id;
                    const aliasRows = await sql`SELECT alias_email FROM bridge_email_aliases WHERE user_id = ${userId} AND original_email = ${customerEmail}`;
                    const targetEmail = aliasRows.length > 0 ? aliasRows[0].alias_email : customerEmail;
                    
                    const result = await grantCommunityAccess(targetEmail, rows[0].una_module, rows[0].una_content_id);
                    bridgeStatus = result.success ? 'bridged' : 'pending';
                }
            }
            if (customerId && customerEmail) {
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${customerId}, ${customerEmail}, ${bridgeStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status`;
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
                        
                        await revokeCommunityAccess(targetEmail, mapRows[0].una_module, mapRows[0].una_content_id);
                        await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                    }
                }
            }
        }
    } catch (error) { console.error('PayPal Webhook Error Processing:', error); }
    res.json({ received: true });
});

export default app;