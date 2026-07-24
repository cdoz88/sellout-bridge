import express from 'express';
import crypto from 'crypto';
import { sql, getAuthenticatedUser, UNA_BASE_URL, UNA_SECRET, UNA_CLIENT_ID, UNA_CLIENT_SECRET, FSAN_ENDPOINT, FSAN_TOKEN } from '../config.js';

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

router.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) return res.status(400).json({ error: "No refresh token provided" });

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', UNA_CLIENT_ID);
        params.append('client_secret', UNA_CLIENT_SECRET);
        params.append('refresh_token', refresh_token);
        
        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
        const data = await response.json();
        
        if (data.error) return res.status(400).json(data);
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Server error during token refresh" }); }
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
        formData.append('domain', 'https://office.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        const text = await fsanRes.text();
        let parsedData = null;
        try { parsedData = JSON.parse(text); } catch (e) { return res.json({ crowds: [], spaces: [] }); }
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) return res.json({ crowds: [], spaces: [] });

        let ownedSpaces = [];
        let ownedGroups = [];
        try {
            if (meData.email) {
                // FIX: Use UNA_BASE_URL to prevent payload stripping
                const ownedRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: meData.email, action: 'get_owned_profile_ids', secret: UNA_SECRET }) 
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

        const role = Number(user.role);
        if ([1, 2, 15, 18].includes(role)) {
            return res.status(403).json({ error: "Your current plan does not support WordPress integration. Please upgrade to All-Star or Enterprise." });
        }

        const { client_id, redirect_uri } = req.body;
        
        if (client_id !== 'wordpress_global_app') {
            return res.status(400).json({ error: "Invalid client_id" });
        }
        
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

router.post(['/api/oauth/token', '/oauth/token'], async (req, res) => {
    try {
        const { grant_type, client_id, code, redirect_uri } = req.body;

        if (grant_type !== 'authorization_code' || client_id !== 'wordpress_global_app') {
            return res.status(400).json({ error: "invalid_request" });
        }

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

        try {
            const wpDomain = new URL(authCode.redirect_uri).hostname.replace(/^www\./, '');
            // FIX: Use UNA_BASE_URL to prevent the POST payload from being stripped
            const regRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                body: JSON.stringify({ 
                    action: 'register_wp_token', 
                    user: authCode.profile_link, 
                    domain: wpDomain, 
                    token: accessToken, 
                    secret: UNA_SECRET 
                })
            });
            const regData = await regRes.json();
            if (!regData.success) {
                console.error("UNA Registration Failed:", regData.error);
            }
        } catch (regErr) {
            console.error("Failed to register token with UNA:", regErr);
        }

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

router.post(['/api/wp/revoke-token', '/wp/revoke-token'], async (req, res) => {
    try {
        const { token, secret } = req.body;
        if (secret !== UNA_SECRET) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (token) {
            await sql`DELETE FROM wp_access_tokens WHERE token = ${token}`;
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Token revocation error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post(['/api/wp/get-fields', '/wp/get-fields'], async (req, res) => {
    try {
        const { access_token, user, domain } = req.body; 
        
        if (!access_token) {
            return res.status(200).json({ error: "Missing access token" });
        }

        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid or expired access token. Please reconnect in settings." });

        const targetUser = user || rows[0].profile_link || '';

        const formData = new URLSearchParams();
        formData.append('api_key', access_token);
        formData.append('user', targetUser);
        formData.append('domain', domain || '');

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

            if (fsanRes.status === 404 || (json.code === 1 && json.msg === 'Access Denied!')) {
                await sql`DELETE FROM wp_access_tokens WHERE token = ${access_token}`;
                return res.status(200).json({ error: "Invalid or expired access token" }); 
            }

            try {
                // FIX: Use UNA_BASE_URL to prevent payload stripping
                const connectorRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${UNA_SECRET}` 
                    },
                    body: JSON.stringify({ user: targetUser, action: 'get_owned_profile_ids', secret: UNA_SECRET })
                });
                const connectorData = await connectorRes.json();

                if (connectorData.success && json?.allow_view_to?.values && Array.isArray(json.allow_view_to.values)) {
                    const ownedIds = new Set([
                        ...(connectorData.owned_spaces || []).map(id => id.toString()),
                        ...(connectorData.owned_groups || []).map(id => id.toString())
                    ]);

                    json.allow_view_to.values = json.allow_view_to.values.filter(item => {
                        if (item.type === 'group_header' || item.type === 'group_end') return true;
                        if (item.key === undefined || item.key === null) return true;

                        const profileId = Math.abs(parseInt(item.key, 10)).toString();
                        return ownedIds.has(profileId);
                    });
                }
            } catch (filterErr) {
                console.error("Failed to filter owned communities:", filterErr);
            }

            return res.json(json);
        } catch(e) {
            return res.status(200).json({ error: "UNA did not return valid JSON. Raw response: " + text.substring(0, 100) });
        }
    } catch (error) {
        console.error("WP Proxy get-fields error:", error);
        return res.status(200).json({ error: "Hub Server Error: " + error.message });
    }
});

router.post(['/api/wp/:action', '/wp/:action'], async (req, res) => {
    try {
        const { action } = req.params;
        const validActions = ['create-post', 'edit-post', 'delete-post'];
        if (!validActions.includes(action)) return res.status(400).json({ error: "Invalid proxy action" });

        const { access_token, user, data, domain } = req.body;
        
        if (!access_token) {
            return res.status(200).json({ error: "Missing access token" });
        }
        
        const rows = await sql`SELECT profile_link FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid access token" });

        const targetUser = user || rows[0].profile_link || '';

        const formData = new URLSearchParams();
        formData.append('api_key', access_token);
        formData.append('user', targetUser);
        formData.append('domain', domain || '');

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

            if (fsanRes.status === 404 || (json.code === 1 && json.msg === 'Access Denied!')) {
                await sql`DELETE FROM wp_access_tokens WHERE token = ${access_token}`;
                return res.status(200).json({ error: "Invalid or expired access token" }); 
            }

            return res.json(json);
        } catch(e) {
            return res.status(200).json({ error: "UNA did not return JSON. Raw: " + text.substring(0, 100) });
        }
    } catch (error) {
        console.error(`WP Proxy ${action} error:`, error);
        return res.status(200).json({ error: "Hub Server Error: " + error.message });
    }
});

export default router;