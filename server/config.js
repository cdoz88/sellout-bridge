import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe'; 

export const sql = neon(process.env.DATABASE_URL);

export const UNA_BASE_URL = "https://studio.selloutcrowds.com";
export const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
export const UNA_CLIENT_ID = "yxxnxsihu2";
export const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

export const FSAN_ENDPOINT = `${UNA_BASE_URL}/m/fsan/wordpress/get-fields`;
export const FSAN_TOKEN = "j7PGMBb4nZylvLGVV0cgd7ZOvpCBJkDO"; 

export const TEAMMATE_PRICE_ID = 'price_1TTjNp6y5pIVcSscS0gENUM5';
export const METERED_PRICE_ID = 'price_1TTjNp6y5pIVcSscCLCUffP8';

export const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];

export async function ensureExpansionsSubscription(user, exactTeammateQuantity = null) {
    // ENTERPRISE BYPASS: Role 12 pays no metered fees.
    if (Number(user.role) === 12) {
        return { customerId: null, subscription: null };
    }

    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Platform Stripe key not set");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    let platformCustomerId = null;
    
    const settings = await sql`SELECT platform_customer_id FROM bridge_settings WHERE user_id = ${user.id}`;
    if (settings.length > 0 && settings[0].platform_customer_id) {
        platformCustomerId = settings[0].platform_customer_id;
    } else {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
            platformCustomerId = customers.data[0].id;
            await sql`UPDATE bridge_settings SET platform_customer_id = ${platformCustomerId} WHERE user_id = ${user.id}`;
        } else {
            throw new Error("No primary billing account found. Please ensure you have an active Una subscription first.");
        }
    }

    const subs = await stripe.subscriptions.list({ customer: platformCustomerId, status: 'active' });
    let expSub = subs.data.find(s => s.items.data.some(i => i.price.id === TEAMMATE_PRICE_ID || i.price.id === METERED_PRICE_ID));

    if (!expSub) {
        expSub = await stripe.subscriptions.create({
            customer: platformCustomerId,
            items: [
                { price: TEAMMATE_PRICE_ID, quantity: exactTeammateQuantity !== null ? exactTeammateQuantity : 0 },
                { price: METERED_PRICE_ID }
            ],
            payment_behavior: 'allow_incomplete' 
        });
    } else {
        if (exactTeammateQuantity !== null) {
            const teammateItem = expSub.items.data.find(i => i.price.id === TEAMMATE_PRICE_ID);
            if (teammateItem) {
                await stripe.subscriptionItems.update(teammateItem.id, { quantity: exactTeammateQuantity });
            } else {
                await stripe.subscriptionItems.create({
                    subscription: expSub.id,
                    price: TEAMMATE_PRICE_ID,
                    quantity: exactTeammateQuantity
                });
            }
        }
    }
    return { customerId: platformCustomerId, subscription: expSub };
}

