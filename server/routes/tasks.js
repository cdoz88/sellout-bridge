import express from 'express';
import { sql, getAuthenticatedUser, ensureSchema, ADMIN_EMAILS } from '../config.js';

const router = express.Router();

// --- WORKSPACE ENGINE ---
const getWorkspaceId = async (user) => {
    if (Number(user.role) === 18 && user.email) {
        const seatRows = await sql`SELECT owner_id FROM bridge_team_seats WHERE teammate_email = ${user.email.trim().toLowerCase()}`;
        if (seatRows.length > 0) return seatRows[0].owner_id;
    }
    return user.id;
};

// 1. FETCH ALL DATA
router.get('/api/tasks/data', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureSchema();

        const workspaceId = await getWorkspaceId(user);
        const isAdmin = Number(user.role) === 3 || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || user.id === workspaceId;

        // Fetch Projects
        let projects = await sql`SELECT * FROM bridge_projects WHERE user_id = ${workspaceId} ORDER BY id DESC`;
        
        // Filter out admin-only projects for standard teammates
        if (!isAdmin) {
            projects = projects.filter(p => !p.admin_only);
        }

        const projectIds = projects.map(p => p.id);
        
        // Fetch Tasks (Only for visible projects)
        let tasks = [];
        let comments = [];

        if (projectIds.length > 0) {
            tasks = await sql`SELECT * FROM bridge_tasks WHERE user_id = ${workspaceId} AND project_id = ANY(${projectIds}) ORDER BY sort_order ASC, id DESC`;
            
            const taskIds = tasks.map(t => t.id);
            if (taskIds.length > 0) {
                comments = await sql`SELECT * FROM bridge_task_comments WHERE task_id = ANY(${taskIds}) ORDER BY timestamp ASC`;
            }
        }

        // Format data to match the frontend state expectations
        const formattedProjects = projects.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            icon: p.icon,
            isArchived: p.is_archived,
            adminOnly: p.admin_only
        }));

        const formattedTasks = tasks.map(t => {
            const taskComments = comments.filter(c => c.task_id === t.id).map(c => ({
                id: c.id,
                userId: c.user_id,
                text: c.text,
                timestamp: c.timestamp
            }));

            return {
                id: t.id,
                projectId: t.project_id,
                title: t.title,
                description: t.description,
                status: t.status,
                dueDate: t.due_date ? t.due_date.toISOString().split('T')[0] : '',
                assigneeId: t.assignee_id,
                tags: t.tags ? (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags) : [],
                files: t.files ? (typeof t.files === 'string' ? JSON.parse(t.files) : t.files) : [],
                sortOrder: t.sort_order,
                completedAt: t.completed_at,
                completedBy: t.completed_by,
                comments: taskComments
            };
        });

        res.json({ success: true, projects: formattedProjects, tasks: formattedTasks });

    } catch (error) {
        console.error("Failed to fetch task data:", error);
        res.status(500).json({ error: "Failed to fetch task manager data." });
    }
});

// 2. SAVE PROJECT
router.post('/api/tasks/projects/save', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id, name, color, icon, adminOnly } = req.body;
        if (!name) return res.status(400).json({ error: "Project name is required." });

        const workspaceId = await getWorkspaceId(user);
        const isAdminOnly = adminOnly ? true : false;

        if (id) {
            await sql`UPDATE bridge_projects SET name = ${name}, color = ${color}, icon = ${icon}, admin_only = ${isAdminOnly} WHERE id = ${id} AND user_id = ${workspaceId}`;
            res.json({ success: true, id });
        } else {
            const result = await sql`INSERT INTO bridge_projects (user_id, name, color, icon, admin_only) VALUES (${workspaceId}, ${name}, ${color}, ${icon}, ${isAdminOnly}) RETURNING id`;
            res.json({ success: true, id: result[0].id });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to save project." });
    }
});

// 3. ARCHIVE / RESTORE PROJECT
router.post('/api/tasks/projects/archive', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id, isArchived } = req.body;
        const workspaceId = await getWorkspaceId(user);

        await sql`UPDATE bridge_projects SET is_archived = ${isArchived} WHERE id = ${id} AND user_id = ${workspaceId}`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update project status." });
    }
});

