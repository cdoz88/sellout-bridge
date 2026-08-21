import express from 'express';
import { sql, ensureSchema, getAuthenticatedUser, ADMIN_EMAILS } from '../config.js';

const router = express.Router();

// --- WORKSPACE ENGINE ---
// Intercepts the user ID and swaps it for the Boss's ID if they are a teammate
const getWorkspaceId = async (user) => {
    if (Number(user.role) === 18 && user.email) {
        const seatRows = await sql`SELECT owner_id FROM bridge_team_seats WHERE teammate_email = ${user.email.trim().toLowerCase()}`;
        if (seatRows.length > 0) return seatRows[0].owner_id;
    }
    return user.id;
};

router.get('/api/get-card', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const workspaceId = await getWorkspaceId(user);
        const rows = await sql`SELECT card_data, custom_slug FROM bridge_business_cards WHERE user_id = ${workspaceId}`;
        res.json(rows.length > 0 ? { card: rows[0].card_data, slug: rows[0].custom_slug || '' } : { card: null, slug: '' });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/save-card', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { card, slug } = req.body;
        await ensureSchema();
        
        const workspaceId = await getWorkspaceId(user);
        
        if (slug) {
            const slugCheck = await sql`SELECT user_id FROM bridge_business_cards WHERE custom_slug = ${slug} AND user_id != ${workspaceId}`;
            if (slugCheck.length > 0) return res.status(400).json({ error: "Custom URL taken." });
        }
        await sql`INSERT INTO bridge_business_cards (user_id, card_data, custom_slug) VALUES (${workspaceId}, ${card}, ${slug}) ON CONFLICT (user_id) DO UPDATE SET card_data = EXCLUDED.card_data, custom_slug = EXCLUDED.custom_slug`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/public-card/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const rows = await sql`SELECT card_data FROM bridge_business_cards WHERE custom_slug = ${req.params.slug}`;
        if (rows.length > 0) res.json({ success: true, card: rows[0].card_data });
        else res.status(404).json({ error: "Not found" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.get('/api/get-bio-page', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const workspaceId = await getWorkspaceId(user);
        const rows = await sql`SELECT page_data, custom_slug FROM bridge_bio_pages WHERE user_id = ${workspaceId}`;
        res.json(rows.length > 0 ? { page: rows[0].page_data, slug: rows[0].custom_slug || '' } : { page: null, slug: '' });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/save-bio-page', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { page, slug } = req.body;
        await ensureSchema();
        
        const workspaceId = await getWorkspaceId(user);

        if (slug) {
            const slugCheck = await sql`SELECT user_id FROM bridge_bio_pages WHERE custom_slug = ${slug} AND user_id != ${workspaceId}`;
            if (slugCheck.length > 0) return res.status(400).json({ error: "Custom URL taken." });
        }
        await sql`INSERT INTO bridge_bio_pages (user_id, page_data, custom_slug) VALUES (${workspaceId}, ${page}, ${slug}) ON CONFLICT (user_id) DO UPDATE SET page_data = EXCLUDED.page_data, custom_slug = EXCLUDED.custom_slug`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/public-bio-page/:slug', async (req, res) => {
    try {
        await ensureSchema();
        const rows = await sql`SELECT page_data FROM bridge_bio_pages WHERE custom_slug = ${req.params.slug}`;
        if (rows.length > 0) res.json({ success: true, page: rows[0].page_data });
        else res.status(404).json({ error: "Not found" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.post('/api/public/contact-submit', async (req, res) => {
    try {
        const { slug, contact } = req.body;
        if (!slug || !contact || !contact.name) return res.status(400).json({ error: "Missing required fields" });
        await ensureSchema();
        const cardRows = await sql`SELECT user_id FROM bridge_business_cards WHERE custom_slug = ${slug}`;
        if (cardRows.length === 0) return res.status(404).json({ error: "Card not found" });
        await sql`INSERT INTO bridge_address_book (user_id, name, title, company, phone, email, website, notes, photo) VALUES (${cardRows[0].user_id}, ${contact.name}, ${contact.title || ''}, ${contact.company || ''}, ${contact.phone || ''}, ${contact.email || ''}, ${contact.website || ''}, ${contact.notes || ''}, ${contact.photo || ''})`;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/contacts', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();

        const workspaceId = await getWorkspaceId(user);
        const rows = await sql`SELECT * FROM bridge_address_book WHERE user_id = ${workspaceId} ORDER BY created_at DESC`;
        res.json({ contacts: rows });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/contacts', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { id, name, title, company, phone, email, website, notes, photo } = req.body;
        await ensureSchema();

        const workspaceId = await getWorkspaceId(user);

        if (id) {
            await sql`UPDATE bridge_address_book SET name=${name}, title=${title}, company=${company}, phone=${phone}, email=${email}, website=${website}, notes=${notes}, photo=${photo} WHERE id=${id} AND user_id=${workspaceId}`;
        } else {
            await sql`INSERT INTO bridge_address_book (user_id, name, title, company, phone, email, website, notes, photo) VALUES (${workspaceId}, ${name}, ${title}, ${company}, ${phone}, ${email}, ${website}, ${notes}, ${photo})`;
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.post('/api/contacts/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const workspaceId = await getWorkspaceId(user);
        await sql`DELETE FROM bridge_address_book WHERE id=${req.body.id} AND user_id=${workspaceId}`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/guides/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        let categories = await sql`SELECT * FROM bridge_guide_categories ORDER BY order_index ASC, id ASC`;
        if (!isAdmin) categories = categories.filter(c => !c.is_hidden);
        const guides = await sql`SELECT * FROM bridge_guides ORDER BY order_index ASC, id DESC`;
        res.json({ categories, guides });
    } catch (e) { res.status(500).json({error: e.message}); }
});

router.post('/api/guides/categories/bulk', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        if (Array.isArray(req.body.categories)) {
            for (let i = 0; i < req.body.categories.length; i++) {
                const cat = req.body.categories[i];
                const isHiddenBool = cat.is_hidden === true || cat.is_hidden === 'true';
                if (cat.id && !cat.id.toString().startsWith('temp_')) {
                    await sql`UPDATE bridge_guide_categories SET name = ${cat.name}, is_hidden = ${isHiddenBool}, order_index = ${i} WHERE id = ${cat.id}`;
                } else {
                    await sql`INSERT INTO bridge_guide_categories (name, is_hidden, order_index) VALUES (${cat.name}, ${isHiddenBool}, ${i})`;
                }
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/guides/categories/delete', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`DELETE FROM bridge_guide_categories WHERE id = ${req.body.id}`;
        await sql`DELETE FROM bridge_guides WHERE category_id = ${req.body.id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/guides', async (req, res) => {
    try {
        const { id, category_id, title, type, content } = req.body;
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        if (id) await sql`UPDATE bridge_guides SET category_id = ${category_id}, title = ${title}, type = ${type}, content = ${content} WHERE id = ${id}`;
        else await sql`INSERT INTO bridge_guides (category_id, title, type, content) VALUES (${category_id}, ${title}, ${type}, ${content})`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/guides/delete', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`DELETE FROM bridge_guides WHERE id = ${req.body.id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/guides/bulk-order', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        if (Array.isArray(req.body.guides)) {
            for (let i = 0; i < req.body.guides.length; i++) {
                await sql`UPDATE bridge_guides SET order_index = ${i} WHERE id = ${req.body.guides[i].id}`;
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/api/assets/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        let categories = await sql`SELECT * FROM bridge_asset_categories ORDER BY order_index ASC, id ASC`;
        if (!isAdmin) categories = categories.filter(c => !c.is_hidden);
        const assets = await sql`SELECT * FROM bridge_assets ORDER BY id DESC`;
        res.json({ categories, assets });
    } catch (e) { res.status(500).json({error: e.message}); }
});

router.post('/api/assets/categories/bulk', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        if (Array.isArray(req.body.categories)) {
            for (let i = 0; i < req.body.categories.length; i++) {
                const cat = req.body.categories[i];
                const isHiddenBool = cat.is_hidden === true || cat.is_hidden === 'true';
                if (cat.id && !cat.id.toString().startsWith('temp_')) {
                    await sql`UPDATE bridge_asset_categories SET name = ${cat.name}, is_hidden = ${isHiddenBool}, order_index = ${i} WHERE id = ${cat.id}`;
                } else {
                    await sql`INSERT INTO bridge_asset_categories (name, is_hidden, order_index) VALUES (${cat.name}, ${isHiddenBool}, ${i})`;
                }
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/assets/categories/delete', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`DELETE FROM bridge_asset_categories WHERE id = ${req.body.id}`;
        await sql`DELETE FROM bridge_assets WHERE category_id = ${req.body.id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/assets', async (req, res) => {
    try {
        const { category_id, title, file_url } = req.body;
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`INSERT INTO bridge_assets (category_id, title, file_url) VALUES (${category_id}, ${title}, ${file_url})`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/assets/delete', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`DELETE FROM bridge_assets WHERE id = ${req.body.id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/api/onboarding/data', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        const steps = await sql`SELECT * FROM bridge_onboarding_steps ORDER BY order_index ASC, id ASC`;
        const progressRows = await sql`SELECT step_id FROM bridge_user_progress WHERE user_id = ${user.id}`;
        res.json({ steps, completedStepIds: progressRows.map(r => r.step_id) });
    } catch (e) { res.status(500).json({error: e.message}); }
});

router.post('/api/onboarding/steps/bulk', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        if (Array.isArray(req.body.steps)) {
            for (let i = 0; i < req.body.steps.length; i++) {
                const step = req.body.steps[i];
                const allowedRoles = Array.isArray(step.allowed_roles) ? JSON.stringify(step.allowed_roles) : null;
                if (step.id && !step.id.toString().startsWith('temp_')) {
                    await sql`UPDATE bridge_onboarding_steps SET title = ${step.title}, description = ${step.description}, action_url = ${step.action_url}, action_text = ${step.action_text || null}, action_url_2 = ${step.action_url_2 || null}, action_text_2 = ${step.action_text_2 || null}, allowed_roles = ${allowedRoles}, order_index = ${i} WHERE id = ${step.id}`;
                } else {
                    await sql`INSERT INTO bridge_onboarding_steps (title, description, action_url, action_text, action_url_2, action_text_2, allowed_roles, order_index) VALUES (${step.title}, ${step.description}, ${step.action_url}, ${step.action_text || null}, ${step.action_url_2 || null}, ${step.action_text_2 || null}, ${allowedRoles}, ${i})`;
                }
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/onboarding/steps/delete', async (req, res) => {
    try {
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(401).json({ error: "Unauthorized" });
        await sql`DELETE FROM bridge_onboarding_steps WHERE id = ${req.body.id}`;
        await sql`DELETE FROM bridge_user_progress WHERE step_id = ${req.body.id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/api/onboarding/progress', async (req, res) => {
    try {
        const { step_id, completed } = req.body;
        await ensureSchema();
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (completed) await sql`INSERT INTO bridge_user_progress (user_id, step_id) VALUES (${user.id}, ${step_id}) ON CONFLICT DO NOTHING`;
        else await sql`DELETE FROM bridge_user_progress WHERE user_id = ${user.id} AND step_id = ${step_id}`;
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/api/proxy-image', async (req, res) => {
    try {
        if (!req.query.url) return res.status(400).send('No URL');
        const response = await fetch(req.query.url);
        if (!response.ok) throw new Error('Fetch failed');
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(buffer));
    } catch (error) { res.status(500).send('Error'); }
});

export default router;