import express from 'express';
import { UNA_SECRET } from '../config.js';

const router = express.Router();

router.post('/api/wp/get-fields', async (req, res) => {
    try {
        const STUDIO_URL = 'https://studio.selloutcrowds.com/bridge-connector.php';
        
        // The plugin sends 'user' and 'domain', we need to map this to the UNA action
        const payload = {
            action: 'get-fields',
            user: req.body.user,
            domain: req.body.domain,
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
        console.error("WP API Proxy Error:", error);
        res.status(500).json({ error: "Failed to communicate with UNA bridge" });
    }
});

export default router;