// 4. DELETE PROJECT PERMANENTLY
router.post('/api/tasks/projects/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id } = req.body;
        const workspaceId = await getWorkspaceId(user);

        // Delete associated tasks and comments first to keep DB clean
        const tasks = await sql`SELECT id FROM bridge_tasks WHERE project_id = ${id} AND user_id = ${workspaceId}`;
        const taskIds = tasks.map(t => t.id);
        
        if (taskIds.length > 0) {
            await sql`DELETE FROM bridge_task_comments WHERE task_id = ANY(${taskIds})`;
            await sql`DELETE FROM bridge_tasks WHERE id = ANY(${taskIds})`;
        }

        await sql`DELETE FROM bridge_projects WHERE id = ${id} AND user_id = ${workspaceId}`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete project." });
    }
});

// 5. SAVE TASK
router.post('/api/tasks/save', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const { id, projectId, title, description, status, dueDate, assigneeId, tags, files } = req.body;
        if (!title || !projectId) return res.status(400).json({ error: "Missing required fields." });

        const workspaceId = await getWorkspaceId(user);
        const safeTags = JSON.stringify(tags || []);
        const safeFiles = JSON.stringify(files || []);
        const targetDate = dueDate || null;
        const targetAssignee = assigneeId || null;

        if (id) {
            // Check if status is changing to 'done'
            const oldTask = await sql`SELECT status FROM bridge_tasks WHERE id = ${id}`;
            let completedAt = null;
            let completedBy = null;

            if (status === 'done' && oldTask.length > 0 && oldTask[0].status !== 'done') {
                completedAt = new Date();
                completedBy = user.id;
                await sql`UPDATE bridge_tasks SET project_id = ${projectId}, title = ${title}, description = ${description}, status = ${status}, due_date = ${targetDate}, assignee_id = ${targetAssignee}, tags = ${safeTags}, files = ${safeFiles}, completed_at = ${completedAt}, completed_by = ${completedBy} WHERE id = ${id} AND user_id = ${workspaceId}`;
            } else {
                await sql`UPDATE bridge_tasks SET project_id = ${projectId}, title = ${title}, description = ${description}, status = ${status}, due_date = ${targetDate}, assignee_id = ${targetAssignee}, tags = ${safeTags}, files = ${safeFiles} WHERE id = ${id} AND user_id = ${workspaceId}`;
            }
            res.json({ success: true, id });
        } else {
            const result = await sql`INSERT INTO bridge_tasks (user_id, project_id, title, description, status, due_date, assignee_id, tags, files) VALUES (${workspaceId}, ${projectId}, ${title}, ${description || ''}, ${status || 'todo'}, ${targetDate}, ${targetAssignee}, ${safeTags}, ${safeFiles}) RETURNING id`;
            res.json({ success: true, id: result[0].id });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to save task." });
    }
});

// 6. REORDER TASKS (Drag & Drop)
router.post('/api/tasks/reorder', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { tasks } = req.body; // Array of { id, sortOrder, status }
        const workspaceId = await getWorkspaceId(user);

        if (tasks && Array.isArray(tasks)) {
            for (const t of tasks) {
                await sql`UPDATE bridge_tasks SET sort_order = ${t.sortOrder}, status = ${t.status} WHERE id = ${t.id} AND user_id = ${workspaceId}`;
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save order." });
    }
});

// 7. DELETE TASK
router.post('/api/tasks/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id } = req.body;
        const workspaceId = await getWorkspaceId(user);

        // Delete files from image server first
        const taskRows = await sql`SELECT files FROM bridge_tasks WHERE id = ${id} AND user_id = ${workspaceId}`;
        if (taskRows.length > 0 && taskRows[0].files) {
            try {
                const files = typeof taskRows[0].files === 'string' ? JSON.parse(taskRows[0].files) : taskRows[0].files;
                for (const file of files) {
                    if (file.url) {
                        await fetch(`https://api.fytsolutions.com/api.php?action=delete_file&fileUrl=${encodeURIComponent(file.url)}`);
                    }
                }
            } catch(e) { console.error("Failed to delete attachments from server"); }
        }

        await sql`DELETE FROM bridge_task_comments WHERE task_id = ${id}`;
        await sql`DELETE FROM bridge_tasks WHERE id = ${id} AND user_id = ${workspaceId}`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete task." });
    }
});

// 8. ADD COMMENT
router.post('/api/tasks/comments/add', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const { taskId, text } = req.body;
        if (!taskId || !text) return res.status(400).json({ error: "Missing info." });

        const result = await sql`INSERT INTO bridge_task_comments (task_id, user_id, text) VALUES (${taskId}, ${user.id}, ${text}) RETURNING id, timestamp`;
        
        res.json({ 
            success: true, 
            comment: { 
                id: result[0].id, 
                userId: user.id, 
                text: text, 
                timestamp: result[0].timestamp 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to add comment." });
    }
});

export default router;