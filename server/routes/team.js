import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema, ensureExpansionsSubscription, grantCommunityAccess, UNA_BASE_URL, UNA_SECRET } from '../config.js';

const router = express.Router();

// --- WORKSPACE ENGINE ---
const getWorkspaceId = async (user) => {
    if (Number(user.role) === 18 && user.email) {
        const seatRows = await sql`SELECT owner_id FROM bridge_team_seats WHERE teammate_email = ${user.email.trim().toLowerCase()}`;
        if (seatRows.length > 0) return seatRows[0].owner_id;
    }
    return user.id;
};

router.get('/api/team', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();
        
        const workspaceId = await getWorkspaceId(user);
        const rows = await sql`SELECT * FROM bridge_team_seats WHERE owner_id = ${workspaceId} ORDER BY created_at DESC`;
        
        // Fetch the Boss's email safely without querying non-existent tables!
        let ownerEmail = user.email; // Default to the logged-in user's email
        
        // If a teammate is viewing this, fetch the boss's email from bridge_settings
        if (user.id !== workspaceId) {
            const ownerRows = await sql`SELECT creator_email FROM bridge_settings WHERE user_id = ${workspaceId}`;
            if (ownerRows.length > 0 && ownerRows[0].creator_email) {
                ownerEmail = ownerRows[0].creator_email;
            } else {
                ownerEmail = 'Account Owner';
            }
        }

        res.json({ limit: 999, used: rows.length, teammates: rows, owner_email: ownerEmail });
    } catch (error) { 
        console.error("Team API Error:", error);
        res.status(500).json({ error: "Failed to fetch team data" }); 
    }
});

router.post('/api/team/invite', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if (Number(user.role) === 18) return res.status(403).json({ error: "Only the account owner can manage the team." });
        
        const { email, communities } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        await ensureSchema();
        const cleanEmail = email.trim().toLowerCase();
        
        // 1. BILLING CALCULATION
        const tRows = await sql`SELECT count(*) FROM bridge_team_seats WHERE owner_id = ${user.id}`;
        const currentSeats = parseInt(tRows[0].count) || 0;
        const newTotalSeats = currentSeats + 1;
        
        let freeSeats = 0;
        if (Number(user.role) === 17) freeSeats = 6;
        else if (Number(user.role) === 16) freeSeats = 3;

        const billableSeats = Math.max(0, newTotalSeats - freeSeats);

        try { 
            await ensureExpansionsSubscription(user, billableSeats); 
        } catch (e) { 
            return res.status(400).json({ error: e.message || "Failed to initialize subscription add-ons." }); 
        }

        const response = await fetch(`${UNA_BASE_URL}/bridge-connector.php`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
            body: JSON.stringify({ email: cleanEmail, action: 'assign_teammate', level_id: 18 }) 
        });
        
        const responseText = await response.text();
        let result;
        try { result = JSON.parse(responseText); } catch (e) { throw new Error(`Server returned invalid response.`); }
        if (!result.success) throw new Error(result.error || "Failed to upgrade user.");

        await sql`INSERT INTO bridge_team_seats (owner_id, teammate_email) VALUES (${user.id}, ${cleanEmail}) ON CONFLICT (owner_id, teammate_email) DO NOTHING`;

        if (communities && Array.isArray(communities) && communities.length > 0) {
            for (const comm of communities) {
                const lastUnderscore = comm.lastIndexOf('_');
                const module = comm.substring(0, lastUnderscore);
                const id = comm.substring(lastUnderscore + 1);

                const mapResult = await grantCommunityAccess(cleanEmail, module, id);
                const newStatus = mapResult.success ? 'bridged' : 'pending';
                
                // --- ASSIGN "TEAM MEMBER" ROLE INSIDE THE CROWD ---
                if (mapResult.success) {
                    try {
                        await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                            body: JSON.stringify({ email: cleanEmail, action: 'set_community_role', module: module, space_id: id })
                        });
                    } catch (roleErr) { console.error("Internal role upgrade failed", roleErr); }
                }

                await sql`
                    INSERT INTO bridge_manual_users (user_id, email, una_module, una_content_id, status, is_free_teammate)
                    VALUES (${user.id}, ${cleanEmail}, ${module}, ${id}, ${newStatus}, TRUE)
                    ON CONFLICT (user_id, email, una_module, una_content_id) 
                    DO UPDATE SET status = EXCLUDED.status, is_free_teammate = TRUE
                `;
            }
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message || "Server Error" }); }
});

