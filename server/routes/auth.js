import express from 'express';
import crypto from 'crypto';
import { sql, ensureSchema, getAuthenticatedUser, UNA_BASE_URL, UNA_CLIENT_ID, UNA_CLIENT_SECRET, FSAN_ENDPOINT, FSAN_TOKEN } from '../config.js';

const router = express.Router();

router.post('/api/auth/callback', async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', UNA_CLIENT_ID);
        params.append('client_secret', UNA_CLIENT_SECRET);
        params.append('code', req.body.code);
        params.append('redirect_uri', req.body.redirect_uri); 
        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
        const data = await response.json();
        if (data.error) return res.status(400).json(data);
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.get('/api/get-user', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        res.json({ user });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

router.get('/api/get-communities', async (req, res) => {
    try {
        const meData = await getAuthenticatedUser(req.headers.authorization);
        if (!meData || !meData.profile_link) return res.status(401).json({ error: "Invalid session" });
        
        let userProfileUrl = meData.profile_link.replace('https://studio.', 'https://www.');
        if (!userProfileUrl.includes('www.')) userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com');
        
        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN); 
        formData.append('user', userProfileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        const text = await fsanRes.text();
        let parsedData = null;
        try { parsedData = JSON.parse(text); } catch (e) { return res.json({ crowds: [], spaces: [] }); }
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) return res.json({ crowds: [], spaces: [] });

        let ownedSpaces = [];
        let ownedGroups = [];
        try {
            if (meData.email) {
                const ownedRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: meData.email, action: 'get_owned_profile_ids' }) 
                });
                const ownedData = await ownedRes.json();
                if (ownedData.success) { ownedSpaces = ownedData.owned_spaces || []; ownedGroups = ownedData.owned_groups || []; }
            }
        } catch (e) {}

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
                if (currentCategory === 'CROWD' && ownedSpaces.includes(numId)) crowds.push({ id: trueId, title: item.value });
                else if (currentCategory === 'SPACE' && ownedGroups.includes(numId)) spaces.push({ id: trueId, title: item.value });
            }
        });
        res.json({ crowds, spaces });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.post(['/api/oauth/approve', '/oauth/approve'], async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if ([1, 2, 15, 18].includes(Number(user.role))) return res.status(403).json({ error: "Upgrade required." });
        if (req.body.client_id !== 'wordpress_global_app') return res.status(400).json({ error: "Invalid client_id" });

        await ensureSchema();
        const code = crypto.randomBytes(16).toString('hex');
        await sql`INSERT INTO wp_oauth_codes (code, user_id, profile_link, redirect_uri, expires_at) VALUES (${code}, ${user.id}, ${user.url || user.profile_link || ''}, ${req.body.redirect_uri}, ${new Date(Date.now() + 5 * 60000).toISOString()})`;
        res.json({ success: true, code });
    } catch (error) { res.status(500).json({ error: "Server error" }); }
});

router.post(['/api/oauth/token', '/oauth/token'], async (req, res) => {
    try {
        const { grant_type, client_id, code, redirect_uri } = req.body;
        if (grant_type !== 'authorization_code' || client_id !== 'wordpress_global_app') return res.status(400).json({ error: "invalid_request" });

        await ensureSchema();
        const rows = await sql`SELECT user_id, profile_link, redirect_uri, expires_at FROM wp_oauth_codes WHERE code = ${code}`;
        if (rows.length === 0) return res.status(400).json({ error: "invalid_grant" });

        if (new Date() > new Date(rows[0].expires_at) || rows[0].redirect_uri !== redirect_uri) {
            await sql`DELETE FROM wp_oauth_codes WHERE code = ${code}`; 
            return res.status(400).json({ error: "invalid_grant" });
        }

        await sql`DELETE FROM wp_oauth_codes WHERE code = ${code}`;
        const accessToken = 'sc_wp_' + crypto.randomBytes(24).toString('hex');
        await sql`INSERT INTO wp_access_tokens (token, user_id, profile_link) VALUES (${accessToken}, ${rows[0].user_id}, ${rows[0].profile_link})`;
        res.json({ access_token: accessToken, token_type: "bearer", profile_url: rows[0].profile_link });
    } catch (error) { res.status(500).json({ error: "server_error" }); }
});

router.post(['/api/wp/get-fields', '/wp/get-fields'], async (req, res) => {
    try {
        if (!req.body.access_token) return res.status(200).json({ error: "Missing token" });
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${req.body.access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid token" });

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', req.body.user || rows[0].profile_link || '');
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, { method: 'POST', body: formData, headers: { 'User-Agent': 'UNA', 'Content-Type': 'application/x-www-form-urlencoded' } });
        const text = await fsanRes.text();
        try { return res.json(JSON.parse(text)); } catch(e) { return res.status(200).json({ error: "Parse error" }); }
    } catch (error) { return res.status(200).json({ error: error.message }); }
});

router.post(['/api/wp/:action', '/wp/:action'], async (req, res) => {
    try {
        if (!['create-post', 'edit-post', 'delete-post'].includes(req.params.action)) return res.status(400).json({ error: "Invalid action" });
        if (!req.body.access_token) return res.status(200).json({ error: "Missing token" });
        
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${req.body.access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid token" });

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', req.body.user || rows[0].profile_link || '');
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        if (req.body.data && typeof req.body.data === 'object') {
            for (const key in req.body.data) formData.append(`data[${key}]`, req.body.data[key]);
        }

        const fsanRes = await fetch(`${UNA_BASE_URL}/m/fsan/wordpress/${req.params.action}`, { method: 'POST', body: formData, headers: { 'User-Agent': 'UNA', 'Content-Type': 'application/x-www-form-urlencoded' } });
        const text = await fsanRes.text();
        try { return res.json(JSON.parse(text)); } catch(e) { return res.status(200).json({ error: "Parse error" }); }
    } catch (error) { return res.status(200).json({ error: error.message }); }
});

export default router;