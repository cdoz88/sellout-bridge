/**
 * api/index.js - THE BACKEND ENGINE
 * FIX: Swapped out old "require" syntax for modern "import" syntax
 * to match the strict "type: module" requirement in your package.json.
 */

import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

// STUDIO URL CONFIGURATION
const UNA_BASE_URL = "https://studio.selloutcrowds.com";
const UNA_API_URL = `${UNA_BASE_URL}/api.php`;
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";

const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

/**
 * AUTH CALLBACK: The "Secret Handshake"
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
        
        // If UNA sends back an error, pass it to the frontend so we can see it
        if (data.error) {
            console.error("UNA Error:", data);
            return res.status(400).json(data);
        }
        
        res.json(data);
    } catch (error) {
        console.error("Auth Exchange Error:", error);
        res.status(500).json({ error: "Failed to exchange auth code" });
    }
});

/**
 * FETCH ASSETS: Gets your real Crowds and Spaces
 */
app.get('/api/get-una-assets', async (req, res) => {
    const token = req.headers.authorization;
    try {
        const meRes = await fetch(`${UNA_BASE_URL}/modules/?r=oauth2/api/me`, {
            headers: { 'Authorization': token }
        });
        const meData = await meRes.json();
        const profileId = meData.id;

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

// FIX: Modern export to match ES Modules
export default app;