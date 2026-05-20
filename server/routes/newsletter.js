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
        
        // FIX: Added 'content' to this SELECT statement so the editor actually receives the saved blocks!
        const rows = await sql`SELECT id, subject, content, status, recipient_count, open_count, click_count, sent_at, created_at FROM bridge_newsletters WHERE user_id = ${user.id} ORDER BY id DESC`;
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
    
    // Injecting your exact Sellout Crowds SVG to render purely in monochrome!
    const selloutSvg = `<svg width="24" height="24" viewBox="0 0 362.85 305.65" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="#6b7280"><path d="m321.31,285.9l-17.52-1.66c-2.92-.25-5.84-.61-8.76-.77l-8.77-.55-8.77-.55c-2.92-.19-5.85-.39-8.77-.46l-17.54-.63c-2.92-.13-5.85-.17-8.77-.2l-8.77-.11-8.77-.11c-2.92-.05-5.84.03-8.77.03l-17.53.15-17.52.46c-23.35.76-46.66,2.03-69.94,3.85-5.82.49-11.64.93-17.45,1.46-5.81.56-11.63,1.04-17.43,1.67l-8.71.9-8.71.97c-5.82.66-11.59,1.36-17.46,2.15l1.83,13.13c5.64-.75,11.41-1.46,17.15-2.11l8.62-.96,8.63-.89c5.75-.62,11.52-1.1,17.28-1.65,5.76-.52,11.53-.96,17.3-1.45,23.08-1.8,46.2-3.06,69.32-3.82l17.34-.46,17.34-.15c2.89,0,5.78-.08,8.67-.03l8.66.11,8.66.11c2.89.03,5.78.06,8.66.19l17.31.62c2.89.07,5.76.27,8.64.45l8.63.54,8.63.54c2.88.16,5.74.51,8.61.76l17.2,1.62,1.48-13.17Z"/><path d="m99.19,298.5c-.15.06-.41.09-.72.12.07-.08.47-.17.72-.12Z"/><path d="m87.32,290.56c-.22.06-.91.2-.85.04.39-.05.56-.03.85-.04Z"/><path d="m86.1,290.47c-.05.08-.6.06-.85.11,0-.09.69-.14.85-.11Z"/><path d="m82.83,292.15c-.17.06-.63.15-.85.11.05-.08.6-.06.85-.11Z"/><path d="m81.14,290.86c-.28.11-.78.19-1.45.23.23-.12.93-.17,1.45-.23Z"/><path d="m77.63,298.32c-.74.08-2.23.36-2.77.27.91,0,1.93-.26,2.77-.27Z"/><path d="m75.33,295.45c-.9.28-2.58.24-3.74.49-.18-.14,1.73-.2,2.05-.36.28-.02.5,0,.72,0,.33-.05.62-.18.97-.13Z"/><path d="m63.97,296.18c.03.08-.04.14-.36.17-.09-.02-.13-.06-.12-.12l.48-.05Z"/><path d="m59.4,297.8c-.73.23-2.43.42-3.38.43-.12.04-.12.09-.36.11-.56.09-1.82.18-.6.04,1.49-.29,2.69-.32,4.34-.57Z"/><path d="m58.65,296.25c-.17.07-.47.12-.84.15.08-.09.7-.17.84-.15Z"/><path d="m58,300.59c-.13.09-.76.09-1.08.15.23-.07.81-.19,1.08-.15Z"/><path d="m57.82,296.9c-.29.12-.96.17-1.32.27-.34-.09.87-.21,1.32-.27Z"/><path d="m57.21,296.5c-.23.12-.93.18-1.45.26.3-.11.98-.18,1.45-.26Z"/><path d="m56.93,301.49c-.03.11-.5.16-.84.23.06-.11.55-.15.84-.23Z"/><path d="m56.31,300.78c-.38.14-1.73.27-2.4.34.84-.18,1.48-.25,2.4-.34Z"/><path d="m55.52,296.79c-.6.22-1.53.22-2.05.26.56-.15,1.41-.1,2.05-.26Z"/><path d="m54.1,298.48c-.23.08-.63.14-.96.21-.08-.13.56-.15.96-.21Z"/><path d="m53.01,298.28c-.28.11-.54.11-.96.14.09-.08.68-.09.96-.14Z"/><path d="m51.92,298.01c-.12.1-1.03.23-.85.03.26-.04.23.02.24.07.29-.02.26-.09.6-.1Z"/><path d="m49.68,300.78c.58-.2,1.62-.13,0,0h0Z"/><path d="m48.51,302.12c-.49.13-.97.17-1.56.22.36-.09,1.31-.22,1.56-.22Z"/><path d="m48.16,302.36c.19.08-.78.19-.6.07l.6-.07Z"/><path d="m47.25,304.2c-.16.09-.54.15-.83.17.08-.09.69-.18.83-.17Z"/><path d="m43.91,304.48c-.96.28-1.33.17,0,0h0Z"/><path d="m70.89,301.38c-.2.06-.47.11-.6.19-.39-.09-1.05.09-1.56.09.6-.21,1.28-.09,2.17-.27Z"/><path d="m57.14,300.1c-.29.05-.26-.03-.6.04-.04-.05.11-.07.12-.11-.6.05-.93.14-1.44.2.06-.03.12-.07.12-.11-.66.25-1.48.08-2.89.33,1.33-.34,4.35-.58,5.53-.75-.16.14-1.21.15-1.32.31-.02.1.67-.06.48.11Z"/><path d="m55.53,297.21c-.14.02-.07.04,0,.03-.03.08-.53.08-.6.07.14-.11,1.74-.25.6-.1Z"/><path d="m46.61,298.67v-.13c-.77.11-2,.29-2.54.24.9-.21,2.86-.23,3.49-.52.16.01.45-.02.6,0,2.1-.47,4.44-.52,6.63-.92-.95.46-3.25.26-4.34.75-.19,0,0-.03.12-.05-.98.12-2.74.26-3.97.63Z"/><path d="m47.93,302.65c-.18.08-.51.14-.71.22-.11,0-.46-.27.71-.22Z"/><path d="m289.44,296.4c.54.04,1.14-.05,1.7-.01,1.32.08,2.5.28,3.84.3,1.18,0,2.3-.03,3.53.04.91.06,1.21.04,1.82.05,1.78.05,3.23.25,4.03-.01,1.26-.1,2.84-.08,3.95-.18.17-.02.54.03.61.03,2.82-.25,4.61-.93,7.92-.99.31-.16.53-.42,1.11-.6.26-.08.83-.1,1.02-.19.71-.34.18-.9,1.46-1.09.08-.09-.14-.14-.2-.22.13-.8-.3-1.52.08-2.11-.82-.45-.58-.85-1.21-1.26-.39-.25-1.18-.53-1.69-.79-.58-.29-1.2-.54-1.69-.82.03-.24-.74-.36-.87-.58-.93-.24-1.63-.51-2.57-.75-.08-.09-.31-.16-.32-.26-1.98-.6-3.97-1.31-6.73-1.73-.25-.04-.78-.12-1.09-.14-2.06-.19-5.22-.57-6.27-.99-.37-.06-.37.02-.74-.04-.22-.19-1.29-.53-2.24-.59-.33-.02-.91.15-1.63.15-1.07-.01-2.06-.36-3.02-.37-.44,0-.92.15-1.39.16-1.21.04-3.63-.2-4.63-.33-.79-.1-1.08-.27-1.68-.28-.55,0-.97.14-.93.39-1.59.45-5.58-.23-7.99-.14-1.75-.33-3.45-.02-5.14-.13-.34-.02-.74-.1-1.09-.11-.58-.02-1.35.06-2.1.07-1.27.02-2.39-.03-3.43.01-1.6-.38-2.8-.05-4.15-.11-.51-.02-1-.15-1.57-.16-.48-.02-.95.06-1.47.03-.52-.03-1.07-.15-1.57-.16-.38-.01-.68.04-.98.02-.4-.02-.66-.11-1.09-.11-.45,0-.91.11-1.36.1-1.66-.02-3.45-.18-5.02.05-2.83-.24-5.3.06-8.65-.2-.84.05-1.45.09-2.32.02-.19.02-.19.1-.5.09-1.74-.12-3.58.13-5.37,0-.06.04-.14.07-.25.09-2.48-.2-5.62-.24-7.56-.02-1.51-.15-3.27.05-5.12.07-.87,0-1.74-.07-2.56-.03-1.6.08-3.7.02-5.25.07-.46.02-.9.11-1.35.13-.81.03-1.69-.05-2.56,0-3.35.18-7.19.18-10.12.25-.91.02-1.68.15-2.69.21-1.68.11-3.43-.02-5.11.07-.42.02-.83.1-1.22.12-1.01.06-1.98.02-3.04.06-2.61.08-5.22.32-7.68.29-3.12.35-7.69.47-11.33.66-.81.21-1.59.09-2.44.15-2.6.18-5.92.51-8.65.55-5.72.48-11.56.86-17.38,1.25-5.82.45-11.63.92-17.27,1.49-.89-.07-2.26.1-3.03.27-.17-.07-.69-.02-1.09-.02-1.4.33-3.19.3-4.98.5-.44.25-1.53.18-2.19.39-.3-.09.38-.13-.12-.15-1.13.48-5.05.62-6.8.87.12,0,.15.05,0,.07-.43-.06-.62.15-1.09.18-3.18.33-5.42.92-8.12,1.31-.35-.02-1.27-.1-1.57.07.49-.02,1.11-.09,1.09.07-.82.02-1.89.2-2.42.37-1.01.11-1.53.07-2.42.27-.22.02.23.14-.24.18-1.42.05-2.12.25-3.39.3-.35.19-1.83.38-2.3.35-.41.11.47.08.12.15-1.14.16-2.2.34-3.27.35-.25.1-.42.21-.85.28-.29.04.07-.15-.36-.06-.4.13.33.12.24.24-.57.11-.45.18-.72.3-.81,0-1.34.23-2.06.36-.74.13-1.58.16-2.3.29-.62.1-.87.24-1.57.32-.57.06-1.06,0-1.69.08-.33.06.24.09-.24.16-2.21.29-4.42.57-6.04.96,2.48-.53,4.34-.47,6.52-.95.35.11.98-.2,1.33-.04.14-.1-.38-.1.12-.14.61-.09,1.09-.12,1.81-.24.23.11.73.12.48.31-2.19.22-5.13.77-7.73,1.07-.79.1-1.62.06-2.05.31,1.16-.19,2.12-.08,3.14-.16,1.32-.11,2.7-.46,3.99-.55.36-.02.52.02.84-.02.26-.03.68-.17.97-.19.31-.03.34.04.6,0,.55-.07.96-.22,1.57-.28,1.02-.1,2.03-.08,3.14-.24.21.04.13.19-.12.24-1.32.14-1.55.17-2.9.31.15,0,.25.02.24.07-.42.03-.57,0-.85.11,1-.11.94.15.61.3-2.5.21-5.55.64-7.61.76-.22.09-.35.2-.72.26-2.3.34-4.89.55-7.36.9,2.84-.12,5.78-.59,9.05-1,.13.02.04.12.36.06,1.39-.24,3.02-.38,4.1-.52.5.09.98.18,1.45.28,3.43-.47,6-.17,9.29-.46,0,.1.25.1.36.16-.26.1-.42.23-.72.32-.54.06-1.09.16-1.57.14-2.75.54-6.7.77-10.13,1.28-.4.2-.06.29.24.4,1.67-.08,3.16-.46,4.94-.44.67.32.03.65-1.32.81-2.25.27-6.13.63-7.59.73-6.57.94-13.12,1.59-19.84,2.6,3.76-.37,7.19-1.02,10.57-1.24-.02-.07.1-.11.36-.14,3.31-.32,6.98-.77,9.87-1.18,1.24.11,3.56-.41,4.82-.3-.27.4-1.26.67-2.53.89,1.3-.16,2.52-.16,3.61-.25.9-.07,2.43-.34,2.89-.31.11,0-.09.1.12.09-.37.03.65-.09.72-.1.48-.09.39-.11.96-.16.74-.06.73-.06,1.2-.01,2.56-.18,5.04-.53,7.59-.69.27-.02.8-.07.84-.07.24,0,.04.08.36.07.18,0,.09-.08.36-.1,1-.06,2.14-.14,3.13-.24,2.49-.27,5.45-.41,7.48-.59.45-.01-.13.15.48.09,3.51-.21,7.22-.45,10.97-.73.28-.01.07.15.48.09.52-.02.38-.17.85-.19.29.02.56.05.72.12,4.31-.18,8.73-.63,13.16-1,4.13-.36,8.28-.6,12.2-.84,3.09-.2,6.05-.51,8.82-.57,1.85-.16,3.59-.29,5.29-.39,1.7-.08,3.38-.16,5.11-.24,2.51-.12,5.27-.16,7.38-.33.36-.03.79-.12,1.22-.14.64-.03,1.29.05,1.93.03,1.73-.07,3.49-.28,5.21-.35,1.93-.07,3.79-.08,5.68-.12,1.07-.02,2.09-.15,3.15-.19.7-.02,1.44.04,2.17.02,2.04-.06,4.12-.26,6.06-.28,2.59-.02,5.24.02,7.86-.16,2.9.06,6.42.04,9.19-.04,2.25.24,4.59-.05,7.13,0,.27,0,.45.05.72.06,1.92.08,3.96.02,5.9-.03,1.94-.02,3.79-.04,5.35.07,1.17-.15,2.17.04,3.26.1,1.17.06,2.26-.04,3.39-.03.37,0,.71.07,1.08.09,1.14.04,2.26-.05,3.52-.06,1.88,0,3.88.3,6.03.15,1.66.12,4.12.39,6.03.3,3.21.36,6.47.19,9.77.42,1.11.08,2.12.29,3.25.17,1.16.22,2.55.16,3.97.24,1.4.07,2.86.22,4.32.36,2.08.19,4.68.21,6.22.66.67.78,2.11-.21,3.76.04.87.2.74.4,1.1.69.78.16,1.52.14,2.29.13.89.13,1.51.5,2.7.58Zm-211.93-2.69s-.03-.06-.12-.05c.24-.18.84-.01.12.05Zm-.24.09c-1,.12-2.4.41-3.14.37-.2.02.19.17-.12.24-.44-.04-.95-.04-1.69.03-.08-.26,1.41-.25,1.45-.5.57-.04.85-.05,1.09-.2,1.17-.03,1.41-.22,2.3-.22-.22.18.17.1.12.28Z"/></g></svg>`;

    if (settings.social_links && Array.isArray(settings.social_links)) {
        const activeSocials = settings.social_links.filter(l => l.url && l.url.trim() !== '');
        if (activeSocials.length > 0) {
            socialHtml = `<div style="text-align:center; margin-top: 20px; margin-bottom: 10px;">`;
            activeSocials.forEach(link => {
                let url = link.url.trim();
                if (!url.startsWith('http') && !url.startsWith('mailto:')) url = `https://${url}`;
                
                if (link.id === 'sellout') {
                    socialHtml += `<a href="${url}" style="display:inline-block; margin:0 8px; text-decoration:none;" title="${link.title}">${selloutSvg}</a>`;
                } else {
                    socialHtml += `<a href="${url}" style="display:inline-block; margin:0 8px; text-decoration:none;"><img src="${link.icon}" width="24" height="24" alt="${link.title}" style="display:block; border:none;" /></a>`;
                }
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
        console.error("SES Test Error:", err);
        res.status(500).json({ error: "AWS Error: " + (err.message || "Unknown error") }); 
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
        let lastError = null;
        
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
                lastError = err;
                await sql`INSERT INTO bridge_email_logs (user_id, newsletter_id, recipient_email, status) VALUES (${user.id}, ${id}, ${email}, 'failed')`;
            }
        }

        await sql`UPDATE bridge_newsletters SET status = 'sent', sent_at = NOW(), recipient_count = ${successCount} WHERE id = ${id}`;
        
        if (successCount === 0 && lastError) {
            throw lastError; 
        }

        res.json({ success: true, count: successCount });

    } catch (err) { 
        console.error("SES Send Error:", err);
        res.status(500).json({ error: "AWS Error: " + (err.message || "Unknown error") }); 
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