export async function ensureSchema() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS bridge_customers (stripe_customer_id VARCHAR(255) PRIMARY KEY, email VARCHAR(255), bridge_status VARCHAR(50) DEFAULT 'pending')`;
        try { await sql`ALTER TABLE bridge_customers ADD COLUMN IF NOT EXISTS creator_id INTEGER`; } catch(e){}
        try { await sql`ALTER TABLE bridge_customers ADD COLUMN IF NOT EXISTS bridge_status VARCHAR(50) DEFAULT 'pending'`; } catch(e){}

        await sql`CREATE TABLE IF NOT EXISTS bridge_patreon_users (email VARCHAR(255) PRIMARY KEY, tier VARCHAR(255), status VARCHAR(50))`;
        try { await sql`ALTER TABLE bridge_patreon_users ADD COLUMN IF NOT EXISTS creator_id INTEGER`; } catch(e){}

        await sql`CREATE TABLE IF NOT EXISTS bridge_manual_users (id SERIAL PRIMARY KEY, user_id INTEGER, email VARCHAR(255), una_module VARCHAR(50), una_content_id INTEGER, status VARCHAR(50) DEFAULT 'bridged', UNIQUE(user_id, email, una_module, una_content_id))`; 
        try { await sql`ALTER TABLE bridge_manual_users ADD COLUMN IF NOT EXISTS is_free_teammate BOOLEAN DEFAULT FALSE`; } catch(e){}

        await sql`CREATE TABLE IF NOT EXISTS bridge_settings (user_id INTEGER PRIMARY KEY, stripe_account_id TEXT, paypal_client_id TEXT, paypal_secret_key TEXT)`;
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS creator_email VARCHAR(255)`; } catch(e){}
        try { await sql`ALTER TABLE bridge_settings ADD COLUMN IF NOT EXISTS platform_customer_id VARCHAR(255)`; } catch(e){}

        await sql`CREATE TABLE IF NOT EXISTS bridge_business_cards (user_id INTEGER PRIMARY KEY, card_data JSONB)`;
        try { await sql`ALTER TABLE bridge_business_cards ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_bio_pages (user_id INTEGER PRIMARY KEY, page_data JSONB)`;
        try { await sql`ALTER TABLE bridge_bio_pages ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(255) UNIQUE`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS wp_oauth_codes (code VARCHAR(255) PRIMARY KEY, user_id INTEGER, profile_link TEXT, redirect_uri TEXT, expires_at TIMESTAMP)`;
        await sql`CREATE TABLE IF NOT EXISTS wp_access_tokens (token VARCHAR(255) PRIMARY KEY, user_id INTEGER, profile_link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
        
        try { await sql`ALTER TABLE wp_oauth_codes ADD COLUMN IF NOT EXISTS profile_link TEXT`; } catch(e){}
        try { await sql`ALTER TABLE wp_access_tokens ADD COLUMN IF NOT EXISTS profile_link TEXT`; } catch(e){}
        
        try { await sql`CREATE TABLE IF NOT EXISTS bridge_email_aliases (id SERIAL PRIMARY KEY, user_id INTEGER, original_email VARCHAR(255), alias_email VARCHAR(255), UNIQUE(user_id, original_email))`; } catch(e) {}
        try { await sql`CREATE TABLE IF NOT EXISTS bridge_team_seats (id SERIAL PRIMARY KEY, owner_id INTEGER, teammate_email VARCHAR(255), status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(owner_id, teammate_email))`; } catch(e) {}

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

        try {
            await sql`CREATE TABLE IF NOT EXISTS bridge_onboarding_steps (id SERIAL PRIMARY KEY, title VARCHAR(255), description TEXT, action_url TEXT, order_index INTEGER DEFAULT 0)`;
            await sql`CREATE TABLE IF NOT EXISTS bridge_user_progress (user_id INTEGER, step_id INTEGER, completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, step_id))`;
            try { await sql`ALTER TABLE bridge_onboarding_steps ADD COLUMN IF NOT EXISTS action_text VARCHAR(255)`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_onboarding_steps ADD COLUMN IF NOT EXISTS action_url_2 TEXT`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_onboarding_steps ADD COLUMN IF NOT EXISTS action_text_2 VARCHAR(255)`; } catch(e) {}
            try { await sql`ALTER TABLE bridge_onboarding_steps ADD COLUMN IF NOT EXISTS allowed_roles TEXT`; } catch(e) {}
        } catch(e) {}

        try { await sql`CREATE TABLE IF NOT EXISTS bridge_address_book (id SERIAL PRIMARY KEY, user_id INTEGER, name VARCHAR(255), title VARCHAR(255), company VARCHAR(255), phone VARCHAR(255), email VARCHAR(255), website VARCHAR(255), notes TEXT, photo TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`; } catch(e) {}

        await sql`CREATE TABLE IF NOT EXISTS bridge_mappings (id SERIAL PRIMARY KEY, user_id INTEGER, creator_id INTEGER, provider VARCHAR(50), stripe_product_id VARCHAR(255), una_module VARCHAR(50), una_content_id INTEGER)`;
        
        try { await sql`CREATE TABLE IF NOT EXISTS bridge_custom_domains (user_id INTEGER PRIMARY KEY, subdomain VARCHAR(255) UNIQUE, target_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`; } catch(e) {}

    } catch (e) { console.error("Schema check notice:", e.message); }
}

export async function getAuthenticatedUser(token) {
    if (!token) return null;
    try {
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, { headers: { 'Authorization': token } });
        if (meRes.status === 401 || meRes.status === 403) return null; 
        if (!meRes.ok) throw new Error(`UNA Server Hiccup: ${meRes.status}`);

        const meData = await meRes.json();
        if (meData && meData.id) {
            try {
                if (meData.email) {
                    const url = `${UNA_BASE_URL}/bridge-connector.php`;
                    const roleRes = await fetch(url, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
                        body: JSON.stringify({ email: meData.email, action: 'get_role' }) 
                    });
                    if (roleRes.ok) {
                        const roleData = await roleRes.json();
                        if (roleData && roleData.success && roleData.role) meData.role = roleData.role; 
                    }
                    await sql`INSERT INTO bridge_settings (user_id, creator_email) VALUES (${meData.id}, ${meData.email}) ON CONFLICT (user_id) DO UPDATE SET creator_email = EXCLUDED.creator_email`;
                }
            } catch (err) { console.error("Failed to fetch custom role", err); }
            return meData;
        }
        return null;
    } catch (e) { throw e; }
}

export async function grantCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, module: module, action: 'add' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}

export async function revokeCommunityAccess(email, module, contentId) {
    try {
        const url = `${UNA_BASE_URL}/bridge-connector.php`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: email, space_id: contentId, module: module, action: 'remove' }) });
        const responseText = await response.text();
        try { return JSON.parse(responseText); } catch (e) { return { error: responseText }; }
    } catch (err) { return { error: err.message }; }
}