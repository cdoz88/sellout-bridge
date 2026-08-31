import express from 'express';
import crypto from 'crypto';
import { sql, ensureSchema, getAuthenticatedUser, UNA_BASE_URL, UNA_SECRET, UNA_CLIENT_ID, UNA_CLIENT_SECRET, FSAN_ENDPOINT, FSAN_TOKEN } from '../config.js';

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
        
        // --- OPTION A: THE UMBRELLA METHOD ---
        let targetEmail = meData.email;
        let targetProfileUrl = userProfileUrl;
        
        // Find if this user is mapped as a sub-account to a Brand Owner
        let ownerId = null;
        const manualRows = await sql`SELECT user_id FROM bridge_manual_users WHERE email = ${meData.email}`;
        if (manualRows.length > 0) ownerId = manualRows[0].user_id;
        
        if (!ownerId) {
            const customerRows = await sql`SELECT creator_id FROM bridge_customers WHERE email = ${meData.email}`;
            if (customerRows.length > 0) ownerId = customerRows[0].creator_id;
        }
        if (!ownerId) {
            const patreonRows = await sql`SELECT creator_id FROM bridge_patreon_users WHERE email = ${meData.email}`;
            if (patreonRows.length > 0) ownerId = patreonRows[0].creator_id;
        }
        if (!ownerId) {
            const aliasRows = await sql`SELECT user_id FROM bridge_email_aliases WHERE alias_email = ${meData.email}`;
            if (aliasRows.length > 0) ownerId = aliasRows[0].user_id;
        }

        // If a Master Owner was found, securely swap out the details!
        if (ownerId) {
            const settingsRows = await sql`SELECT creator_email FROM bridge_settings WHERE user_id = ${ownerId}`;
            if (settingsRows.length > 0 && settingsRows[0].creator_email) {
                targetEmail = settingsRows[0].creator_email;
            }
            
            // Try to find the Master Owner's profile link to pull their privacy fields
            const tokenRows = await sql`SELECT profile_link FROM wp_access_tokens WHERE user_id = ${ownerId} LIMIT 1`;
            if (tokenRows.length > 0 && tokenRows[0].profile_link) {
                targetProfileUrl = tokenRows[0].profile_link;
            } else {
                const postRows = await sql`SELECT profile_link FROM bridge_scheduled_posts WHERE user_id = ${ownerId} AND profile_link IS NOT NULL LIMIT 1`;
                if (postRows.length > 0 && postRows[0].profile_link) {
                    targetProfileUrl = postRows[0].profile_link;
                }
            }
        }
        // --- END UMBRELLA METHOD ---

        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN); 
        formData.append('user', targetProfileUrl); // Use target Profile URL
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        const text = await fsanRes.text();
        let parsedData = null;
        try { parsedData = JSON.parse(text); } catch (e) { return res.json({ crowds: [], spaces: [] }); }
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) return res.json({ crowds: [], spaces: [] });

        let ownedSpaces = [];
        let ownedGroups = [];
        try {
            if (targetEmail) { // Use Target Email
                const ownedRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, body: JSON.stringify({ email: targetEmail, action: 'get_owned_profile_ids' }) 
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

router.post(['/api/oauth/token', '/oauth/token'], async (req, res) => {
    try {
        const { grant_type, client_id, code, redirect_uri, domain } = req.body;

        if (grant_type !== 'authorization_code' || client_id !== 'wordpress_global_app') {
            return res.status(400).json({ error: "invalid_request" });
        }

        await ensureSchema();

        try {
            await sql`ALTER TABLE wp_access_tokens ADD COLUMN IF NOT EXISTS domain TEXT`;
        } catch (e) {}

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
            INSERT INTO wp_access_tokens (token, user_id, profile_link, domain) 
            VALUES (${accessToken}, ${authCode.user_id}, ${authCode.profile_link}, ${domain || ''})
        `;

        let userEmail = '';
        try {
            const userRows = await sql`SELECT email FROM users WHERE id = ${authCode.user_id}`;
            if (userRows.length > 0) userEmail = userRows[0].email;
        } catch(e) {}

        // --- BULLETPROOF TOKEN REGISTRATION TO UNA DATABASE ---
        if (domain) {
            try {
                await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${UNA_SECRET}` 
                    },
                    body: JSON.stringify({
                        action: 'register_wp_token',
                        email: userEmail,         
                        user: authCode.profile_link,
                        domain: domain,
                        token: accessToken,
                        secret: UNA_SECRET        
                    })
                });
            } catch (bridgeErr) {
                console.error("Failed to sync new WP token to UNA bridge:", bridgeErr);
            }
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

router.post(['/api/wp/get-fields', '/wp/get-fields'], async (req, res) => {
    try {
        const { access_token, user } = req.body; 
        
        if (!access_token) {
            return res.status(200).json({ error: "Missing access token" });
        }

        // Fetch the domain safely to pass to UNA
        const rows = await sql`SELECT user_id, profile_link, domain FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid or expired access token. Please reconnect in settings." });

        let targetUser = user || rows[0].profile_link || '';
        let targetEmail = '';

        // Retrieve the actual user's email to run through the Umbrella Method
        try {
            const userRows = await sql`SELECT email FROM users WHERE id = ${rows[0].user_id}`;
            if (userRows.length > 0) targetEmail = userRows[0].email;
        } catch (e) {}

        // --- OPTION A: UMBRELLA METHOD FOR WORDPRESS FIELDS ---
        if (targetEmail) {
            let ownerId = null;
            const manualRows = await sql`SELECT user_id FROM bridge_manual_users WHERE email = ${targetEmail}`;
            if (manualRows.length > 0) ownerId = manualRows[0].user_id;
            
            if (!ownerId) {
                const customerRows = await sql`SELECT creator_id FROM bridge_customers WHERE email = ${targetEmail}`;
                if (customerRows.length > 0) ownerId = customerRows[0].creator_id;
            }
            if (!ownerId) {
                const patreonRows = await sql`SELECT creator_id FROM bridge_patreon_users WHERE email = ${targetEmail}`;
                if (patreonRows.length > 0) ownerId = patreonRows[0].creator_id;
            }
            if (!ownerId) {
                const aliasRows = await sql`SELECT user_id FROM bridge_email_aliases WHERE alias_email = ${targetEmail}`;
                if (aliasRows.length > 0) ownerId = aliasRows[0].user_id;
            }

            if (ownerId) {
                const settingsRows = await sql`SELECT creator_email FROM bridge_settings WHERE user_id = ${ownerId}`;
                if (settingsRows.length > 0 && settingsRows[0].creator_email) {
                    targetEmail = settingsRows[0].creator_email;
                }
                
                const tokenRows = await sql`SELECT profile_link FROM wp_access_tokens WHERE user_id = ${ownerId} LIMIT 1`;
                if (tokenRows.length > 0 && tokenRows[0].profile_link) {
                    targetUser = tokenRows[0].profile_link;
                } else {
                    const postRows = await sql`SELECT profile_link FROM bridge_scheduled_posts WHERE user_id = ${ownerId} AND profile_link IS NOT NULL LIMIT 1`;
                    if (postRows.length > 0 && postRows[0].profile_link) {
                        targetUser = postRows[0].profile_link;
                    }
                }
            }
        }
        // --- END UMBRELLA METHOD ---

        // Force targetUser to perfectly match the UNA Base URL to prevent permalink crashes
        if (targetUser) {
            try {
                const parsedUrl = new URL(targetUser);
                targetUser = `${UNA_BASE_URL}${parsedUrl.pathname}`;
            } catch (e) {
                if (targetUser.startsWith('/')) targetUser = `${UNA_BASE_URL}${targetUser}`;
            }
        }

        // Pass the actual WordPress domain retrieved from the DB, fallback to request payload
        const actualDomain = rows[0].domain || req.body.domain || 'https://office.selloutcrowds.com';

        const formData = new URLSearchParams();
        formData.append('api_key', access_token); // Use specific oauth token, NOT the generic FSAN_TOKEN
        formData.append('user', targetUser);
        formData.append('domain', actualDomain); // Send the exact WordPress domain, NOT a generic hub URL

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

            // Translate UNA errors so the WordPress plugin catches them
            if (json.code === 1 && json.msg) {
                return res.status(200).json({ error: "UNA Server Error: " + json.msg });
            }

            try {
                const connectorRes = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${UNA_SECRET}` 
                    },
                    body: JSON.stringify({ user: targetUser, email: targetEmail, action: 'get_owned_profile_ids' }) // Passes targetEmail to bypass blocks!
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

// --- NEW UNIFIED DISCONNECT ROUTE ---
// MUST BE DEFINED ABOVE THE /api/wp/:action WILDCARD SO IT DOES NOT THROW "INVALID ACTION"
router.post(['/api/wp/disconnect', '/wp/disconnect'], async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) return res.status(400).json({ error: "Missing token" });

        // 1. Fetch domain to ping WordPress Webhook
        try {
            const rows = await sql`SELECT domain FROM wp_access_tokens WHERE token = ${access_token}`;
            if (rows.length > 0 && rows[0].domain) {
                let wpDomain = rows[0].domain;
                
                // CRITICAL FIX: Strip https:// so we don't accidentally create https://https://admin...
                wpDomain = wpDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
                
                const webhookPayload = {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access_token}`,
                        'User-Agent': 'SelloutCrowds-Bridge/1.0'
                    },
                    // Send the token in the body as a fallback for strict firewalls
                    body: JSON.stringify({ token: access_token })
                };

                // Fire-and-forget webhook to tell WordPress to wipe its own settings
                // Attempt HTTPS first, fallback to HTTP if it fails (useful for local/dev servers)
                fetch(`https://${wpDomain}/wp-json/soc/v1/remote-disconnect`, webhookPayload)
                    .catch(() => fetch(`http://${wpDomain}/wp-json/soc/v1/remote-disconnect`, webhookPayload))
                    .catch(e => console.error("WP Webhook failed:", e));
            }
        } catch (err) {
            console.error("Failed to lookup domain for webhook", err);
        }

        // 2. Delete the token locally on the Node Postgres database
        await sql`DELETE FROM wp_access_tokens WHERE token = ${access_token}`;

        // 3. Tell the UNA server to globally wipe the token
        const STUDIO_URL = 'https://studio.selloutcrowds.com/bridge-connector.php';
        await fetch(STUDIO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
            body: JSON.stringify({
                action: 'delete_wp_token_string',
                token_string: access_token,
                secret: UNA_SECRET
            })
        });

        res.json({ success: true });
    } catch (error) {
        console.error("WP Proxy disconnect error:", error);
        res.status(500).json({ error: "Failed to disconnect" });
    }
});

