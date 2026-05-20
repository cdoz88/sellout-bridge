import express from 'express';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { sql, getAuthenticatedUser, ensureSchema } from '../config.js';

const router = express.Router();

const sesClient = new SESClient({ 
    region: process.env.AWS_REGION || 'us-east-1' 
});

const PLATFORM_SENDER_EMAIL = process.env.SES_FROM_EMAIL || 'updates@selloutcrowds.com';
const AWS_CONFIG_SET = 'SelloutCrowdsMetrics'; 

const ensureNewsletterAnalytics = async () => {
    await ensureSchema();
    try {
        await sql`ALTER TABLE bridge_newsletters ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0`;
        await sql`ALTER TABLE bridge_newsletters ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0`;
    } catch(e) {}
};

// --- 1. SETTINGS (Sender Name, Reply-To, Socials) ---
router.get('/api/newsletter/settings', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureNewsletterAnalytics();
        
        const rows = await sql`SELECT sender_name, reply_to_email, footer_text, social_links FROM bridge_newsletter_settings WHERE user_id = ${user.id}`;
        res.json({ settings: rows.length > 0 ? rows[0] : { sender_name: user.name || '', reply_to_email: user.email || '', footer_text: '', social_links: [] } });
    } catch (err) { res.status(500).json({ error: "Failed to fetch settings." }); }
});

router.post('/api/newsletter/settings', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        const { sender_name, reply_to_email, footer_text, social_links } = req.body;
        
        await sql`
            INSERT INTO bridge_newsletter_settings (user_id, sender_name, reply_to_email, footer_text, social_links) 
            VALUES (${user.id}, ${sender_name}, ${reply_to_email}, ${footer_text || ''}, ${social_links ? JSON.stringify(social_links) : '[]'})
            ON CONFLICT (user_id) DO UPDATE SET 
            sender_name = EXCLUDED.sender_name, reply_to_email = EXCLUDED.reply_to_email, footer_text = EXCLUDED.footer_text, social_links = EXCLUDED.social_links
        `;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to save settings." }); }
});

// --- 2. DRAFTS & CAMPAIGNS ---
router.get('/api/newsletter/campaigns', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        await ensureNewsletterAnalytics();
        
        const rows = await sql`SELECT id, subject, status, recipient_count, open_count, click_count, sent_at, created_at FROM bridge_newsletters WHERE user_id = ${user.id} ORDER BY id DESC`;
        res.json({ campaigns: rows });
    } catch (err) { res.status(500).json({ error: "Failed to fetch campaigns." }); }
});

router.get('/api/newsletter/campaigns/:id', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const rows = await sql`SELECT * FROM bridge_newsletters WHERE id = ${req.params.id} AND user_id = ${user.id}`;
        if (rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json({ campaign: rows[0] });
    } catch (err) { res.status(500).json({ error: "Failed to fetch campaign." }); }
});

router.post('/api/newsletter/save', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id, subject, content, html_body } = req.body;
        
        if (id) {
            await sql`UPDATE bridge_newsletters SET subject = ${subject}, content = ${content}, html_body = ${html_body} WHERE id = ${id} AND user_id = ${user.id}`;
            res.json({ success: true, id });
        } else {
            const result = await sql`INSERT INTO bridge_newsletters (user_id, subject, content, html_body) VALUES (${user.id}, ${subject}, ${content}, ${html_body}) RETURNING id`;
            res.json({ success: true, id: result[0].id });
        }
    } catch (err) { res.status(500).json({ error: "Failed to save draft." }); }
});

router.post('/api/newsletter/delete', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id } = req.body;
        await sql`DELETE FROM bridge_newsletters WHERE id = ${id} AND user_id = ${user.id}`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to delete campaign." }); }
});

