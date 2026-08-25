import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema } from '../config.js';

const router = express.Router();

router.get('/api/dashboard/metrics', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();

        const roleId = Number(user.role);
        const isTeammate = roleId === 18;

        // 1. Resolve Workspace Ownership
        let workspaceId = user.id;
        if (isTeammate) {
            const seatRows = await sql`SELECT owner_id FROM bridge_team_seats WHERE teammate_email = ${user.email.trim().toLowerCase()}`;
            if (seatRows.length > 0) workspaceId = seatRows[0].owner_id;
        }

        // 2. Scheduled Posts Count
        const postsDb = await sql`SELECT count(*) FROM bridge_scheduled_posts WHERE user_id = ${workspaceId} AND status = 'pending'`;
        const upcomingPosts = parseInt(postsDb[0]?.count) || 0;

        // 3. Draft/Scheduled Newsletters Count
        let upcomingEmails = 0;
        try {
            const emailDb = await sql`SELECT count(*) FROM bridge_newsletters WHERE user_id = ${workspaceId} AND status != 'sent'`;
            upcomingEmails = parseInt(emailDb[0]?.count) || 0;
        } catch(e) {} // Fails gracefully if Newsletter table isn't built yet

        // 4. Teammate Usage
        const teamDb = await sql`SELECT count(*) FROM bridge_team_seats WHERE owner_id = ${workspaceId}`;
        const teamUsed = parseInt(teamDb[0]?.count) || 0;

        res.json({
            success: true,
            metrics: {
                upcomingPosts,
                upcomingEmails,
                teamUsed
            }
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
});

export default router;