router.post(['/api/wp/:action', '/wp/:action'], async (req, res) => {
    try {
        const { action } = req.params;
        const validActions = ['create-post', 'edit-post', 'delete-post'];
        
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: "Invalid proxy action" });
        }

        const { access_token, user, data } = req.body;
        
        if (!access_token) {
            return res.status(200).json({ error: "Missing access token" });
        }
        
        const rows = await sql`SELECT user_id, profile_link, domain FROM wp_access_tokens WHERE token = ${access_token}`;
        if (rows.length === 0) return res.status(200).json({ error: "Invalid access token" });

        let targetUser = user || rows[0].profile_link || '';
        let targetEmail = '';

        // --- OPTION A: UMBRELLA METHOD FOR WORDPRESS ACTIONS ---
        try {
            const userRows = await sql`SELECT email FROM users WHERE id = ${rows[0].user_id}`;
            if (userRows.length > 0) targetEmail = userRows[0].email;
        } catch (e) {}

        if (targetEmail) {
            let ownerId = null;
            const manualRows = await sql`SELECT user_id FROM bridge_manual_users WHERE email = ${targetEmail}`;
            if (manualRows.length > 0) ownerId = manualRows[0].user_id;
            
            if (!ownerId) {
                const customerRows = await sql`SELECT creator_id FROM bridge_customers WHERE email = ${targetEmail}`;
                if (customerRows.length > 0) ownerId = customerRows[0].creator_id;
            }
            if (!ownerId) {
                const patreonRows = await sql`SELECT creator_id FROM bridge_patreon_users WHERE email = ${targetEmail}`;
                if (patreonRows.length > 0) ownerId = patreonRows[0].creator_id;
            }
            if (!ownerId) {
                const aliasRows = await sql`SELECT user_id FROM bridge_email_aliases WHERE alias_email = ${targetEmail}`;
                if (aliasRows.length > 0) ownerId = aliasRows[0].user_id;
            }

            if (ownerId) {
                const tokenRows = await sql`SELECT profile_link FROM wp_access_tokens WHERE user_id = ${ownerId} LIMIT 1`;
                if (tokenRows.length > 0 && tokenRows[0].profile_link) {
                    targetUser = tokenRows[0].profile_link;
                } else {
                    const postRows = await sql`SELECT profile_link FROM bridge_scheduled_posts WHERE user_id = ${ownerId} AND profile_link IS NOT NULL LIMIT 1`;
                    if (postRows.length > 0 && postRows[0].profile_link) {
                        targetUser = postRows[0].profile_link;
                    }
                }
            }
        }
        // --- END UMBRELLA METHOD ---
        
        // Force targetUser to perfectly match the UNA Base URL to prevent permalink crashes
        if (targetUser) {
            try {
                const parsedUrl = new URL(targetUser);
                targetUser = `${UNA_BASE_URL}${parsedUrl.pathname}`;
            } catch (e) {
                if (targetUser.startsWith('/')) targetUser = `${UNA_BASE_URL}${targetUser}`;
            }
        }
        
        const actualDomain = rows[0].domain || req.body.domain || 'https://office.selloutcrowds.com';

        const formData = new URLSearchParams();
        formData.append('api_key', access_token); // Use specific oauth token
        formData.append('user', targetUser); 
        formData.append('domain', actualDomain); // Send exact WP domain

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
            
            // Translate UNA errors so the WordPress plugin catches them
            if (json.code === 1 && json.msg && !json.post_id) {
                return res.status(200).json({ error: "UNA Server Error: " + json.msg });
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