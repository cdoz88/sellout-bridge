/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Added aggressive Vercel console logging to diagnose the silent failure.
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

// 3. SECURELY SYNC COMMUNITIES VIA OAUTH PROFILE LINK
app.get('/api/get-communities', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        console.log("DIAGNOSTIC: No token provided in headers.");
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        console.log("--- STARTING SYNC PROCESS ---");
        
        // Step A: Guarantee identity via OAuth session
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        
        console.log("STEP 1: /me API Response Data:", JSON.stringify(meData));

        if (!meData || !meData.id || !meData.profile_link) {
            console.log("DIAGNOSTIC: Invalid OAuth session or missing profile link.");
            return res.status(401).json({ error: "Invalid OAuth session or missing profile link" });
        }

        // Step B: Extract the official profile link provided directly by the server
        let userProfileUrl = meData.profile_link;
        console.log("STEP 2: Original Profile Link:", userProfileUrl);

        // Security / Routing safety
        userProfileUrl = userProfileUrl.replace('https://studio.', 'https://www.');
        if (!userProfileUrl.includes('www.')) {
             userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com'); 
        }
        
        console.log("STEP 3: Adjusted Profile Link sent to FSAN:", userProfileUrl);

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
        console.log("STEP 4: RAW FSAN Response Text:", text);

        let parsedData = null;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            console.log("STEP 5: Failed to parse FSAN response as JSON.");
            return res.json({
                crowds: [], spaces: [],
                debug: { error: "Non-JSON response from endpoint", rawResponse: text, urlUsed: userProfileUrl }
            });
        }

        console.log("STEP 5: Successfully parsed JSON. Does allow_view_to exist?", !!(parsedData && parsedData.allow_view_to));

        // Check if the FSAN endpoint accepted the URL and returned our fields
        if (!parsedData || !parsedData.allow_view_to || !parsedData.allow_view_to.values) {
            return res.json({
                crowds: [], spaces: [],
                debug: { 
                    error: "Endpoint rejected the verified profile URL.", 
                    response: parsedData, 
                    urlUsed: userProfileUrl 
                }
            });
        }

        // Step D: Success! Translate the data into our dropdown formats
        const crowds = [];
        const spaces = [];
        const options = parsedData.allow_view_to.values || [];

        options.forEach(item => {
            if (item && typeof item.key === 'string') {
                if (item.key.startsWith('bx_spaces_')) {
                    crowds.push({ id: item.key.replace('bx_spaces_', ''), title: item.value });
                } else if (item.key.startsWith('bx_groups_')) {
                    spaces.push({ id: item.key.replace('bx_groups_', ''), title: item.value });
                }
            }
        });

        console.log(`--- SYNC COMPLETE: Found ${crowds.length} crowds and ${spaces.length} spaces ---`);

        res.json({
            crowds: crowds,
            spaces: spaces,
            debug: {
                success: true,
                winningUrl: userProfileUrl,
                totalOptionsFound: options.length
            }
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