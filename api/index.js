/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Implemented "Group Header" parsing to properly read UNA's negative-number context arrays.
 */

import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";
const UNA_CLIENT_ID = "yxxnxsihu2";
const UNA_CLIENT_SECRET = "uhntfpaswm7zdiranbnkqekbcgdpy9ni";

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

// 2. GET USER NAME (Runs instantly on login)
app.get('/api/get-user', async (req, res) => {
    const token = req.headers.authorization;
    try {
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        res.json({ user: meData });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user data" });
    }
});

// 3. SECURELY SYNC COMMUNITIES
app.get('/api/get-communities', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
        // Step A: Guarantee identity via OAuth session
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        
        if (!meData || !meData.id || !meData.profile_link) {
            return res.status(401).json({ error: "Invalid OAuth session or missing profile link" });
        }

        // Step B: Extract and format the official profile link
        let userProfileUrl = meData.profile_link;
        userProfileUrl = userProfileUrl.replace('https://studio.', 'https://www.');
        if (!userProfileUrl.includes('www.')) {
             userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com'); 
        }

        // Step C: Send the single, verified URL to the FSAN module
        const formData = new URLSearchParams();
        formData.append('api_key', FSAN_TOKEN); 
        formData.append('user', userProfileUrl);
        formData.append('domain', 'https://bridge.selloutcrowds.com');

        const fsanRes = await fetch(FSAN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const text = await fsanRes.text();
        let parsedData = null;

        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            return res.json({ crowds: [], spaces: [], debug: { error: "Non-JSON response" } });
        }

        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) {
            return res.json({ crowds: [], spaces: [], debug: { error: "Missing allow_view_to array" } });
        }

        // Step D: Parse the Group Headers and Negative IDs
        const crowds = [];
        const spaces = [];
        const options = parsedData.allow_view_to.values || [];

        let currentCategory = null;

        options.forEach(item => {
            // Check if we hit a category header (CROWD or SPACE)
            if (item.type === 'group_header') {
                if (item.value === 'CROWD') currentCategory = 'CROWD';
                if (item.value === 'SPACE') currentCategory = 'SPACE';
            } 
            // Check if we hit the end of a category
            else if (item.type === 'group_end') {
                currentCategory = null;
            } 
            // If it has a key (like -17), it's a community!
            else if (item.key !== undefined && typeof item.key === 'number') {
                // Remove the minus sign to get the true UNA ID
                const trueId = Math.abs(item.key).toString();
                
                if (currentCategory === 'CROWD') {
                    crowds.push({ id: trueId, title: item.value });
                } else if (currentCategory === 'SPACE') {
                    spaces.push({ id: trueId, title: item.value });
                }
            }
        });

        res.json({
            crowds: crowds,
            spaces: spaces,
            debug: { success: true }
        });
    } catch (error) {
        console.error("Asset Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch community assets" });
    }
});

// 4. WEBHOOK HANDLER
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