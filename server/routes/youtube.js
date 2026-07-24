import express from 'express';
import { sql, getAuthenticatedUser, UNA_SECRET } from '../config.js';

const router = express.Router();

// Inline authentication middleware verifying UNA OAuth access tokens via centralized config
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Not authenticated" });
        
        // FIX: Use the centralized UNA API checker instead of querying the Neon database directly
        const user = await getAuthenticatedUser(authHeader);
        
        if (!user || !user.id) {
            return res.status(401).json({ error: "Invalid token or user not found" });
        }
        
        req.user = user;
        next();
    } catch (e) {
        console.error("YouTube Route Auth Error:", e);
        res.status(500).json({ error: "Server Error" });
    }
};

// Helper to securely interact with the UNA database via bridge-connector
const callBridge = async (action, email, payload = {}) => {
    const url = `https://selloutcrowds.com/bridge-connector.php`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
        body: JSON.stringify({ action, email, secret: UNA_SECRET, ...payload })
    });
    return response.json();
};

// GET: Fetch user's saved YouTube API Key
router.get('/api/youtube/key', authenticate, async (req, res) => {
    try {
        // Proxied securely to UNA MySQL Database
        const data = await callBridge('get_youtube_key', req.user.email);
        res.json({ key: data.key || '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Save or Update YouTube API Key
router.post('/api/youtube/key', authenticate, async (req, res) => {
    try {
        const { key } = req.body;
        // Proxied securely to UNA MySQL Database
        const data = await callBridge('save_youtube_key', req.user.email, { key });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch account teammates for author selection
router.get('/api/youtube/teammates', authenticate, async (req, res) => {
    try {
        // Wrapped in Try/Catch so if the 'team_members' table hasn't been created in Neon yet, it safely falls back to the primary account
        let teamRows = [];
        try {
            teamRows = await sql`
                SELECT id, email, name, profile_id 
                FROM team_members 
                WHERE owner_user_id = ${req.user.id} OR owner_email = ${req.user.email}
            `;
        } catch (dbErr) {
            console.warn("Neon DB warning: team_members table missing or un-synced. Defaulting to primary account.", dbErr.message);
        }
        
        const primaryUser = {
            id: req.user.id,
            name: req.user.name || 'Primary Account',
            email: req.user.email,
            profile_id: req.user.id,
            is_primary: true
        };

        const teammates = [primaryUser];

        if (teamRows && teamRows.length > 0) {
            teamRows.forEach(row => {
                teammates.push({
                    id: row.profile_id || row.id,
                    name: row.name || row.email,
                    email: row.email,
                    profile_id: row.profile_id || row.id,
                    is_primary: false
                });
            });
        }

        res.json({ teammates });
    } catch (err) {
        res.json({ teammates: [{ id: req.user.id, name: req.user.name || 'Primary Account', email: req.user.email, profile_id: req.user.id, is_primary: true }] });
    }
});

// GET: Fetch all user's Playlists
router.get('/api/youtube/playlists', authenticate, async (req, res) => {
    try {
        // Proxied securely to UNA MySQL Database
        const data = await callBridge('get_youtube_playlists', req.user.email);
        res.json({ playlists: data.playlists || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Add a new Playlist
router.post('/api/youtube/playlists', authenticate, async (req, res) => {
    try {
        const { ident, active, allow_view_to, authors } = req.body;
        
        if (!ident || !allow_view_to) {
            return res.status(400).json({ error: "Please fill out all required fields." });
        }

        const authorList = Array.isArray(authors) && authors.length > 0 ? authors : [req.user.id];
        const primaryAuthor = authorList[0];
        const coAuthors = authorList.slice(1).join(',');

        // 1. Get User's Youtube API Key via Bridge
        const keyData = await callBridge('get_youtube_key', req.user.email);
        const apiKey = keyData.key;
        
        if (!apiKey) {
            return res.status(400).json({ error: "Please save your YouTube API Key in settings first." });
        }

        // 2. Fetch Playlist Info from Google API
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${ident}&key=${apiKey}`);
        const ytData = await ytRes.json();

        if (ytData.error || !ytData.items || ytData.items.length === 0) {
            return res.status(400).json({ error: "Invalid Playlist ID or YouTube API Error." });
        }

        const info = ytData.items[0];
        const title = info.snippet.title;
        const desc = info.snippet.description || '';
        const thumb = info.snippet.thumbnails?.default?.url || '';
        const total = info.contentDetails.itemCount || 0;

        // 3. Insert into UNA MySQL via Bridge
        const insertData = await callBridge('add_youtube_playlist', req.user.email, {
            ident, title, thumb, desc, total, 
            active: active ? 1 : 0, 
            allow_view_to, primaryAuthor, coAuthors
        });

        if (!insertData.success) {
            return res.status(400).json({ error: insertData.error || "Failed to add playlist" });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update an existing Playlist
router.put('/api/youtube/playlists/:id', authenticate, async (req, res) => {
    try {
        const { active, allow_view_to, authors } = req.body;
        const playlistId = req.params.id;

        const authorList = Array.isArray(authors) && authors.length > 0 ? authors : [req.user.id];
        const primaryAuthor = authorList[0];
        const coAuthors = authorList.slice(1).join(',');

        // Update via Bridge
        await callBridge('update_youtube_playlist', req.user.email, {
            playlistId, active: active ? 1 : 0, allow_view_to, primaryAuthor, coAuthors
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a Playlist
router.delete('/api/youtube/playlists/:id', authenticate, async (req, res) => {
    try {
        await callBridge('delete_youtube_playlist', req.user.email, { playlistId: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;