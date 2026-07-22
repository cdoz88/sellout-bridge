import express from 'express';
import { sql, getAuthenticatedUser } from '../config.js';

const router = express.Router();

// Middleware to ensure the user is authenticated via UNA token
const authenticate = async (req, res, next) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        req.user = user;
        next();
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
};

// GET: Fetch user's saved YouTube API Key
router.get('/api/youtube/key', authenticate, async (req, res) => {
    try {
        const rows = await sql`SELECT \`key\` FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
        res.json({ key: rows.length > 0 ? rows[0].key : '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Save or Update YouTube API Key
router.post('/api/youtube/key', authenticate, async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) {
            await sql`DELETE FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
        } else {
            await sql`REPLACE INTO aqb_fsan_youtube_keys (author, \`key\`) VALUES (${req.user.id}, ${key})`;
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch all user's Playlists
router.get('/api/youtube/playlists', authenticate, async (req, res) => {
    try {
        const rows = await sql`SELECT * FROM aqb_fsan_ylists WHERE author = ${req.user.id} ORDER BY created DESC`;
        res.json({ playlists: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Add a new Playlist
router.post('/api/youtube/playlists', authenticate, async (req, res) => {
    try {
        const { ident, active, allow_view_to } = req.body;
        
        if (!ident || !allow_view_to) {
            return res.status(400).json({ error: "Please fill out all required fields." });
        }

        // 1. Get User's Youtube API Key
        const keyRows = await sql`SELECT \`key\` FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
        if (keyRows.length === 0 || !keyRows[0].key) {
            return res.status(400).json({ error: "Please save your YouTube API Key in settings first." });
        }
        const apiKey = keyRows[0].key;

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

        // 3. Insert into Sellout Crowds Database
        await sql`
            INSERT INTO aqb_fsan_ylists 
            (ident, title, thumb, \`desc\`, total, active, allow_view_to, author, created, cursor)
            VALUES 
            (${ident}, ${title}, ${thumb}, ${desc}, ${total}, ${active ? 1 : 0}, ${allow_view_to}, ${req.user.id}, NOW(), NOW())
        `;

        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('Duplicate entry')) {
            return res.status(400).json({ error: "This playlist is already connected." });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a Playlist
router.delete('/api/youtube/playlists/:id', authenticate, async (req, res) => {
    try {
        await sql`DELETE FROM aqb_fsan_ylists WHERE id = ${req.params.id} AND author = ${req.user.id}`;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;