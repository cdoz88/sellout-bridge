import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema } from '../config.js';

const router = express.Router();

const ensureLinksSchema = async () => {
    await ensureSchema();
    await sql`CREATE TABLE IF NOT EXISTS bridge_community_links (
        id SERIAL PRIMARY KEY, 
        user_id INTEGER, 
        subdomain VARCHAR(255) UNIQUE, 
        target_url TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
};

// PUBLIC ROUTE: App.jsx calls this to instantly find the redirect URL
router.get('/api/resolve-domain/:subdomain', async (req, res) => {
    try {
        const { subdomain } = req.params;
        await ensureLinksSchema();
        
        // NEW: We join with bridge_settings to pull their creator_email for the Smart Router
        let rows = await sql`
            SELECT c.target_url, s.creator_email 
            FROM bridge_community_links c
            LEFT JOIN bridge_settings s ON c.user_id = s.user_id
            WHERE c.subdomain = ${subdomain.toLowerCase()}
        `;
        
        if (rows.length === 0) {
            rows = await sql`
                SELECT c.target_url, s.creator_email 
                FROM bridge_custom_domains c
                LEFT JOIN bridge_settings s ON c.user_id = s.user_id
                WHERE c.subdomain = ${subdomain.toLowerCase()}
            `;
        }
        
        if (rows.length > 0 && rows[0].target_url) {
            res.json({ success: true, url: rows[0].target_url, email: rows[0].creator_email });
        } else {
            res.json({ success: false });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

// AUTH ROUTE: Get all of the user's saved domains
router.get('/api/get-domains', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureLinksSchema();
        
        const newRows = await sql`SELECT id, subdomain, target_url, created_at FROM bridge_community_links WHERE user_id = ${user.id}`;
        const legacyRows = await sql`SELECT user_id as id, subdomain, target_url, created_at FROM bridge_custom_domains WHERE user_id = ${user.id}`;
        
        const allDomains = [...newRows, ...legacyRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({ domains: allDomains });
    } catch (error) { res.status(500).json({ error: "Failed to fetch domains" }); }
});

// AUTH ROUTE: Save a single subdomain with Limits
router.post('/api/save-domain', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        let { subdomain, target_url } = req.body;
        if (!subdomain || !target_url) return res.status(400).json({ error: "Missing fields" });

        subdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().trim();
        if (!target_url.startsWith('http')) target_url = `https://${target_url}`;

        await ensureLinksSchema();

        const role = Number(user.role);
        const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
        const isAdmin = role === 3 || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
        
        let maxLinks = 0;
        if (isAdmin) maxLinks = Infinity;
        else if (role === 17) maxLinks = 3;
        else if (role === 16 || role === 12) maxLinks = 1;

        if (maxLinks !== Infinity) {
            const currentNew = await sql`SELECT count(*) FROM bridge_community_links WHERE user_id = ${user.id}`;
            const currentOld = await sql`SELECT count(*) FROM bridge_custom_domains WHERE user_id = ${user.id}`;
            const totalCount = parseInt(currentNew[0].count) + parseInt(currentOld[0].count);
            
            if (totalCount >= maxLinks) {
                return res.status(403).json({ error: `You have reached your limit of ${maxLinks} custom link${maxLinks === 1 ? '' : 's'}. Please delete an existing link to create a new one.` });
            }
        }

        const existNew = await sql`SELECT id FROM bridge_community_links WHERE subdomain = ${subdomain}`;
        const existOld = await sql`SELECT user_id FROM bridge_custom_domains WHERE subdomain = ${subdomain}`;
        
        if (existNew.length > 0 || existOld.length > 0) {
            return res.status(400).json({ error: "That subdomain is already taken. Please choose another." });
        }

        await sql`INSERT INTO bridge_community_links (user_id, subdomain, target_url) VALUES (${user.id}, ${subdomain}, ${target_url})`;
        
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: "Failed to save domain" }); 
    }
});

// AUTH ROUTE: Bulk Importer (ADMIN ONLY)
router.post('/api/save-domains-bulk', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const role = Number(user.role);
        const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
        const isAdmin = role === 3 || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
        
        if (!isAdmin) {
            return res.status(403).json({ error: "Only administrators can use the bulk automator." });
        }

        const { links } = req.body; 
        if (!links || !Array.isArray(links)) return res.status(400).json({ error: "Invalid data" });

        await ensureLinksSchema();

        let addedCount = 0;
        let skippedCount = 0;

        for (const link of links) {
            let sub = (link.subdomain || '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().trim();
            let target = (link.targetUrl || '').trim();
            
            if (!sub || !target) continue;
            if (!target.startsWith('http')) target = `https://${target}`;

            const existNew = await sql`SELECT id FROM bridge_community_links WHERE subdomain = ${sub}`;
            const existOld = await sql`SELECT user_id FROM bridge_custom_domains WHERE subdomain = ${sub}`;
            
            if (existNew.length > 0 || existOld.length > 0) {
                skippedCount++;
                continue;
            }

            await sql`INSERT INTO bridge_community_links (user_id, subdomain, target_url) VALUES (${user.id}, ${sub}, ${target})`;
            addedCount++;
        }
        
        res.json({ success: true, added: addedCount, skipped: skippedCount });
    } catch (error) { 
        res.status(500).json({ error: "Failed to process bulk import" }); 
    }
});

// AUTH ROUTE: Delete a subdomain
router.post('/api/delete-domain', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id, subdomain } = req.body;
        await ensureLinksSchema();
        
        await sql`DELETE FROM bridge_community_links WHERE user_id = ${user.id} AND subdomain = ${subdomain}`;
        await sql`DELETE FROM bridge_custom_domains WHERE user_id = ${user.id} AND subdomain = ${subdomain}`;
        
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: "Failed to delete domain" }); 
    }
});

export default router;