/**
 * api/index.js - THE BACKEND ENGINE
 * FULLY RESTORED: BUNDLES, MODULE ROUTING, DIAGNOSTICS, AND MANUAL MULTI-SELECT
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
        try { await sql`ALTER TABLE bridge_business_cards ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_bio_pages (user_id INTEGER PRIMARY KEY, page_data JSONB)`;
        try { await sql`ALTER TABLE bridge_bio_pages ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

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
        
        try { await sql`ALTER TABLE wp_oauth_codes ADD COLUMN IF NOT EXISTS profile_link TEXT`; } catch(e){}
        try { await sql`ALTER TABLE wp_access_tokens ADD COLUMN IF NOT EXISTS profile_link TEXT`; } catch(e){}
        
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
            await sql`CREATE TABLE IF NOT EXISTS bridge_team_seats (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER,
                teammate_email VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(owner_id, teammate_email)
            )`;
        } catch(e) {}

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_asset_categories (id SERIAL PRIMARY KEY, name VARCHAR(255), is_hidden BOOLEAN DEFAULT FALSE, order_index INTEGER DEFAULT 0)`;
            await sql`CREATE TABLE IF NOT EXISTS bridge_assets (id SERIAL PRIMARY KEY, category_id INTEGER, title VARCHAR(255), file_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, order_index INTEGER DEFAULT 0)`;
            
            try { await sql`ALTER TABLE bridge_asset_categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_assets ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`; } catch(e) {}
        } catch(e) {}

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_guide_categories (id SERIAL PRIMARY KEY, name VARCHAR(255), is_hidden BOOLEAN DEFAULT FALSE, order_index INTEGER DEFAULT 0)`;
            await sql`CREATE TABLE IF NOT EXISTS bridge_guides (id SERIAL PRIMARY KEY, category_id INTEGER, title VARCHAR(255), type VARCHAR(50), content JSONB, order_index INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
            
            try { await sql`ALTER TABLE bridge_guide_categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_guides ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`; } catch(e) {}
        } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_settings (
            user_id INTEGER PRIMARY KEY,
            stripe_account_id TEXT,
            paypal_client_id TEXT,
            paypal_secret_key TEXT
        )`;
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS stripe_account_id TEXT`; } catch(e){}
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS paypal_client_id TEXT`; } catch(e){}
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS paypal_secret_key TEXT`; } catch(e){}

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
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, module: module, action: 'add' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}

async function revokeCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, module: module, action: 'remove' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}

// ==========================================
// MY TEAM ENDPOINTS (Umbrella ACL)
// ==========================================
app.get('/api/team', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
        await ensureSchema();
        
        let limit = 0;
        if (user.role === 17) limit = 6; 
        else if (user.role === 16) limit = 3; 
        else if (user.role === 3) limit = 999; 

        const rows = await sql`SELECT * FROM bridge_team_seats WHERE owner_id = ${user.id} ORDER BY created_at DESC`;
        
        res.json({ limit, used: rows.length, teammates: rows });
    } catch (error) { 
        res.status(500).json({ error: "Failed to fetch team data" }); 
    }
});

app.post('/api/team/invite', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        await ensureSchema();
        const cleanEmail = email.trim().toLowerCase();
        
        let limit = 0;
        if (user.role === 17) limit = 6;
        else if (user.role === 16) limit = 3;
        else if (user.role === 3) limit = 999;

        const existing = await sql`SELECT * FROM bridge_team_seats WHERE owner_id = ${user.id}`;
        if (existing.length >= limit) return res.status(400).json({ error: "Seat limit reached. Upgrade your account on Sellout Crowds to add more teammates." });

        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
            body: JSON.stringify({ email: cleanEmail, action: 'assign_teammate', level_id: 11 }) 
        });
        
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
        }

        if (!result.success) throw new Error(result.error || "Failed to upgrade user.");

        await sql`INSERT INTO bridge_team_seats (owner_id, teammate_email) VALUES (${user.id}, ${cleanEmail}) ON CONFLICT (owner_id, teammate_email) DO NOTHING`;

        res.json({ success: true });
    } catch (error) { 
        res.status(400).json({ error: error.message }); 
    }
});

app.post('/api/team/revoke', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const cleanEmail = email.trim().toLowerCase();

        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
            body: JSON.stringify({ email: cleanEmail, action: 'revoke_teammate', level_id: 11 }) 
        });

        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
        }

        await sql`DELETE FROM bridge_team_seats WHERE owner_id = ${user.id} AND teammate_email = ${cleanEmail}`;

        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: error.message || "Failed to revoke teammate" }); 
    }
});

// ==========================================
// BUSINESS CARD & BIO PAGE ENDPOINTS
// ==========================================

// Business Card
app.get('/api/get-card', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const rows = await sql`SELECT card_data, custom_slug FROM bridge_business_cards WHERE user_id = ${user.id}`;
        if (rows.length > 0) {
            res.json({ card: rows[0].card_data, slug: rows[0].custom_slug || '' });
        } else {
            res.json({ card: null, slug: '' });
        }
    } catch (err) { res.status(500).json({ error: "Failed to fetch card" }); }
});

app.post('/api/save-card', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { card, slug } = req.body;
    
    try {
        await ensureSchema();
        if (slug) {
            const slugCheck = await sql`SELECT user_id FROM bridge_business_cards WHERE custom_slug = ${slug} AND user_id != ${user.id}`;
            if (slugCheck.length > 0) return res.status(400).json({ error: "This Custom URL is already taken." });
        }
        
        await sql`
            INSERT INTO bridge_business_cards (user_id, card_data, custom_slug) 
            VALUES (${user.id}, ${card}, ${slug}) 
            ON CONFLICT (user_id) 
            DO UPDATE SET card_data = EXCLUDED.card_data, custom_slug = EXCLUDED.custom_slug
        `;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to save card" }); }
});

app.get('/api/public-card/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const rows = await sql`SELECT card_data FROM bridge_business_cards WHERE custom_slug = ${req.params.slug}`;
        if (rows.length > 0) res.json({ success: true, card: rows[0].card_data });
        else res.status(404).json({ error: "Card not found" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Bio Page
app.get('/api/get-bio-page', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const rows = await sql`SELECT page_data, custom_slug FROM bridge_bio_pages WHERE user_id = ${user.id}`;
        if (rows.length > 0) {
            res.json({ page: rows[0].page_data, slug: rows[0].custom_slug || '' });
        } else {
            res.json({ page: null, slug: '' });
        }
    } catch (err) { res.status(500).json({ error: "Failed to fetch bio page" }); }
});

app.post('/api/save-bio-page', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { page, slug } = req.body;
    
    try {
        await ensureSchema();
        if (slug) {
            const slugCheck = await sql`SELECT user_id FROM bridge_bio_pages WHERE custom_slug = ${slug} AND user_id != ${user.id}`;
            if (slugCheck.length > 0) return res.status(400).json({ error: "This Custom URL is already taken." });
        }
        
        await sql`
            INSERT INTO bridge_bio_pages (user_id, page_data, custom_slug) 
            VALUES (${user.id}, ${page}, ${slug}) 
            ON CONFLICT (user_id) 
            DO UPDATE SET page_data = EXCLUDED.page_data, custom_slug = EXCLUDED.custom_slug
        `;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to save bio page" }); }
});

app.get('/api/public-bio-page/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const rows = await sql`SELECT page_data FROM bridge_bio_pages WHERE custom_slug = ${req.params.slug}`;
        if (rows.length > 0) res.json({ success: true, page: rows[0].page_data });
        else res.status(404).json({ error: "Page not found" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// ==========================================
// GUIDES ENDPOINTS
// ==========================================
const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com'];

app.get('/api/guides/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        
        let categories = await sql`SELECT * FROM bridge_guide_categories ORDER BY order_index ASC, id ASC`;
        if (!isAdmin) categories = categories.filter(c => !c.is_hidden);
        
        const guides = await sql`SELECT * FROM bridge_guides ORDER BY id DESC`;
        res.json({ categories, guides });
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/guides/categories/bulk', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        const { categories } = req.body;
        if (Array.isArray(categories)) {
            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                const safeOrder = i;
                const isHiddenBool = cat.is_hidden === true || cat.is_hidden === 'true';
                
                if (cat.id && !cat.id.toString().startsWith('temp_')) {
                    await sql`UPDATE bridge_guide_categories SET name = ${cat.name}, is_hidden = ${isHiddenBool}, order_index = ${safeOrder} WHERE id = ${cat.id}`;
                } else {
                    await sql`INSERT INTO bridge_guide_categories (name, is_hidden, order_index) VALUES (${cat.name}, ${isHiddenBool}, ${safeOrder})`;
                }
            }
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

// ==========================================
// ASSET ENDPOINTS 
// ==========================================
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

app.post('/api/assets/categories/bulk', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });

        const { categories } = req.body;
        if (Array.isArray(categories)) {
            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                const safeOrder = i;
                const isHiddenBool = cat.is_hidden === true || cat.is_hidden === 'true';
                
                if (cat.id && !cat.id.toString().startsWith('temp_')) {
                    await sql`UPDATE bridge_asset_categories SET name = ${cat.name}, is_hidden = ${isHiddenBool}, order_index = ${safeOrder} WHERE id = ${cat.id}`;
                } else {
                    await sql`INSERT INTO bridge_asset_categories (name, is_hidden, order_index) VALUES (${cat.name}, ${isHiddenBool}, ${safeOrder})`;
                }
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
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

// ==========================================
// OTHER API ENDPOINTS (OAuth, Users, Subscriptions)
// ==========================================
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

        // --- FETCH OWNED COMMUNITIES ---
        let ownedSpaces = [];
        let ownedGroups = [];
        try {
            if (meData.email) {
                const url = `${UNA_BASE_URL}/bridge-connector.php`;
                const ownedRes = await fetch(url, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
                    body: JSON.stringify({ email: meData.email, action: 'get_owned_profile_ids' }) 
                });
                const ownedData = await ownedRes.json();
                if (ownedData.success) {
                    ownedSpaces = ownedData.owned_spaces || [];
                    ownedGroups = ownedData.owned_groups || [];
                }
            }
        } catch (e) {
            console.error("Failed to fetch owned profile IDs", e);
        }

        const crowds = []; const spaces = []; let currentCategory = null;
        parsedData.allow_view_to.values.forEach(item => {
            if (item.type === 'group_header') { 
                if (item.value === 'CROWD') currentCategory = 'CROWD'; 
                if (item.value === 'SPACE') currentCategory = 'SPACE';
            } else if (item.type === 'group_end') { 
                currentCategory = null;
            } else if (item.key !== undefined && typeof item.key === 'number') {
                const trueId = Math.abs(item.key).toString();
                const numId = parseInt(trueId, 10);
                
                // Only include the community if the user actually owns it
                if (currentCategory === 'CROWD' && ownedSpaces.includes(numId)) {
                    crowds.push({ id: trueId, title: item.value });
                } else if (currentCategory === 'SPACE' && ownedGroups.includes(numId)) {
                    spaces.push({ id: trueId, title: item.value });
                }
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

// --- GET MANUAL USERS: GROUPED BY EMAIL ---
app.get('/api/get-manual-users', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        const rows = await sql`SELECT * FROM bridge_manual_users WHERE user_id = ${user.id} ORDER BY id DESC`;
        
        // Group by email so the frontend can treat them as bundles
        const grouped = {};
        rows.forEach(row => {
            if (!grouped[row.email]) {
                grouped[row.email] = { email: row.email, status: row.status, communities: [] };
            }
            grouped[row.email].communities.push({
                id: row.id,
                module: row.una_module,
                contentId: row.una_content_id
            });
        });

        res.json({ users: Object.values(grouped) });
    } catch (error) { res.status(500).json({ error: "Failed to fetch manual users" }); }
});

// --- UPDATED FOR GRACEFUL ERROR HANDLING ---
app.post('/api/add-manual-user', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { email, communities } = req.body;
    
    if (!email || !communities || communities.length === 0) {
        return res.status(400).json({ error: "Missing email or communities array" });
    }
    
    try {
        await ensureSchema();
        const cleanEmail = email.trim().toLowerCase();
        let allSuccess = true;
        let lastError = "";

        for (const comm of communities) {
            const lastUnderscore = comm.lastIndexOf('_');
            const module = comm.substring(0, lastUnderscore);
            const id = comm.substring(lastUnderscore + 1);

            const result = await grantCommunityAccess(cleanEmail, module, id);
            const newStatus = result.success ? 'bridged' : 'pending';
            
            if (!result.success) {
                allSuccess = false;
                lastError = result.error || "Failed to grant access to one or more communities.";
            }

            await sql`
                INSERT INTO bridge_manual_users (user_id, email, una_module, una_content_id, status)
                VALUES (${user.id}, ${cleanEmail}, ${module}, ${id}, ${newStatus})
                ON CONFLICT (user_id, email, una_module, una_content_id) 
                DO UPDATE SET status = EXCLUDED.status
            `;
        }

        // ALWAYS RETURN SUCCESS SO THE UI CAN REFRESH!
        res.json({ 
            success: true, 
            notice: !allSuccess ? lastError : null 
        });

    } catch (error) { 
        res.status(500).json({ error: "Failed to add manual user" }); 
    }
});

// --- UPDATED TO REMOVE SINGLE COMMUNITY FROM BUNDLE ---
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
        const rows = await sql`SELECT stripe_account_id, paypal_client_id FROM bridge_settings WHERE user_id = ${userId}`;
        
        const settings = rows[0] || {};
        res.json({ 
            settings: {
                stripe_account_id: settings.stripe_account_id,
                paypal_client_id: settings.paypal_client_id,
                paypal_is_connected: !!settings.paypal_client_id
            } 
        });
    } catch (error) { res.status(500).json({ error: "Failed to fetch settings." }); }
});

app.get('/api/get-mappings', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        const rows = await sql`SELECT * FROM bridge_mappings WHERE user_id = ${user.id}`;
        
        const grouped = {};
        rows.forEach(row => {
            const key = `${row.provider}_${row.stripe_product_id}`;
            if (!grouped[key]) {
                grouped[key] = { 
                    id: row.id,
                    provider: row.provider, 
                    productId: row.stripe_product_id, 
                    communities: [] 
                };
            }
            grouped[key].communities.push(`${row.una_module}_${row.una_content_id}`);
        });
        
        res.json({ mappings: Object.values(grouped) });
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
                if (map.productId && map.communities && map.communities.length > 0) {
                    const provider = map.provider || 'stripe';
                    
                    for (const comm of map.communities) {
                        const lastUnderscore = comm.lastIndexOf('_');
                        const module = comm.substring(0, lastUnderscore);
                        const contentId = parseInt(comm.substring(lastUnderscore + 1));
                        
                        await sql`INSERT INTO bridge_mappings (user_id, creator_id, provider, stripe_product_id, una_module, una_content_id) VALUES (${user.id}, ${user.id}, ${provider}, ${map.productId}, ${module}, ${contentId})`;
                    }
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

// --- PAYPAL USER API KEY SAVING & FETCHING ---
app.post('/api/save-paypal-keys', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    
    const { clientId, secretKey } = req.body;
    if (!clientId || !secretKey) return res.status(400).json({ error: "Missing Client ID or Secret Key" });

    try {
        const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials`
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error("Invalid PayPal Credentials.");

        await ensureSchema();
        const userId = parseInt(user.id);
        
        await sql`
            INSERT INTO bridge_settings (user_id, paypal_client_id, paypal_secret_key) 
            VALUES (${userId}, ${clientId}, ${secretKey}) 
            ON CONFLICT (user_id) 
            DO UPDATE SET paypal_client_id = EXCLUDED.paypal_client_id, paypal_secret_key = EXCLUDED.paypal_secret_key
        `;
        
        res.json({ success: true, accountId: clientId });
    } catch (e) {
        res.status(400).json({ error: e.message || "Failed to connect PayPal account." });
    }
});

app.post('/api/paypal/oauth/disconnect', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
        await ensureSchema();
        await sql`UPDATE bridge_settings SET paypal_client_id = NULL, paypal_secret_key = NULL WHERE user_id = ${parseInt(user.id)}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to disconnect account." }); }
});

app.post('/api/get-paypal-products', async (req, res) => {
    const user = await getAuthenticatedUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
        await ensureSchema();
        const settings = await sql`SELECT paypal_client_id, paypal_secret_key FROM bridge_settings WHERE user_id = ${parseInt(user.id)}`;
        if (!settings.length || !settings[0].paypal_client_id || !settings[0].paypal_secret_key) {
            return res.status(400).json({ error: "PayPal keys not found in database." });
        }

        const clientId = settings[0].paypal_client_id;
        const secretKey = settings[0].paypal_secret_key;

        const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials`
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error("Failed to authenticate PayPal API");

        const plansRes = await fetch('https://api-m.paypal.com/v1/billing/plans?page_size=50', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        const plansData = await plansRes.json();

        if (!plansRes.ok) {
            throw new Error(plansData.message || plansData.error_description || "Could not fetch plans.");
        }

        if (!plansData.plans || plansData.plans.length === 0) {
            return res.json({ products: [] });
        }

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
        mappings.forEach(m => { mappingsMap[m.productId] = m.communities || []; });
        
        const existingDb = await sql`SELECT email, tier, status FROM bridge_patreon_users`;
        const incomingMap = {};
        users.forEach(u => { if (mappingsMap[u.tier]) incomingMap[u.email] = u.tier; });

        let importCount = 0; let revokeCount = 0;
        for (const dbUser of existingDb) {
            if (dbUser.status === 'bridged' && !incomingMap[dbUser.email]) {
                const oldMappingComms = mappingsMap[dbUser.tier];
                if (oldMappingComms && oldMappingComms.length > 0) {
                    const targetEmail = aliasesMap[dbUser.email] || dbUser.email;
                    for (const comm of oldMappingComms) {
                        const lastUnderscore = comm.lastIndexOf('_');
                        const module = comm.substring(0, lastUnderscore);
                        const id = comm.substring(lastUnderscore + 1);
                        await revokeCommunityAccess(targetEmail, module, id);
                    }
                }
                await sql`UPDATE bridge_patreon_users SET status = 'revoked' WHERE email = ${dbUser.email}`;
                revokeCount++;
                await new Promise(resolve => setTimeout(resolve, 250)); 
            }
        }
        for (const [email, tier] of Object.entries(incomingMap)) {
            const comms = mappingsMap[tier];
            const targetEmail = aliasesMap[email] || email;
            let allSuccess = true;
            
            if (comms && comms.length > 0) {
                for (const comm of comms) {
                    const lastUnderscore = comm.lastIndexOf('_');
                    const module = comm.substring(0, lastUnderscore);
                    const id = comm.substring(lastUnderscore + 1);
                    const result = await grantCommunityAccess(targetEmail, module, id);
                    if (!result.success) allSuccess = false;
                }
            }
            
            const newStatus = allSuccess ? 'bridged' : 'pending';
            await sql`INSERT INTO bridge_patreon_users (email, tier, status) VALUES (${email}, ${tier}, ${newStatus}) ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status`;
            if (allSuccess) importCount++;
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
        mappings.forEach(m => { mappingsMap[m.productId] = m.communities || []; });
        
        let importCount = 0; 
        for (const u of users) {
            const comms = mappingsMap[u.plan];
            if (comms && comms.length > 0) {
                const targetEmail = aliasesMap[u.email] || u.email;
                let allSuccess = true;
                
                for (const comm of comms) {
                    const lastUnderscore = comm.lastIndexOf('_');
                    const module = comm.substring(0, lastUnderscore);
                    const id = comm.substring(lastUnderscore + 1);
                    const result = await grantCommunityAccess(targetEmail, module, id);
                    if (!result.success) allSuccess = false;
                }
                
                const newStatus = allSuccess ? 'bridged' : 'pending';
                const dummyStripeId = `pp_csv_${crypto.randomBytes(8).toString('hex')}`;
                
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${dummyStripeId}, ${u.email}, ${newStatus}) ON CONFLICT (stripe_customer_id) DO NOTHING`;
                
                if (allSuccess) importCount++;
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
        
        // Group mappings by product ID
        const mappingRows = await sql`SELECT stripe_product_id, una_module, una_content_id FROM bridge_mappings WHERE user_id = ${user.id} AND provider = 'stripe'`;
        const mappingsMap = {};
        mappingRows.forEach(row => {
            if (!mappingsMap[row.stripe_product_id]) mappingsMap[row.stripe_product_id] = [];
            mappingsMap[row.stripe_product_id].push({ module: row.una_module, id: row.una_content_id });
        });
        
        const customersDb = await sql`SELECT email, bridge_status FROM bridge_customers`;
        const statusMap = {};
        customersDb.forEach(c => statusMap[c.email] = c.bridge_status);

        let syncCount = 0;
        let debugLogs = [];

        for await (const sub of stripe.subscriptions.list({ status: 'active', expand: ['data.customer'] }, { stripeAccount: accountId })) {
            const stripeProductId = sub.plan?.product || sub.items?.data[0]?.price?.product;
            const customerEmail = sub.customer?.email;
            
            const comms = mappingsMap[stripeProductId];
            if (stripeProductId && customerEmail && comms && comms.length > 0) {
                if (statusMap[customerEmail] === 'revoked') {
                    continue;
                }
                
                const targetEmail = aliasesMap[customerEmail] || customerEmail;
                
                let allSuccess = true;
                let failReasons = [];

                for (const c of comms) {
                    const result = await grantCommunityAccess(targetEmail, c.module, c.id);
                    if (!result.success) {
                        allSuccess = false;
                        failReasons.push(result.error || 'Server error');
                    }
                }
                
                if (!allSuccess) {
                    debugLogs.push(`Failed to sync ${targetEmail}: ${failReasons.join(' | ')}`);
                }
                
                const newStatus = allSuccess ? 'bridged' : 'pending';
                await sql`INSERT INTO bridge_customers (stripe_customer_id, email, bridge_status) VALUES (${sub.customer.id}, ${customerEmail}, ${newStatus}) ON CONFLICT (stripe_customer_id) DO UPDATE SET email = ${customerEmail}, bridge_status = EXCLUDED.bridge_status`;
                
                if (allSuccess) {
                    syncCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        res.json({ success: true, count: syncCount, debug: debugLogs });
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
        
        let allSuccess = true;
        for (const row of mappingRows) {
            if (action === 'revoke') {
                await revokeCommunityAccess(targetEmail, row.una_module, row.una_content_id);
            } else {
                const result = await grantCommunityAccess(targetEmail, row.una_module, row.una_content_id);
                if (!result.success) allSuccess = false;
            }
        }
        
        const newStatus = action === 'revoke' ? 'revoked' : (allSuccess ? 'bridged' : 'pending');
        await sql`UPDATE bridge_customers SET bridge_status = ${newStatus} WHERE email = ${email}`;
        
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
                    
                    let allSuccess = true;
                    for (const r of rows) {
                        const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        if (!result.success) allSuccess = false;
                    }
                    bridgeStatus = allSuccess ? 'bridged' : 'pending';
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
                    
                    let allSuccess = true;
                    for (const r of rows) {
                        const result = await grantCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        if (!result.success) allSuccess = false;
                    }
                    bridgeStatus = allSuccess ? 'bridged' : 'pending';
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
                        
                        for (const r of mapRows) {
                            await revokeCommunityAccess(targetEmail, r.una_module, r.una_content_id);
                        }
                        await sql`UPDATE bridge_customers SET bridge_status = 'pending' WHERE email = ${customerEmail}`;
                    }
                }
            }
        }
    } catch (error) { console.error('PayPal Webhook Error Processing:', error); }
    res.json({ received: true });
});

// ==========================================
// OAUTH PROVIDER ENDPOINTS
// ==========================================

app.post(['/api/oauth/approve', '/oauth/approve'], async (req, res) => {
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

app.post(['/api/oauth/token', '/oauth/token'], async (req, res) => {
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

app.post(['/api/wp/get-fields', '/wp/get-fields'], async (req, res) => {
    const { access_token, user } = req.body; 
    
    if (!access_token) {
        return res.status(200).json({ error: "Missing access token" });
    }

    try {
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid or expired access token. Please reconnect in settings." });

        const targetUser = user || rows[0].profile_link || '';

        const hubDomain = 'https://bridge.selloutcrowds.com';

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', targetUser);
        formData.append('domain', hubDomain);

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
            return res.json(json);
        } catch(e) {
            return res.status(200).json({ error: "UNA did not return valid JSON. Raw response: " + text.substring(0, 100) });
        }
    } catch (error) {
        console.error("WP Proxy get-fields error:", error);
        return res.status(200).json({ error: "Hub Server Error: " + error.message });
    }
});

app.post(['/api/wp/:action', '/wp/:action'], async (req, res) => {
    const { action } = req.params;
    const validActions = ['create-post', 'edit-post', 'delete-post'];
    if (!validActions.includes(action)) return res.status(400).json({ error: "Invalid proxy action" });

    const { access_token, user, data } = req.body;
    
    if (!access_token) {
        return res.status(200).json({ error: "Missing access token" });
    }
    
    try {
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid access token" });

        const targetUser = user || rows[0].profile_link || '';
        
        const hubDomain = 'https://bridge.selloutcrowds.com';

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', targetUser);
        formData.append('domain', hubDomain);

        if (data && typeof data === 'object') {
            for (const key in data) {
                formData.append(`data[${key}]`, data[key]);
            }
        }

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