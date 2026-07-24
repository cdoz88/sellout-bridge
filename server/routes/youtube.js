import express from 'express';
import { sql } from '../config.js';

const router = express.Router();

// Inline authentication middleware verifying UNA OAuth access tokens against the database
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Not authenticated" });
        
        const token = authHeader.replace('Bearer ', '').trim();
        
        let tokenRows;
        try {
            // 1. Look up the token in UNA's OAuth table
            // This is wrapped in its own try/catch to intercept the missing table error in Neon DB
            tokenRows = await sql`SELECT user_id FROM sys_oauth2_access_tokens WHERE access_token = ${token}`;
        } catch (dbErr) {
            console.warn("Auth DB Error (Table likely missing in Neon):", dbErr.message);
            return res.status(401).json({ error: "Database configuration error. Authentication unavailable." });
        }
        
        if (!tokenRows || tokenRows.length === 0) return res.status(401).json({ error: "Invalid token" });
        
        // 2. Fetch user account information
        const userRows = await sql`SELECT id, email, name FROM sys_accounts WHERE id = ${tokenRows[0].user_id}`;
        if (!userRows || userRows.length === 0) return res.status(401).json({ error: "User not found" });
        
        req.user = userRows[0];
        next();
    } catch (e) {
        console.error("YouTube Route Auth Error:", e);
        // Fallback to 401 instead of 500 to prevent breaking frontend data fetching chains
        res.status(401).json({ error: "Authentication Server Error" });
    }
};

// GET: Fetch user's saved YouTube API Key
router.get('/api/youtube/key', authenticate, async (req, res) => {
    try {
        // Updated to use Postgres double quotes instead of MySQL backticks
        const rows = await sql`SELECT "key" FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
        res.json({ key: rows.length > 0 ? rows[0].key : '' });
    } catch (err) {
        console.error("Error fetching YouTube key:", err.message);
        res.json({ key: '' }); // Graceful fallback
    }
});

// POST: Save or Update YouTube API Key
router.post('/api/youtube/key', authenticate, async (req, res) => {
    try {
        const { key } = req.body;
        
        // Removed REPLACE INTO (MySQL specific). Using DELETE then INSERT for Postgres compatibility.
        await sql`DELETE FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
        
        if (key) {
            await sql`INSERT INTO aqb_fsan_youtube_keys (author, "key") VALUES (${req.user.id}, ${key})`;
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving YouTube key:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch account teammates for author selection
router.get('/api/youtube/teammates', authenticate, async (req, res) => {
    try {
        const teamRows = await sql`
            SELECT id, email, name, profile_id 
            FROM team_members 
            WHERE owner_user_id = ${req.user.id} OR owner_email = ${req.user.email}
        `;
        
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
        console.error("Error fetching teammates:", err.message);
        // Graceful fallback to prevent frontend crash
        res.json({ teammates: [{ id: req.user.id, name: req.user.name || 'Primary Account', email: req.user.email, profile_id: req.user.id, is_primary: true }] });
    }
});

// GET: Fetch all user's Playlists
router.get('/api/youtube/playlists', authenticate, async (req, res) => {
    try {
        const rows = await sql`SELECT * FROM aqb_fsan_ylists WHERE author = ${req.user.id} ORDER BY created DESC`;
        res.json({ playlists: rows });
    } catch (err) {
        console.error("Error fetching playlists:", err.message);
        res.json({ playlists: [] }); // Graceful fallback
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

        // 1. Get User's Youtube API Key
        const keyRows = await sql`SELECT "key" FROM aqb_fsan_youtube_keys WHERE author = ${req.user.id}`;
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
        // Updated to use Postgres double quotes for "desc"
        await sql`
            INSERT INTO aqb_fsan_ylists 
            (ident, title, thumb, "desc", total, active, allow_view_to, author, co_authors, created, cursor)
            VALUES 
            (${ident}, ${title}, ${thumb}, ${desc}, ${total}, ${active ? 1 : 0}, ${allow_view_to}, ${primaryAuthor}, ${coAuthors}, NOW(), NOW())
        `;

        res.json({ success: true });
    } catch (err) {
        // Adjusted MySQL "Duplicate entry" check to Postgres "duplicate key value"
        if (err.message && err.message.includes('duplicate key value')) {
            return res.status(400).json({ error: "This playlist is already connected." });
        }
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

        await sql`
            UPDATE aqb_fsan_ylists 
            SET active = ${active ? 1 : 0},
                allow_view_to = ${allow_view_to},
                author = ${primaryAuthor},
                co_authors = ${coAuthors}
            WHERE id = ${playlistId} AND author = ${req.user.id}
        `;

        res.json({ success: true });
    } catch (err) {
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