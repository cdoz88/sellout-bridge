/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Switched from the default UNA api.php to the custom FSAN endpoint 
 * discovered in the WordPress plugin (get-fields) to bypass 403 Access Denied errors.
 */

import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

// NEW: The custom endpoint used by your WordPress Plugin
const FSAN_CUSTOM_API_URL = "https://fantasysportsadvice.network/m/fsan/wordpress/get-fields";

const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

app.post('/api/auth/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', UNA_CLIENT_ID);
        params.append('client_secret', UNA_CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', redirect_uri); 

        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        if (data.error) return res.status(400).json(data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to exchange auth code" });
    }
});

app.get('/api/get-una-assets', async (req, res) => {
    const token = req.headers.authorization;
    try {
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        
        // Mimicking the WP plugin's `get_option('soc_profile_url')`
        const profileUrl = meData.url || `https://selloutcrowds.com/profile/${meData.name || meData.id}`;

        // Build the exact payload the WordPress functions.php sends
        const formData = new URLSearchParams();
        formData.append('api_key', UNA_SECRET);
        formData.append('user', profileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        // Hit the custom FSAN endpoint
        const customRes = await fetch(FSAN_CUSTOM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const text = await customRes.text();
        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            return res.json({
                user: meData,
                crowds: [], spaces: [],
                debug: { error: "Custom endpoint returned non-JSON", rawText: text.substring(0, 500) }
            });
        }

        // Translate the WP formatted data ('bx_spaces_123') into our Dashboard arrays
        const crowds = [];
        const spaces = [];
        const options = parsedData?.allow_view_to?.values || [];

        options.forEach(item => {
            if (item.key.startsWith('bx_spaces_')) {
                crowds.push({ id: item.key.replace('bx_spaces_', ''), title: item.value });
            } else if (item.key.startsWith('bx_groups_')) {
                spaces.push({ id: item.key.replace('bx_groups_', ''), title: item.value });
            }
        });

        res.json({
            user: meData,
            crowds: crowds,
            spaces: spaces,
            debug: {
                endpointUsed: FSAN_CUSTOM_API_URL,
                profileUrlSent: profileUrl,
                rawResponse: parsedData
            }
        });
    } catch (error) {
        console.error("Asset Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch community assets" });
    }
});

app.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;
    if (event.type === 'checkout.session.completed') {
        const customerEmail = event.data.object.customer_details.email;
        const stripeProductId = event.data.object.metadata.product_id;
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.execute(
                'SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ?', 
                [stripeProductId]
            );
            if (rows.length > 0) {
                const { una_module, una_content_id } = rows[0];
                await grantCommunityAccess(customerEmail, una_module, una_content_id);
            }
            await connection.end();
        } catch (error) {
            console.error('Webhook Error:', error);
        }
    }
    res.json({ received: true });
});

async function grantCommunityAccess(email, module, contentId) {
    try {
        await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: module,
                method: 'serviceAddMember',
                params: [contentId, email],
                key: UNA_SECRET
            })
        });
    } catch (err) {
        console.error("Grant Access Error:", err);
    }
}

export default app;