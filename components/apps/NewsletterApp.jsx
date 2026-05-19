import React, { useState, useEffect } from 'react';
import { Mail, Settings, Plus, AlignLeft, Type, Link as LinkIcon, Minus, ChevronUp, ChevronDown, Trash2, Edit3, Loader2, CheckCircle2, Send, Image as ImageIcon, Lock, BarChart3, PenTool } from 'lucide-react';

const compileEmailHtml = (blocks) => {
    let html = `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 30px; border-radius: 12px; color: #111111;">`;
    
    blocks.forEach(b => {
        if (b.type === 'header') {
            html += `<h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; text-align: ${b.align || 'left'};">${b.text || 'Heading'}</h2>`;
        } else if (b.type === 'paragraph') {
            html += `<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; text-align: ${b.align || 'left'}; white-space: pre-wrap;">${b.text || 'Type your message...'}</p>`;
        } else if (b.type === 'image') {
            html += `<div style="margin: 0 0 20px 0; text-align: ${b.align || 'center'};">
                ${b.url ? `<img src="${b.url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; display: inline-block;" />` : `<div style="background:#f3f4f6; padding:40px; text-align:center; color:#9ca3af; border-radius:8px;">[Image Placeholder]</div>`}
            </div>`;
        } else if (b.type === 'button') {
            html += `<div style="margin: 25px 0; text-align: ${b.align || 'center'};">
                <a href="${b.url || '#'}" style="background-color: ${b.color || '#9df01c'}; color: ${b.textColor || '#000000'}; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">${b.text || 'Click Here'}</a>
            </div>`;
        } else if (b.type === 'divider') {
            html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />`;
        }
    });

    html += `</div>`;
    return html;
};

export default function NewsletterApp({ session, unaData, activeTab, setActiveTab }) {
    const role = Number(unaData?.user?.role) || 1;
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    const canAccess = isAdmin || [12, 15, 16, 17].includes(role);

    const [campaigns, setCampaigns] = useState([]);
    const [emailSettings, setEmailSettings] = useState({ sender_name: '', reply_to_email: '', footer_text: '' });
    const [isLoadingEmail, setIsLoadingEmail] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [emailSubject, setEmailSubject] = useState('');
    const [emailBlocks, setEmailBlocks] = useState([{ id: Date.now().toString(), type: 'paragraph', text: '', align: 'left' }]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [activeCampaignId, setActiveCampaignId] = useState(null);

    const fetchEmailData = async () => {
        if (!session || !canAccess) return;
        setIsLoadingEmail(true);
        try {
            const [campRes, setRes] = await Promise.all([
                fetch('/api/newsletter/campaigns', { headers: { 'Authorization': `Bearer ${session}` } }),
                fetch('/api/newsletter/settings', { headers: { 'Authorization': `Bearer ${session}` } })
            ]);
            const campData = await campRes.json();
            const setData = await setRes.json();
            if (campData.campaigns) setCampaigns(campData.campaigns);
            if (setData.settings) setEmailSettings(setData.settings);
        } catch (e) {} finally { setIsLoadingEmail(false); }
    };

    useEffect(() => {
        fetchEmailData();
    }, [session, canAccess]);

    const handleImageUpload = async (e, setUrlCallback) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData(); formData.append('file', file);
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) setUrlCallback(result.url);
            else alert("Upload failed.");
        } catch (err) { alert("Image server unreachable."); } 
        finally { setIsUploading(false); }
    };

    const handleSaveEmailSettings = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/newsletter/settings', {
                method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(emailSettings)
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {} finally { setIsSaving(false); }
    };

    const addEmailBlock = (type) => setEmailBlocks([...emailBlocks, { id: Date.now().toString(), type, text: '', url: '', align: 'left', color: '#9df01c', textColor: '#000000' }]);
    const updateEmailBlock = (id, updates) => setEmailBlocks(emailBlocks.map(b => b.id === id ? { ...b, ...updates } : b));
    const removeEmailBlock = (id) => { setEmailBlocks(emailBlocks.filter(b => b.id !== id)); if (selectedBlockId === id) setSelectedBlockId(null); };

    const moveEmailBlock = (index, dir) => {
        if ((index === 0 && dir === -1) || (index === emailBlocks.length - 1 && dir === 1)) return;
        const newBlocks = [...emailBlocks];
        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[index + dir];
        newBlocks[index + dir] = temp;
        setEmailBlocks(newBlocks);
    };

    const handleSaveDraft = async () => {
        if (!emailSubject) return alert("Please add a subject line.");
        setIsSaving(true);
        try {
            const htmlBody = compileEmailHtml(emailBlocks);
            const res = await fetch('/api/newsletter/save', {
                method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeCampaignId, subject: emailSubject, content: JSON.stringify(emailBlocks), html_body: htmlBody })
            });
            const data = await res.json();
            if (data.success) {
                setActiveCampaignId(data.id);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
                fetchEmailData();
            }
        } catch (e) {} finally { setIsSaving(false); }
    };

    const handleSendEmail = async () => {
        if (!emailSettings.sender_name || !emailSettings.reply_to_email) return alert("Please configure your Sender Name and Email in Settings first!");
        if (!emailSubject) return alert("Please add a subject line.");
        if (!window.confirm("Are you sure you want to blast this email to all your active subscribers?")) return;
        
        setIsSaving(true);
        try {
            const htmlBody = compileEmailHtml(emailBlocks);
            const saveRes = await fetch('/api/newsletter/save', {
                method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeCampaignId, subject: emailSubject, content: JSON.stringify(emailBlocks), html_body: htmlBody })
            });
            const saveData = await saveRes.json();
            
            const res = await fetch('/api/newsletter/send', {
                method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: saveData.id })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`Success! Email sent to ${data.count} subscribers.`);
                setActiveCampaignId(null);
                setEmailSubject('');
                setEmailBlocks([{ id: Date.now().toString(), type: 'paragraph', text: '', align: 'left' }]);
                setActiveTab('campaigns');
                fetchEmailData();
            } else { alert(data.error || "Failed to send email."); }
        } catch (e) { alert("Server error."); } finally { setIsSaving(false); }
    };

    const handleDeleteCampaign = async (id) => {
        if (!window.confirm("Delete this campaign forever?")) return;
        try {
            await fetch('/api/newsletter/delete', { method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            fetchEmailData();
        } catch (e) {}
    };

    const loadDraft = (camp) => {
        setActiveCampaignId(camp.id);
        setEmailSubject(camp.subject);
        try { setEmailBlocks(JSON.parse(camp.content) || []); } catch(e) { setEmailBlocks([]); }
        setActiveTab('compose');
    };

    if (!canAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center animate-in fade-in flex flex-col items-center justify-center min-h-[70vh]">
                <div className="bg-[#111] p-10 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden w-full">
                    <Lock size={56} className="text-gray-500 mb-6 mx-auto" />
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Premium Feature</h3>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">The Email Newsletter engine is exclusively available to premium subscribers. Build and blast custom HTML emails directly to your fans!</p>
                    <a href="https://www.selloutcrowds.com/plans" target="_blank" rel="noopener noreferrer" className="bg-[#9df01c] text-black font-black py-4 px-10 rounded-xl uppercase tracking-widest hover:bg-[#8ce015]">Upgrade to Unlock</a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-8">
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 text-white flex items-center gap-3">
                    <Mail className="text-[#9df01c]" size={36} /> Email Newsletters
                </h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    Design and blast rich HTML emails directly to your subscribers.
                </p>
            </div>

            <div className="flex gap-4 mb-6 border-b border-white/5 pb-2">
                <button onClick={() => setActiveTab('campaigns')} className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-[#9df01c] text-[#9df01c]' : 'border-transparent text-gray-500 hover:text-white'}`}>Campaigns</button>
                <button onClick={() => { setActiveCampaignId(null); setEmailSubject(''); setEmailBlocks([{ id: Date.now().toString(), type: 'paragraph', text: '', align: 'left' }]); setActiveTab('compose'); }} className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'compose' ? 'border-[#9df01c] text-[#9df01c]' : 'border-transparent text-gray-500 hover:text-white'}`}>New Draft</button>
                <button onClick={() => setActiveTab('settings')} className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'settings' ? 'border-[#9df01c] text-[#9df01c]' : 'border-transparent text-gray-500 hover:text-white'}`}><Settings size={14}/> Settings</button>
            </div>

            {activeTab === 'settings' && (
                <div className="max-w-2xl bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-2">Sender Profile</h3>
                    <p className="text-xs text-gray-500 mb-8 leading-relaxed">This information will appear in the inbox of your subscribers. When they hit "Reply", the email will go directly to the address you set here.</p>
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 block">Sender Name (E.g. Fantasy Football Advice)</label>
                            <input type="text" value={emailSettings.sender_name} onChange={e => setEmailSettings({...emailSettings, sender_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#9df01c] outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 block">Reply-To Email Address</label>
                            <input type="email" value={emailSettings.reply_to_email} onChange={e => setEmailSettings({...emailSettings, reply_to_email: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#9df01c] outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 block">Custom Footer Text (Optional)</label>
                            <textarea value={emailSettings.footer_text} onChange={e => setEmailSettings({...emailSettings, footer_text: e.target.value})} rows="3" placeholder="P.O. Box 123, City, State..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#9df01c] outline-none resize-none"></textarea>
                        </div>
                        <button onClick={handleSaveEmailSettings} disabled={isSaving} className="w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {saveSuccess ? 'Saved!' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'campaigns' && (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 shadow-2xl min-h-[50vh]">
                    {isLoadingEmail ? <div className="text-center p-10"><Loader2 className="animate-spin text-[#9df01c] mx-auto" /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</th>
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Sent</th>
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Opens</th>
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Clicks</th>
                                        <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map(camp => (
                                        <tr key={camp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 text-sm font-bold text-white max-w-xs truncate pr-4">{camp.subject || '(No Subject)'}</td>
                                            <td className="py-4">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${camp.status === 'sent' ? 'bg-[#9df01c]/10 text-[#9df01c]' : 'bg-white/10 text-gray-400'}`}>
                                                    {camp.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-xs text-gray-400">{camp.sent_at ? new Date(camp.sent_at).toLocaleDateString() : '-'}</td>
                                            <td className="py-4 text-xs font-mono text-[#9df01c]">{camp.status === 'sent' ? `${camp.open_count || 0}` : '-'}</td>
                                            <td className="py-4 text-xs font-mono text-[#38bdf8]">{camp.status === 'sent' ? `${camp.click_count || 0}` : '-'}</td>
                                            <td className="py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {camp.status === 'draft' && <button onClick={() => loadDraft(camp)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"><Edit3 size={14}/></button>}
                                                    <button onClick={() => handleDeleteCampaign(camp.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {campaigns.length === 0 && <tr><td colSpan="6" className="py-10 text-center text-sm text-gray-500 italic">No campaigns found. Start building your first newsletter!</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'compose' && (
                <div className="grid lg:grid-cols-12 gap-6 h-[75vh] min-h-[600px]">
                    <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 shadow-xl flex-shrink-0">
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block">Subject Line</label>
                            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Catchy subject here..." className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#9df01c] outline-none" />
                        </div>

                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 shadow-xl flex-1 flex flex-col">
                            <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Add Block</h3>
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                <button onClick={() => addEmailBlock('header')} className="bg-black border border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 rounded-xl py-3 flex flex-col items-center gap-1 transition-colors text-white text-[10px] font-black uppercase"><Type size={18}/> Heading</button>
                                <button onClick={() => addEmailBlock('paragraph')} className="bg-black border border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 rounded-xl py-3 flex flex-col items-center gap-1 transition-colors text-white text-[10px] font-black uppercase"><AlignLeft size={18}/> Text</button>
                                <button onClick={() => addEmailBlock('image')} className="bg-black border border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 rounded-xl py-3 flex flex-col items-center gap-1 transition-colors text-white text-[10px] font-black uppercase"><ImageIcon size={18}/> Image</button>
                                <button onClick={() => addEmailBlock('button')} className="bg-black border border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 rounded-xl py-3 flex flex-col items-center gap-1 transition-colors text-white text-[10px] font-black uppercase"><LinkIcon size={18}/> Button</button>
                                <button onClick={() => addEmailBlock('divider')} className="bg-black border border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 rounded-xl py-3 flex flex-col items-center gap-1 transition-colors text-white text-[10px] font-black uppercase col-span-2"><Minus size={18}/> Divider</button>
                            </div>

                            {selectedBlockId && (
                                <div className="mt-auto border-t border-white/5 pt-4">
                                    <h3 className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3">Edit Block</h3>
                                    {emailBlocks.filter(b => b.id === selectedBlockId).map(block => (
                                        <div key="editor" className="space-y-3">
                                            {(block.type === 'header' || block.type === 'button') && (
                                                <input type="text" value={block.text} onChange={e => updateEmailBlock(block.id, {text: e.target.value})} placeholder="Text..." className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                                            )}
                                            {block.type === 'paragraph' && (
                                                <textarea value={block.text} onChange={e => updateEmailBlock(block.id, {text: e.target.value})} rows="4" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white resize-none custom-scrollbar"></textarea>
                                            )}
                                            {(block.type === 'button' || block.type === 'image') && (
                                                <input type="text" value={block.url} onChange={e => updateEmailBlock(block.id, {url: e.target.value})} placeholder="URL Link..." className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                                            )}
                                            {block.type === 'image' && (
                                                <label className={`w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-center cursor-pointer text-[10px] font-bold uppercase tracking-widest block transition-colors ${isUploading ? 'opacity-50' : ''}`}>
                                                    {isUploading ? 'Uploading...' : 'Upload Image'}
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateEmailBlock(block.id, {url}))} />
                                                </label>
                                            )}
                                            {block.type === 'button' && (
                                                <div className="flex gap-2">
                                                    <input type="color" value={block.color} onChange={e => updateEmailBlock(block.id, {color: e.target.value})} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" title="Button Color" />
                                                    <input type="color" value={block.textColor} onChange={e => updateEmailBlock(block.id, {textColor: e.target.value})} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" title="Text Color" />
                                                </div>
                                            )}
                                            <div className="flex gap-1 bg-black rounded-lg border border-white/10 p-1 w-max">
                                                <button onClick={() => updateEmailBlock(block.id, {align: 'left'})} className={`px-2 py-1 rounded text-xs font-bold ${block.align==='left'?'bg-white/20':'hover:bg-white/10'}`}>Left</button>
                                                <button onClick={() => updateEmailBlock(block.id, {align: 'center'})} className={`px-2 py-1 rounded text-xs font-bold ${block.align==='center'?'bg-white/20':'hover:bg-white/10'}`}>Center</button>
                                                <button onClick={() => updateEmailBlock(block.id, {align: 'right'})} className={`px-2 py-1 rounded text-xs font-bold ${block.align==='right'?'bg-white/20':'hover:bg-white/10'}`}>Right</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-6 bg-gray-200 rounded-[2rem] overflow-hidden flex flex-col shadow-inner relative border-4 border-[#111]">
                        <div className="bg-gray-300 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-400/30">Email Preview</div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar relative bg-[#f3f4f6]">
                            <div className="bg-white rounded-xl shadow-sm min-h-[400px] overflow-hidden">
                                {emailBlocks.map((block, i) => (
                                    <div 
                                        key={block.id} 
                                        onClick={() => setSelectedBlockId(block.id)}
                                        className={`relative group border-2 p-6 transition-colors cursor-pointer ${selectedBlockId === block.id ? 'border-[#9df01c] bg-[#9df01c]/5' : 'border-transparent hover:border-gray-200'}`}
                                    >
                                        <div className={`absolute -right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${selectedBlockId === block.id ? 'opacity-100 right-2' : ''}`}>
                                            <button onClick={(e) => { e.stopPropagation(); moveEmailBlock(i, -1); }} className="p-1 bg-white border border-gray-200 rounded shadow-sm text-gray-600 hover:text-black"><ChevronUp size={12}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); moveEmailBlock(i, 1); }} className="p-1 bg-white border border-gray-200 rounded shadow-sm text-gray-600 hover:text-black"><ChevronDown size={12}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); removeEmailBlock(block.id); }} className="p-1 bg-red-500 text-white rounded shadow-sm hover:bg-red-600 mt-1"><Trash2 size={12}/></button>
                                        </div>

                                        <div style={{ textAlign: block.align || 'left' }} className="w-full">
                                            {block.type === 'header' && <h2 className="text-2xl font-bold text-black m-0">{block.text || 'Heading'}</h2>}
                                            {block.type === 'paragraph' && <p className="text-base text-gray-800 m-0 whitespace-pre-wrap leading-relaxed">{block.text || 'Type your message...'}</p>}
                                            {block.type === 'image' && (
                                                block.url ? <img src={block.url} className="max-w-full h-auto rounded-lg mx-auto" alt="Block" /> : <div className="bg-gray-100 p-10 text-center text-gray-400 rounded-lg border-2 border-dashed border-gray-300">Image Placeholder</div>
                                            )}
                                            {block.type === 'button' && (
                                                <a href="#" onClick={e=>e.preventDefault()} style={{ backgroundColor: block.color || '#9df01c', color: block.textColor || '#000' }} className="px-6 py-3 rounded-lg font-bold inline-block shadow-sm pointer-events-none">{block.text || 'Click Here'}</a>
                                            )}
                                            {block.type === 'divider' && <hr className="border-t border-gray-200 my-4" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center mt-6 text-[10px] text-gray-400">
                                {emailSettings.footer_text && <p className="mb-2">{emailSettings.footer_text}</p>}
                                <p>Unsubscribe link will be automatically added here.</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 shadow-xl space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-white mb-2">Campaign Actions</h3>
                            <button onClick={handleSaveDraft} disabled={isSaving} className="w-full py-4 rounded-xl font-bold text-xs bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Save Draft
                            </button>
                            <hr className="border-white/5" />
                            <button onClick={handleSendEmail} disabled={isSaving} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-lg shadow-[#9df01c]/20 transition-colors flex items-center justify-center gap-2">
                                <Send size={16} /> Send Blast
                            </button>
                            <p className="text-[9px] text-gray-500 text-center leading-relaxed">This will immediately send the email to all active, bridged subscribers.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}