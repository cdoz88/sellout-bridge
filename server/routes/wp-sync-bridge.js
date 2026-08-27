import express from 'express';
import { UNA_SECRET } from '../config.js';

const router = express.Router();

router.post('/api/wp-sync-bridge', async (req, res) => {
    try {
        // Hardcoding the Studio URL to guarantee it hits the UNA CMS database
        const STUDIO_URL = 'https://studio.selloutcrowds.com/bridge-connector.php';
        
        // Inject the master secret so bridge-connector.php accepts the request
        const payload = {
            ...req.body,
            secret: UNA_SECRET
        };

        const response = await fetch(STUDIO_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${UNA_SECRET}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("WP Sync Bridge Proxy Error:", error);
        res.status(500).json({ error: "Failed to communicate with UNA bridge" });
    }
});

export default router;