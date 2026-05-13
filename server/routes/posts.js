import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema, UNA_BASE_URL, FSAN_TOKEN } from '../config.js';

const router = express.Router();

// Helper to gracefully ensure we capture the user's profile link for the API
const ensurePostsSchema = async () => {
    await ensureSchema();
    try {
        await sql`ALTER TABLE bridge_scheduled_posts ADD COLUMN IF NOT EXISTS profile_link TEXT`;
    } catch(e) {}
};

// 1. GET ALL POSTS FOR QUEUE
router.get('/api/posts', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        await ensurePostsSchema();
        const rows = await sql`SELECT * FROM bridge_scheduled_posts WHERE user_id = ${user.id} ORDER BY publish_time DESC`;
        
        res.json({ posts: rows });
    } catch (error) { 
        res.status(500).json({ error: "Failed to fetch posts" }); 
    }
});

// 2. SCHEDULE A NEW POST
router.post('/api/posts/schedule', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { content, image_url, target_communities, publish_time } = req.body;
        
        if ((!content && !image_url) || !target_communities || target_communities.length === 0 || !publish_time) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Format the user's profile URL so Una accepts the post as coming from them
        let userProfileUrl = user.profile_link || user.url || user.link || '';
        if (userProfileUrl) {
            userProfileUrl = userProfileUrl.replace('https://studio.', 'https://www.');
            if (!userProfileUrl.includes('www.')) {
                userProfileUrl = userProfileUrl.replace('https://selloutcrowds.com', 'https://www.selloutcrowds.com');
            }
        }

        await ensurePostsSchema();
        
        await sql`
            INSERT INTO bridge_scheduled_posts 
            (user_id, content, image_url, target_communities, publish_time, profile_link, status)
            VALUES 
            (${user.id}, ${content || ''}, ${image_url || ''}, ${JSON.stringify(target_communities)}, ${publish_time}, ${userProfileUrl}, 'pending')
        `;
        
        res.json({ success: true });
    } catch (error) { 
        console.error("Failed to schedule post:", error);
        res.status(500).json({ error: "Failed to schedule post" }); 
    }
});

// 3. CANCEL/DELETE A POST FROM QUEUE
router.post('/api/posts/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing ID" });

        await ensurePostsSchema();

        // Check if there is an image to delete from your api.php server first
        const rows = await sql`SELECT image_url FROM bridge_scheduled_posts WHERE id = ${id} AND user_id = ${user.id}`;
        if (rows.length > 0 && rows[0].image_url) {
            try {
                await fetch(`https://api.fytsolutions.com/api.php?action=delete_file&fileUrl=${encodeURIComponent(rows[0].image_url)}`);
            } catch(e) {
                console.error("Failed to ping image server for deletion", e);
            }
        }
        
        await sql`DELETE FROM bridge_scheduled_posts WHERE id = ${id} AND user_id = ${user.id}`;
        
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: "Failed to delete post" }); 
    }
});

// 4. CRON JOB: PUBLISH AND AUTO-CLEAN (Runs every 15 minutes via Vercel)
router.get('/api/cron/publish-posts', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized. Invalid CRON_SECRET.' });
        }

        await ensurePostsSchema();

        // --- PART A: PUBLISH PENDING POSTS ---
        const pendingPosts = await sql`SELECT * FROM bridge_scheduled_posts WHERE status = 'pending' AND publish_time <= NOW()`;
        
        for (const post of pendingPosts) {
            try {
                const formData = new URLSearchParams();
                formData.append('api_key', FSAN_TOKEN);
                formData.append('user', post.profile_link || '');
                formData.append('domain', 'https://bridge.selloutcrowds.com');
                
                formData.append('data[content]', post.content || '');
                if (post.image_url) formData.append('data[image]', post.image_url);
                
                let comms = [];
                try {
                    comms = typeof post.target_communities === 'string' ? JSON.parse(post.target_communities) : post.target_communities;
                } catch(e) {}

                if (comms && Array.isArray(comms)) {
                    formData.append('data[communities]', comms.join(','));
                }

                const endpoint = `${UNA_BASE_URL}/m/fsan/wordpress/create-post`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 
                        'User-Agent': 'UNA-Bridge-Cron', 
                        'Content-Type': 'application/x-www-form-urlencoded' 
                    },
                    body: formData
                });
                
                const text = await response.text();
                let success = false;
                
                try {
                    const json = JSON.parse(text);
                    if (json.success || !json.error) success = true;
                } catch(e) {
                    // If response is OK but not JSON, we assume success
                    if (response.ok) success = true;
                }

                if (success) {
                    await sql`UPDATE bridge_scheduled_posts SET status = 'published' WHERE id = ${post.id}`;
                } else {
                    await sql`UPDATE bridge_scheduled_posts SET status = 'failed', error_log = ${text.substring(0, 250)} WHERE id = ${post.id}`;
                }
            } catch (e) {
                await sql`UPDATE bridge_scheduled_posts SET status = 'failed', error_log = ${e.message} WHERE id = ${post.id}`;
            }
        }

        // --- PART B: THE SELF-CLEANING DATABASE ---
        // Find posts older than 7 days that are either published or failed
        const oldPosts = await sql`SELECT id, image_url FROM bridge_scheduled_posts WHERE status IN ('published', 'failed') AND publish_time < NOW() - INTERVAL '7 days'`;
        
        for (const old of oldPosts) {
            if (old.image_url) {
                try {
                    await fetch(`https://api.fytsolutions.com/api.php?action=delete_file&fileUrl=${encodeURIComponent(old.image_url)}`);
                } catch(e) {}
            }
            await sql`DELETE FROM bridge_scheduled_posts WHERE id = ${old.id}`;
        }

        res.json({ 
            success: true, 
            published_count: pendingPosts.length, 
            cleaned_count: oldPosts.length 
        });

    } catch (error) { 
        res.status(500).json({ error: "Cron execution failed" }); 
    }
});

export default router;