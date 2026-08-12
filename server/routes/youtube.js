import express from 'express';
import { getAuthenticatedUser, UNA_BASE_URL, UNA_SECRET } from '../config.js';

const router = express.Router();

// Abstract proxy function to forward all requests to the UNA PHP backend securely
const proxyToBridge = async (req, res, action, extraPayload = {}) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const payload = {
            secret: UNA_SECRET,
            action: action,
            email: user.email,
            ...extraPayload
        };

        const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(`Error in ${action}:`, err);
        res.status(500).json({ error: "Server Error" });
    }
};

// Route mapping strictly to bridge-connector.php actions
router.get('/api/youtube/key', (req, res) => proxyToBridge(req, res, 'get_youtube_data'));
router.post('/api/youtube/key', (req, res) => proxyToBridge(req, res, 'save_youtube_key', { key: req.body.key }));
router.get('/api/youtube/playlists', (req, res) => proxyToBridge(req, res, 'get_youtube_data'));
router.post('/api/youtube/playlists', (req, res) => proxyToBridge(req, res, 'save_youtube_playlist', req.body));
router.put('/api/youtube/playlists/:id', (req, res) => proxyToBridge(req, res, 'save_youtube_playlist', { ...req.body, playlist_id: req.params.id }));
router.delete('/api/youtube/playlists/:id', (req, res) => proxyToBridge(req, res, 'delete_youtube_playlist', { playlist_id: req.params.id }));
router.get('/api/youtube/search-users', (req, res) => proxyToBridge(req, res, 'search_users', { term: req.query.term }));
router.get('/api/youtube/teammates', (req, res) => proxyToBridge(req, res, 'get_teammates'));

export default router;