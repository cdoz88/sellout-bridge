/**
 * api.js - THE BACKEND ENGINE
 * * WHAT THIS DOES:
 * 1. Exchanges OAuth codes for Access Tokens so you can log in.
 * 2. Fetches your real Crowds (Groups) and Spaces from Sellout Crowds.
 * 3. Listens for Stripe payments and adds members automatically.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// 1. SELLOUT CROWDS CONFIGURATION
const UNA_BASE_URL = "https://selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";

// 2. DATABASE CONFIGURATION (Stored in Vercel Environment Variables)
const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

/**
 * AUTH CALLBACK: The "Secret Handshake"
 * This swaps the temporary 'code' from the login screen for a real 'token'.
 */
app.post('/api/auth/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', process.env.UNA_CLIENT_ID);
        params.append('client_secret', process.env.UNA_CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

        const response = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Auth Exchange Error:", error);
        res.status(500).json({ error: "Failed to exchange auth code" });
    }
});

/**
 * FETCH ASSETS: Gets your real Crowds and Spaces
 * Uses your personal token to find your ID, then uses the Master Key to get the list.
 */
app.get('/api/get-una-assets', async (req, res) => {
    const token = req.headers.authorization;
    
    try {
        // Step A: Find out who is logged in
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        const profileId = meData.id;

        // Step B: Fetch their Groups (Crowds)
        const groupsRes = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'bx_groups',
                method: 'get_author_entries',
                params: [profileId],
                key: UNA_SECRET
            })
        });
        const groupsData = await groupsRes.json();

        // Step C: Fetch their Spaces
        const spacesRes = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'bx_spaces',
                method: 'get_author_entries',
                params: [profileId],
                key: UNA_SECRET
            })
        });
        const spacesData = await spacesRes.json();

        res.json({
            user: meData,
            groups: groupsData.result || [],
            spaces: spacesData.result || []
        });
    } catch (error) {
        console.error("Asset Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch community assets" });
    }
});

/**
 * STRIPE WEBHOOK: Adds members after payment
 */
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

module.exports = app;