import express from 'express';
import { UNA_BASE_URL, UNA_SECRET } from '../server/config.js';

const router = express.Router();

router.post('/api/admin-bridge', async (req, res) => {
    try {
        const payload = {
            ...req.body,
            secret: UNA_SECRET
        };

        const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
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
        console.error("Admin Bridge Error:", error);
        res.status(500).json({ error: "Failed to fetch from admin bridge" });
    }
});

export default router;