import React, { useState, useEffect } from 'react';
// FIX: Imported Settings, UploadCloud, and X icons!
import { Camera, Save, Loader2, Share2, QrCode, Download, Link2, MonitorSmartphone, Settings, UploadCloud, X } from 'lucide-react';

const DEFAULT_CARD = {
    name: "Your Name",
    title: "Your Title",
    company: "Your Company",
    phone: "(555) 555-5555",
    email: "email@example.com",
    website: "yourwebsite.com",
    sellout: "",
    twitter: "",
    linkedin: "",
    avatarUrl: "",
    theme: "#9df01c",
    textColor: "#000000"
};

// --- THE PUBLIC CARD COMPONENT (Used for preview and public sharing) ---
export const PublicCardView = ({ data }) => {
    const isDarkText = data.textColor === '#000000';

    const handleSaveContact = () => {
        const escapeVCardValue = (val) => (val || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
        
        let parts = ['BEGIN:VCARD', 'VERSION:3.0'];
        const nameParts = (data.name || 'Contact').trim().split(/\s+/);
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');

        parts.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)}`);
        parts.push(`FN:${escapeVCardValue(data.name)}`);
        if (data.company) parts.push(`ORG:${escapeVCardValue(data.company)}`);
        if (data.title) parts.push(`TITLE:${escapeVCardValue(data.title)}`);
        if (data.phone) parts.push(`TEL;TYPE=WORK,VOICE:${data.phone}`);
        if (data.email) parts.push(`EMAIL:${data.email}`);
        if (data.website) parts.push(`URL:https://${data.website.replace(/^https?:\/\//,'')}`);
        parts.push('END:VCARD');

        const blob = new Blob([parts.join('\n')], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${(data.name || 'contact').replace(/\s/g, '_')}.vcf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-[#111] rounded-3xl shadow-2xl border border-white/5 overflow-hidden font-sans">
            <div className="relative h-32" style={{ backgroundColor: data.theme }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                    {data.avatarUrl ? (
                        <img src={data.avatarUrl} className="w-24 h-24 rounded-full border-4 border-[#111] object-cover bg-[#0a0a0a]" alt="Profile" />
                    ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-[#111] bg-[#1a1a1a] flex items-center justify-center text-3xl font-black" style={{ color: data.theme }}>
                            {data.name.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="pt-16 pb-8 px-6 text-center">
                <h1 className="text-2xl font-black text-white">{data.name}</h1>
                <p className="text-sm font-medium text-gray-400 mt-1">{data.title}</p>
                <p className="text-sm font-bold mt-1" style={{ color: data.theme }}>{data.company}</p>

                <div className="mt-8 space-y-3">
                    {data.phone && (
                        <a href={`tel:${data.phone.replace(/\D/g, '')}`} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: data.theme, color: data.textColor }}>📞</div>
                            <span className="text-sm font-bold text-gray-300">{data.phone}</span>
                        </a>
                    )}
                    {data.email && (
                        <a href={`mailto:${data.email}`} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: data.theme, color: data.textColor }}>✉️</div>
                            <span className="text-sm font-bold text-gray-300 truncate">{data.email}</span>
                        </a>
                    )}
                    {data.website && (
                        <a href={`https://${data.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: data.theme, color: data.textColor }}>🌐</div>
                            <span className="text-sm font-bold text-gray-300 truncate">{data.website}</span>
                        </a>
                    )}
                </div>

                <div className="mt-6 flex justify-center gap-4">
                    {data.sellout && <a href={`https://${data.sellout.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors"><Link2 size={24}/></a>}
                    {data.linkedin && <a href={`https://${data.linkedin.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors"><Link2 size={24}/></a>}
                    {data.twitter && <a href={`https://${data.twitter.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors"><Link2 size={24}/></a>}
                </div>

                <button onClick={handleSaveContact} className="mt-8 w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: data.theme, color: data.textColor }}>
                    <Download size={16} /> Save to Contacts
                </button>
            </div>
        </div>
    );
};

// --- THE BUILDER APP (For the Creator Hub) ---
export default function BusinessCardApp({ session }) {
    const [cardData, setCardData] = useState(DEFAULT_CARD);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    useEffect(() => {
        if (!session) return;
        fetch('/api/get-card', { headers: { 'Authorization': `Bearer ${session}` } })
            .then(res => res.json())
            .then(data => {
                if (data.card) setCardData(data.card);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/save-card', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ card: cardData })
            });
            setTimeout(() => setIsSaving(false), 1000);
        } catch (err) {
            alert("Failed to save card.");
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // Using your identical FYT Solutions architecture for image hosting!
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setCardData({ ...cardData, avatarUrl: result.url });
            } else {
                alert("Upload failed.");
            }
        } catch (err) {
            alert("Image server unreachable.");
        } finally {
            setIsUploading(false);
        }
    };

    const getShareUrl = () => {
        const base64Data = btoa(JSON.stringify(cardData));
        return `${window.location.origin}/#${base64Data}`;
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(getShareUrl());
        alert("Public link copied to clipboard!");
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/> Loading Builder...</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white">Card Builder</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Design your Digital Business Card.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowQrModal(true)} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                        <QrCode size={14} /> Get QR Code
                    </button>
                    <button onClick={copyShareLink} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                        <Share2 size={14} /> Copy Link
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                
                {/* LEFT: THE FORM */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Settings size={18} className="text-[#9df01c]"/> Core Details</h3>
                        
                        <div className="flex items-center gap-6 mb-6">
                            {cardData.avatarUrl ? (
                                <img src={cardData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white/10 bg-[#0a0a0a]" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={24} className="text-gray-500" /></div>
                            )}
                            <label className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                {isUploading ? 'Uploading...' : 'Upload Headshot'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Full Name</label>
                                <input type="text" value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Title</label>
                                <input type="text" value={cardData.title} onChange={e => setCardData({...cardData, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Company</label>
                                <input type="text" value={cardData.company} onChange={e => setCardData({...cardData, company: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Phone Number</label>
                                <input type="tel" value={cardData.phone} onChange={e => setCardData({...cardData, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Email Address</label>
                                <input type="email" value={cardData.email} onChange={e => setCardData({...cardData, email: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Website URL</label>
                                <input type="text" value={cardData.website} onChange={e => setCardData({...cardData, website: e.target.value})} placeholder="e.g. selloutcrowds.com" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Design & Theme</h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Accent Color</label>
                                    <input type="color" value={cardData.theme} onChange={e => setCardData({...cardData, theme: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Button Text Color</label>
                                    <div className="flex bg-black p-1 rounded-lg border border-white/10 h-12">
                                        <button onClick={() => setCardData({...cardData, textColor: '#FFFFFF'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.textColor === '#FFFFFF' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>Light</button>
                                        <button onClick={() => setCardData({...cardData, textColor: '#000000'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.textColor === '#000000' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>Dark</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                {isSaving ? 'Saving...' : 'Save Card'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: THE LIVE PREVIEW */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <div className="flex items-center justify-center gap-2 mb-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <MonitorSmartphone size={14} /> Live Preview
                        </div>
                        <div className="pointer-events-none">
                           <PublicCardView data={cardData} />
                        </div>
                    </div>
                </div>
            </div>

            {/* QR CODE MODAL */}
            {showQrModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative">
                        <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black uppercase italic text-white mb-2">Scan to Connect</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6 text-center">Have them open their camera app</p>
                        
                        <div className="bg-white p-3 rounded-2xl shadow-xl">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getShareUrl())}`} alt="QR Code" className="w-48 h-48" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}