// --- 3. THE AWS SENDING ENGINE ---
const buildFinalHtml = (campaign, settings, unsubscribeLink) => {
    let socialHtml = '';
    if (settings.social_links && Array.isArray(settings.social_links)) {
        const activeSocials = settings.social_links.filter(l => l.url && l.url.trim() !== '');
        if (activeSocials.length > 0) {
            socialHtml = `<div style="text-align:center; margin-top: 20px; margin-bottom: 10px;">`;
            activeSocials.forEach(link => {
                let url = link.url.trim();
                if (!url.startsWith('http') && !url.startsWith('mailto:')) url = `https://${url}`;
                socialHtml += `<a href="${url}" style="display:inline-block; margin:0 8px; text-decoration:none;"><img src="${link.icon}" width="24" height="24" alt="${link.title}" style="display:block; border:none;" /></a>`;
            });
            socialHtml += `</div>`;
        }
    }

    return `
        ${campaign.html_body}
        <br><br><hr style="border:none; border-top:1px solid #eaeaea; margin:20px 0;">
        <div style="font-size:12px; color:#6b7280; text-align:center; font-family:sans-serif;">
            ${socialHtml}
            ${settings.footer_text ? `<p style="margin-top:15px; margin-bottom:15px;">${settings.footer_text}</p>` : ''}
            <p>You received this email because you are subscribed to ${settings.sender_name}.</p>
            <p><a href="${unsubscribeLink}" style="color:#ef4444; text-decoration:underline;">Click here to unsubscribe</a></p>
        </div>
    `;
};

router.post('/api/newsletter/send-test', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id, test_email } = req.body;
        if (!id || !test_email) return res.status(400).json({ error: "Missing campaign ID or test email" });

        const campaigns = await sql`SELECT * FROM bridge_newsletters WHERE id = ${id} AND user_id = ${user.id}`;
        if (campaigns.length === 0) return res.status(400).json({ error: "Invalid campaign." });
        const campaign = campaigns[0];

        const settingsDb = await sql`SELECT * FROM bridge_newsletter_settings WHERE user_id = ${user.id}`;
        const settings = settingsDb.length > 0 ? settingsDb[0] : { sender_name: user.name, reply_to_email: user.email, footer_text: '', social_links: [] };

        const finalHtml = buildFinalHtml(campaign, settings, '#');

        const params = {
            Source: `"${settings.sender_name}" <${PLATFORM_SENDER_EMAIL}>`,
            ReplyToAddresses: [settings.reply_to_email],
            Destination: { ToAddresses: [test_email] },
            Message: {
                Subject: { Data: "[TEST] " + campaign.subject, Charset: "UTF-8" },
                Body: { Html: { Data: finalHtml, Charset: "UTF-8" } }
            }
        };

        const command = new SendEmailCommand(params);
        await sesClient.send(command);

        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: "Failed to send test email." }); 
    }
});

router.post('/api/newsletter/send', async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req.headers.authorization);
        if (!user) return res.status(401).json({ error: "Not authenticated" });
        
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing campaign ID" });

        const campaigns = await sql`SELECT * FROM bridge_newsletters WHERE id = ${id} AND user_id = ${user.id}`;
        if (campaigns.length === 0 || campaigns[0].status === 'sent') return res.status(400).json({ error: "Invalid or already sent campaign." });
        const campaign = campaigns[0];

        const settingsDb = await sql`SELECT * FROM bridge_newsletter_settings WHERE user_id = ${user.id}`;
        const settings = settingsDb.length > 0 ? settingsDb[0] : { sender_name: user.name, reply_to_email: user.email, footer_text: '', social_links: [] };

        const audienceDb = await sql`
            SELECT email FROM bridge_customers WHERE creator_id = ${user.id} AND bridge_status = 'bridged'
            UNION
            SELECT email FROM bridge_patreon_users WHERE creator_id = ${user.id} AND status = 'bridged'
            UNION
            SELECT email FROM bridge_manual_users WHERE user_id = ${user.id} AND status = 'bridged'
        `;
        
        const unsubDb = await sql`SELECT email FROM bridge_newsletter_unsubscribes WHERE user_id = ${user.id}`;
        const unsubSet = new Set(unsubDb.map(u => u.email.toLowerCase()));
        const validEmails = audienceDb.map(u => u.email).filter(email => !unsubSet.has(email.toLowerCase()));

        if (validEmails.length === 0) {
            return res.status(400).json({ error: "You have no active subscribers to send this to!" });
        }

        let successCount = 0;
        
        for (const email of validEmails) {
            const unsubToken = Buffer.from(JSON.stringify({ u: user.id, e: email })).toString('base64');
            const unsubscribeLink = `https://bridge.selloutcrowds.com/api/newsletter/unsubscribe?token=${unsubToken}`;
            
            const finalHtml = buildFinalHtml(campaign, settings, unsubscribeLink);

            const params = {
                Source: `"${settings.sender_name}" <${PLATFORM_SENDER_EMAIL}>`,
                ReplyToAddresses: [settings.reply_to_email],
                Destination: { ToAddresses: [email] },
                Message: {
                    Subject: { Data: campaign.subject, Charset: "UTF-8" },
                    Body: { Html: { Data: finalHtml, Charset: "UTF-8" } }
                },
                ConfigurationSetName: AWS_CONFIG_SET, 
                Tags: [
                    { Name: 'campaign_id', Value: String(id) },
                    { Name: 'user_id', Value: String(user.id) }
                ]
            };

            try {
                const command = new SendEmailCommand(params);
                const result = await sesClient.send(command);
                await sql`INSERT INTO bridge_email_logs (user_id, newsletter_id, recipient_email, aws_message_id) VALUES (${user.id}, ${id}, ${email}, ${result.MessageId})`;
                successCount++;
            } catch (err) {
                await sql`INSERT INTO bridge_email_logs (user_id, newsletter_id, recipient_email, status) VALUES (${user.id}, ${id}, ${email}, 'failed')`;
            }
        }

        await sql`UPDATE bridge_newsletters SET status = 'sent', sent_at = NOW(), recipient_count = ${successCount} WHERE id = ${id}`;
        res.json({ success: true, count: successCount });

    } catch (err) { 
        res.status(500).json({ error: "A critical error occurred while sending the campaign." }); 
    }
});

