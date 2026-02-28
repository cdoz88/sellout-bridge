/**
 * api.js - THE SELLOUT CROWDS BRIDGE ENGINE
 * This file handles all secret communication between payment providers, 
 * your cPanel database, and your Sellout Crowds community site.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const stripe = require('stripe');
const app = express();

// 1. CONFIGURATION
const UNA_API_URL = "https://selloutcrowds.com/api.php";
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";

// 2. DATABASE CONFIG (From your cPanel infrastructure)
const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: 'sc_bridge',      // You will enter your cPanel DB username here
    password: '2uM$O.ungd}f',  // You will enter your cPanel DB password here
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

/**
 * FETCH LIVE ASSETS
 * Used by the Dashboard to show your real Crowds and Spaces.
 */
app.get('/api/get-una-assets', async (req, res) => {
    try {
        const response = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: 'bx_groups', // Fetching Crowds
                method: 'get_author_entries',
                params: [req.query.profileId || 0],
                key: UNA_SECRET
            })
        });
        
        const data = await response.json();
        res.json(data.result || []);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch UNA assets" });
    }
});

/**
 * STRIPE WEBHOOK LISTENER
 * This is the URL you provide to Stripe: https://your-site.vercel.app/api/stripe-webhook
 */
app.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;

    // Only proceed if the payment was successful
    if (event.type === 'checkout.session.completed') {
        const customerEmail = event.data.object.customer_details.email;
        const stripeProductId = event.data.object.metadata.product_id;

        try {
            const connection = await mysql.createConnection(dbConfig);
            
            // Look up the mapping in your cPanel Database
            const [rows] = await connection.execute(
                'SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ?', 
                [stripeProductId]
            );

            if (rows.length > 0) {
                const { una_module, una_content_id } = rows[0];
                
                // Call the UNA API to grant access
                await grantCommunityAccess(customerEmail, una_module, una_content_id);
                
                // Log the success in your database
                await connection.execute(
                    'INSERT INTO bridge_logs (customer_email, action, details) VALUES (?, ?, ?)',
                    [customerEmail, 'granted', `Added to ${una_module} ID ${una_content_id}`]
                );
            }
            await connection.end();
        } catch (dbError) {
            console.error('Database/Fulfillment Error:', dbError);
        }
    }
    res.json({ received: true });
});

/**
 * PAYPAL WEBHOOK LISTENER
 * This is the URL you provide to PayPal: https://your-site.vercel.app/api/paypal-webhook
 */
app.post('/api/paypal-webhook', async (req, res) => {
    const event = req.body;

    // Logic for PayPal payment completion
    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
        const email = event.resource.payer_email || event.resource.custom_json_data_email;
        const paypalPlanId = event.resource.billing_agreement_id || event.resource.parent_payment;

        // Perform similar lookup and grantAccess logic as Stripe above
        console.log(`PayPal payment received from ${email} for plan ${paypalPlanId}`);
    }
    res.json({ received: true });
});

/**
 * INTERNAL FUNCTION: TALK TO SELLOUT CROWDS
 */
async function grantCommunityAccess(email, module, contentId) {
    const response = await fetch(UNA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            module: module,
            method: 'serviceAddMember', // Official UNA Command
            params: [contentId, email],
            key: UNA_SECRET
        })
    });
    return response.ok;
}

module.exports = app;