router.post('/api/team/revoke', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if (Number(user.role) === 18) return res.status(403).json({ error: "Only the account owner can manage the team." });

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const cleanEmail = email.trim().toLowerCase();

        const tRows = await sql`SELECT count(*) FROM bridge_team_seats WHERE owner_id = ${user.id}`;
        const currentSeats = parseInt(tRows[0].count) || 0;
        const newTotalSeats = Math.max(0, currentSeats - 1);

        let freeSeats = 0;
        if (Number(user.role) === 17) freeSeats = 6;
        else if (Number(user.role) === 16) freeSeats = 3;

        const billableSeats = Math.max(0, newTotalSeats - freeSeats);

        try { await ensureExpansionsSubscription(user, billableSeats); } catch (e) { console.error(e); }

        await fetch(`${UNA_BASE_URL}/bridge-connector.php`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` }, 
            body: JSON.stringify({ email: cleanEmail, action: 'revoke_teammate', level_id: 18 }) 
        });

        // Pull communities they were mapped to as a teammate
        const mappedRows = await sql`SELECT una_module, una_content_id FROM bridge_manual_users WHERE user_id = ${user.id} AND email = ${cleanEmail} AND is_free_teammate = TRUE`;
        
        for (const row of mappedRows) {
            // Revoke standard Crowd access
            await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                body: JSON.stringify({ email: cleanEmail, action: 'remove', module: row.una_module, space_id: row.una_content_id })
            });

            // Strip them of Team Member Crowd Role just in case
            await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                body: JSON.stringify({ email: cleanEmail, action: 'revoke_community_role', module: row.una_module, space_id: row.una_content_id })
            });
        }

        await sql`DELETE FROM bridge_team_seats WHERE owner_id = ${user.id} AND teammate_email = ${cleanEmail}`;
        await sql`DELETE FROM bridge_manual_users WHERE user_id = ${user.id} AND email = ${cleanEmail} AND is_free_teammate = TRUE`;

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message || "Failed to revoke teammate" }); }
});

router.post('/api/team/manual-map', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        if (Number(user.role) === 18) return res.status(403).json({ error: "Only the account owner can manage the team." });

        const { email, communities } = req.body;
        
        if (!email || !communities || communities.length === 0) return res.status(400).json({ error: "Missing array" });
        
        await ensureSchema();
        const cleanEmail = email.trim().toLowerCase();

        const seatCheck = await sql`SELECT * FROM bridge_team_seats WHERE owner_id = ${user.id} AND teammate_email = ${cleanEmail}`;
        if (seatCheck.length === 0) return res.status(403).json({ error: "Only available to paid seats." });

        let allSuccess = true;
        let lastError = "";

        for (const comm of communities) {
            const lastUnderscore = comm.lastIndexOf('_');
            const module = comm.substring(0, lastUnderscore);
            const id = comm.substring(lastUnderscore + 1);

            const result = await grantCommunityAccess(cleanEmail, module, id);
            const newStatus = result.success ? 'bridged' : 'pending';
            
            if (!result.success) { allSuccess = false; lastError = result.error || "Failed access."; }

            // --- ASSIGN "TEAM MEMBER" ROLE INSIDE THE CROWD ---
            if (result.success) {
                try {
                    await fetch(`${UNA_BASE_URL}/bridge-connector.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${UNA_SECRET}` },
                        body: JSON.stringify({ email: cleanEmail, action: 'set_community_role', module: module, space_id: id })
                    });
                } catch (roleErr) { console.error("Internal role upgrade failed", roleErr); }
            }

            await sql`
                INSERT INTO bridge_manual_users (user_id, email, una_module, una_content_id, status, is_free_teammate)
                VALUES (${user.id}, ${cleanEmail}, ${module}, ${id}, ${newStatus}, TRUE)
                ON CONFLICT (user_id, email, una_module, una_content_id) 
                DO UPDATE SET status = EXCLUDED.status, is_free_teammate = TRUE
            `;
        }

        res.json({ success: true, notice: !allSuccess ? lastError : null });
    } catch (error) { res.status(500).json({ error: "Failed to map teammate" }); }
});

export default router;