// --- 4. AWS ANALYTICS WEBHOOK ---
router.post('/api/newsletter/aws-events', express.text({type: '*/*'}), async (req, res) => {
    try {
        const payload = JSON.parse(req.body);

        if (payload.Type === 'SubscriptionConfirmation') {
            await fetch(payload.SubscribeURL);
            return res.status(200).send('Confirmed');
        }

        if (payload.Type === 'Notification') {
            const message = JSON.parse(payload.Message);
            const eventType = message.eventType; 
            
            const tags = message.mail?.tags || {};
            const campaignId = tags.campaign_id ? tags.campaign_id[0] : null;
            const userId = tags.user_id ? tags.user_id[0] : null;
            const recipientEmail = message.mail?.destination ? message.mail.destination[0] : null;

            if (campaignId) {
                if (eventType === 'Open') {
                    await sql`UPDATE bridge_newsletters SET open_count = open_count + 1 WHERE id = ${campaignId}`;
                } 
                else if (eventType === 'Click') {
                    await sql`UPDATE bridge_newsletters SET click_count = click_count + 1 WHERE id = ${campaignId}`;
                }
            }

            if (userId && recipientEmail && (eventType === 'Bounce' || eventType === 'Complaint')) {
                await sql`INSERT INTO bridge_newsletter_unsubscribes (user_id, email) VALUES (${userId}, ${recipientEmail}) ON CONFLICT DO NOTHING`;
            }
        }
        res.status(200).send('OK');
    } catch (e) {
        res.status(500).send('Error');
    }
});

// --- 5. FAN UNSUBSCRIBE ROUTE ---
router.get('/api/newsletter/unsubscribe', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send("Invalid link.");

        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('ascii'));
        if (!decoded.u || !decoded.e) return res.status(400).send("Invalid token.");

        await sql`INSERT INTO bridge_newsletter_unsubscribes (user_id, email) VALUES (${decoded.u}, ${decoded.e}) ON CONFLICT DO NOTHING`;

        res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:50px; max-width:500px; margin:0 auto; background:#111; color:#fff; border-radius: 20px;">
                <h1 style="color:#9df01c;">Unsubscribed</h1>
                <p style="color:#aaa;">You have been successfully removed from this creator's mailing list.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send("Failed to process unsubscription.");
    }
});

// --- 6. AUTO-CLEANER CRON JOB ---
router.get('/api/cron/clean-newsletters', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        await sql`DELETE FROM bridge_newsletters WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days'`;
        await sql`DELETE FROM bridge_newsletters WHERE status = 'draft' AND created_at < NOW() - INTERVAL '30 days'`;

        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: "Cron execution failed" }); 
    }
});

export default router;