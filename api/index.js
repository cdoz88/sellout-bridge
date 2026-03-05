/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: We are now using the newly discovered FSAN module! 
 * This perfectly duplicates the working WordPress plugin's logic.
 */

import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

// --- THE NEW FSAN CONFIGURATION ---
const FSAN_ENDPOINT = `${UNA_BASE_URL}/m/fsan/wordpress/get-fields`;
const FSAN_TOKEN = "j7PGMBb4nZylvLGVV0cgd7ZOvpCBJkDO"; 

const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

// 1. OAUTH HANDSHAKE
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

// 2. FETCH CROWDS & SPACES VIA THE FSAN MODULE
app.get('/api/get-una-assets', async (req, res) => {
    const token = req.headers.authorization;
    try {
        // Step A: Find out who is logged in via OAuth
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        
        // Grab their profile URL (Fallback to their ID URL if standard URL is missing)
        const profileUrl = meData.url || `${UNA_BASE_URL}/profile/${meData.id}`;

        // Step B: Replicate the exact $post_fields from your WordPress plugin
        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN);
        formData.append('user', profileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        // Step C: Ask the FSAN Module for the data!
        const fsanRes = await fetch(FSAN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const text = await fsanRes.text();
        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            return res.json({
                user: meData, crowds: [], spaces: [],
                debug: { error: "FSAN returned non-JSON", rawText: text.substring(0, 500) }
            });
        }

        const crowds = [];
        const spaces = [];
        const options = parsedData?.allow_view_to?.values || [];

        // Step D: Translate the FSAN data into our Dashboard dropdown format
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
                endpointUsed: FSAN_ENDPOINT,
                profileUrlSent: profileUrl,
                rawResponse: parsedData
            }
        });
    } catch (error) {
        console.error("Asset Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch community assets" });
    }
});

// 3. WEBHOOK HANDLER
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
                method: 'serviceAddMember', // This is verified and allowed for writing!
                params: [contentId, email],
                key: UNA_SECRET
            })
        });
    } catch (err) {
        console.error("Grant Access Error:", err);
    }
}

export default app;