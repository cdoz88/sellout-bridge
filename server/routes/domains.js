import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema } from '../config.js';

const router = express.Router();

// PUBLIC ROUTE: App.jsx calls this to instantly find the redirect URL
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

// AUTH ROUTE: Save their subdomain and programmatically add it to Vercel
router.post('/api/save-domain', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        let { subdomain, target_url } = req.body;
        if (!subdomain || !target_url) return res.status(400).json({ error: "Missing fields" });

        // Clean the inputs
        subdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().trim();
        if (!target_url.startsWith('http')) target_url = `https://${target_url}`;

        // Make sure we have the Vercel credentials
        if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            return res.status(500).json({ error: "Vercel API tokens are not configured." });
        }

        await ensureSchema();

        // 1. Check if someone else already took this subdomain
        const existing = await sql`SELECT user_id FROM bridge_custom_domains WHERE subdomain = ${subdomain} AND user_id != ${user.id}`;
        if (existing.length > 0) return res.status(400).json({ error: "That subdomain is already taken. Please choose another." });

        // 2. Fetch their old domain (so we can delete it from Vercel if they are changing it)
        const oldDomainRow = await sql`SELECT subdomain FROM bridge_custom_domains WHERE user_id = ${user.id}`;
        const oldSubdomain = oldDomainRow.length > 0 ? oldDomainRow[0].subdomain : null;

        // 3. Remove the old domain from Vercel if they changed their mind
        if (oldSubdomain && oldSubdomain !== subdomain) {
            try {
                await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${oldSubdomain}.selloutcrowds.com`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}` }
                });
            } catch(e) { console.error("Failed to remove old Vercel domain:", e); }
        }

        // 4. Add the new domain to Vercel via API
        const vercelRes = await fetch(`https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: `${subdomain}.selloutcrowds.com` })
        });
        
        const vercelData = await vercelRes.json();
        
        // If there is an error (and it's not just "domain already exists on this project")
        if (vercelData.error && vercelData.error.code !== 'domain_already_in_use') {
             return res.status(400).json({ error: `Vercel Setup Error: ${vercelData.error.message}` });
        }

        // 5. Save everything into our Database
        await sql`
            INSERT INTO bridge_custom_domains (user_id, subdomain, target_url) 
            VALUES (${user.id}, ${subdomain}, ${target_url}) 
            ON CONFLICT (user_id) 
            DO UPDATE SET subdomain = EXCLUDED.subdomain, target_url = EXCLUDED.target_url
        `;
        
        res.json({ success: true });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to save domain" }); 
    }
});

export default router;