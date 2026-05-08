import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema } from '../config.js';

const router = express.Router();

// PUBLIC ROUTE: This is what App.jsx calls to instantly find the redirect URL
router.get('/api/resolve-domain/:subdomain', async (req, res) => {
    try {
        const { subdomain } = req.params;
        await ensureSchema();
        const rows = await sql`SELECT target_url FROM bridge_custom_domains WHERE subdomain = ${subdomain.toLowerCase()}`;
        
        if (rows.length > 0 && rows[0].target_url) {
            res.json({ success: true, url: rows[0].target_url });
        } else {
            res.json({ success: false });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

// AUTH ROUTE: Get the user's saved domain for the Builder UI
router.get('/api/get-domain', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        const rows = await sql`SELECT subdomain, target_url FROM bridge_custom_domains WHERE user_id = ${user.id}`;
        res.json({ domain: rows.length > 0 ? rows[0] : null });
    } catch (error) { res.status(500).json({ error: "Failed to fetch domain" }); }
});

// AUTH ROUTE: Save or update their subdomain
router.post('/api/save-domain', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        let { subdomain, target_url } = req.body;
        if (!subdomain || !target_url) return res.status(400).json({ error: "Missing fields" });

        // Clean the inputs
        subdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().trim();
        if (!target_url.startsWith('http')) target_url = `https://${target_url}`;

        // Check if someone else already took this subdomain
        const existing = await sql`SELECT user_id FROM bridge_custom_domains WHERE subdomain = ${subdomain} AND user_id != ${user.id}`;
        if (existing.length > 0) return res.status(400).json({ error: "That subdomain is already taken. Please choose another." });

        await sql`
            INSERT INTO bridge_custom_domains (user_id, subdomain, target_url) 
            VALUES (${user.id}, ${subdomain}, ${target_url}) 
            ON CONFLICT (user_id) 
            DO UPDATE SET subdomain = EXCLUDED.subdomain, target_url = EXCLUDED.target_url
        `;
        
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to save domain" }); }
});

export default router;