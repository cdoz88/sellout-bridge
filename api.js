/**
 * api.js - THE BACKEND WORKER (THE BRAIN)
 * * WHAT THIS DOES:
 * 1. Listens for payment notifications (Webhooks) from Stripe or PayPal.
 * 2. Checks your cPanel Database to see which product belongs to which group.
 * 3. Tells your Sellout Crowds community site to add the member.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// 1. YOUR SELLOUT CROWDS SECRET KEYS
const UNA_API_URL = "https://selloutcrowds.com/api.php";
const UNA_SECRET = "K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC";

// 2. DATABASE CONFIGURATION
// We use 'process.env' so your real passwords stay hidden in Vercel's settings.
const dbConfig = {
    host: 'sdb-82.hosting.stackcp.net',
    user: process.env.DB_USER,      // This will be set in Vercel
    password: process.env.DB_PASSWORD, // This will be set in Vercel
    database: 'una-bridge-35303839bd70'
};

app.use(express.json());

/**
 * STRIPE WEBHOOK LISTENER
 * Stripe will "text" this address when someone pays you.
 */
app.post('/api/stripe-webhook', async (req, res) => {
    const event = req.body;

    // Only do something if the payment was successful
    if (event.type === 'checkout.session.completed') {
        const customerEmail = event.data.object.customer_details.email;
        
        // We look for a "product_id" that you'll set in your Stripe dashboard metadata
        const stripeProductId = event.data.object.metadata.product_id;

        console.log(`Payment success for ${customerEmail}. Product: ${stripeProductId}`);

        try {
            // Open a connection to your cPanel Database
            const connection = await mysql.createConnection(dbConfig);
            
            // Look up which Group/Space is linked to this Stripe Product
            const [rows] = await connection.execute(
                'SELECT una_module, una_content_id FROM bridge_mappings WHERE stripe_product_id = ?', 
                [stripeProductId]
            );

            if (rows.length > 0) {
                const { una_module, una_content_id } = rows[0];
                
                // Call the helper function below to actually add the member to the site
                await grantCommunityAccess(customerEmail, una_module, una_content_id);
                
                // Record this event in your logs table
                await connection.execute(
                    'INSERT INTO bridge_logs (customer_email, action, details) VALUES (?, ?, ?)',
                    [customerEmail, 'granted', `Added to ${una_module} ID ${una_content_id}`]
                );
            }
            
            await connection.end(); // Close the database door
        } catch (error) {
            console.error('Database Error:', error);
        }
    }
    
    // Always tell Stripe we got the message
    res.json({ received: true });
});

/**
 * HELPER: THE COMMAND TO SELLOUT CROWDS
 * This sends the secret request to your community site.
 */
async function grantCommunityAccess(email, module, contentId) {
    try {
        const response = await fetch(UNA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module: module,         // e.g., 'bx_groups'
                method: 'serviceAddMember',
                params: [contentId, email],
                key: UNA_SECRET
            })
        });

        const result = await response.json();
        return result.status === 'ok';
    } catch (err) {
        console.error("Sellout Crowds API Error:", err);
        return false;
    }
}

// Export this for Vercel to use
module.exports = app;