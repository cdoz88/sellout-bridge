import React, { useState, useEffect } from 'react';
import { Camera, Save, Loader2, Share2, QrCode, Download, Link2, MonitorSmartphone, Settings, UploadCloud, X, Palette, Image as ImageIcon, Phone, Mail, Globe, Twitter, Linkedin, Facebook, Youtube, Instagram, ArrowRight, User } from 'lucide-react';

// Custom SVG for TikTok
const TiktokIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.24-.71 4.46-1.92 6.25-1.2 1.81-2.92 3.15-4.96 3.79-2.14.65-4.52.54-6.52-.3-2.02-.85-3.66-2.45-4.56-4.45-.9-2.01-1.02-4.43-.33-6.51.68-2.08 2.2-3.79 4.16-4.7 1.95-.92 4.29-1.14 6.36-.61V14.8c-1.02-.38-2.19-.34-3.13.18-.95.52-1.61 1.48-1.74 2.57-.15 1.09.17 2.22.87 3.03.7.81 1.78 1.22 2.87 1.13 1.09-.09 2.08-.66 2.65-1.54.58-.89.81-2 .76-3.05V0h4.22z"/>
    </svg>
);

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
    facebook: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    avatarUrl: "",
    logoUrl: "", 
    logoSize: 56, 
    themePreset: "default", // Pre-defined theme tracker
    theme: "#9df01c",
    textColor: "#000000",
    iconColor: "#9df01c",
    cardBgColor: "#111111", 
    cardBgType: "dark",
    qrLogoEnabled: false, // QR Logo Tracker
    qrLogoUrl: "", 
    qrLogoBg: "#ffffff"
};

// Professionally curated theme presets
const PRESETS = [
    { id: 'default', name: 'SC Dark', bg: '#111111', accent: '#9df01c', data: { cardBgColor: '#111111', cardBgType: 'dark', theme: '#9df01c', textColor: '#000000', iconColor: '#9df01c' } },
    { id: 'midnight', name: 'Midnight', bg: '#020617', accent: '#38bdf8', data: { cardBgColor: '#020617', cardBgType: 'dark', theme: '#38bdf8', textColor: '#020617', iconColor: '#38bdf8' } },
    { id: 'forest', name: 'Forest', bg: '#064e3b', accent: '#34d399', data: { cardBgColor: '#064e3b', cardBgType: 'dark', theme: '#34d399', textColor: '#064e3b', iconColor: '#34d399' } },
    { id: 'rose', name: 'Rose', bg: '#4c0519', accent: '#fb7185', data: { cardBgColor: '#4c0519', cardBgType: 'dark', theme: '#fb7185', textColor: '#4c0519', iconColor: '#fb7185' } },
    { id: 'clean', name: 'Clean Light', bg: '#f9fafb', accent: '#000000', data: { cardBgColor: '#f9fafb', cardBgType: 'light', theme: '#000000', textColor: '#ffffff', iconColor: '#000000' } },
    { id: 'custom', name: 'Custom', bg: 'linear-gradient(45deg, #333, #111)', accent: 'transparent' }
];

// --- THE PUBLIC CARD COMPONENT (FLOATING DESIGN) ---
export const PublicCardView = ({ data, isFullScreen = false }) => {
    const bgType = data.cardBgType || data.cardMode || 'dark';
    const isLight = bgType === 'light';
    const cardBgColor = data.cardBgColor || (isLight ? '#ffffff' : '#111111');
    
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

    const coverStyle = data.coverUrl 
        ? { backgroundImage: `url(${data.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
        : { backgroundColor: data.theme };

    const overlayGradient = isLight 
        ? "from-white via-white/40 to-transparent" 
        : "from-[#111] via-black/20 to-transparent";

    const containerClasses = isFullScreen 
        ? "w-full max-w-md mx-auto font-sans relative" 
        : "w-full max-w-md mx-auto rounded-3xl shadow-2xl border overflow-hidden font-sans relative";
    
    const containerStyle = isFullScreen 
        ? {} 
        : { backgroundColor: cardBgColor, borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.05)' };

    const textNameClass = isLight ? 'text-gray-900' : 'text-white';
    const textCompanyClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const buttonBgClass = isLight ? 'bg-black/5 hover:bg-black/10 border border-black/5 shadow-sm' : 'bg-white/5 hover:bg-white/10 border border-white/5 shadow-lg';
    const buttonIconBgClass = isLight ? 'bg-white group-hover:bg-gray-50' : 'bg-black/20 group-hover:bg-black/40';
    const buttonTitleClass = isLight ? 'text-gray-900' : 'text-white';
    const buttonSubtitleClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const arrowClass = isLight ? 'text-gray-400' : 'text-gray-500';

    const activeLinks = [
        { id: 'phone', title: 'Phone Number', subtitle: data.phone, url: `tel:${data.phone?.replace(/\D/g, '')}`, icon: Phone, active: !!data.phone },
        { id: 'email', title: 'Email Address', subtitle: data.email, url: `mailto:${data.email}`, icon: Mail, active: !!data.email },
        { id: 'website', title: 'Official Website', subtitle: data.website?.replace(/^https?:\/\//, ''), url: `https://${data.website?.replace(/^https?:\/\//, '')}`, icon: Globe, active: !!data.website },
        { id: 'sellout', title: 'Sellout Crowds', subtitle: 'Join my community', url: `https://${data.sellout?.replace(/^https?:\/\//, '')}`, icon: Link2, active: !!data.sellout },
        { id: 'instagram', title: 'Instagram', subtitle: 'Follow me', url: `https://${data.instagram?.replace(/^https?:\/\//, '')}`, icon: Instagram, active: !!data.instagram },
        { id: 'tiktok', title: 'TikTok', subtitle: 'Watch my videos', url: `https://${data.tiktok?.replace(/^https?:\/\//, '')}`, icon: TiktokIcon, active: !!data.tiktok },
        { id: 'youtube', title: 'YouTube', subtitle: 'Subscribe to my channel', url: `https://${data.youtube?.replace(/^https?:\/\//, '')}`, icon: Youtube, active: !!data.youtube },
        { id: 'facebook', title: 'Facebook', subtitle: 'Connect on Facebook', url: `https://${data.facebook?.replace(/^https?:\/\//, '')}`, icon: Facebook, active: !!data.facebook },
        { id: 'twitter', title: 'X (Twitter)', subtitle: 'Follow for updates', url: `https://${data.twitter?.replace(/^https?:\/\//, '')}`, icon: Twitter, active: !!data.twitter },
        { id: 'linkedin', title: 'LinkedIn', subtitle: 'Professional network', url: `https://${data.linkedin?.replace(/^https?:\/\//, '')}`, icon: Linkedin, active: !!data.linkedin }
    ].filter(l => l.active);

    return (
        <div className={containerClasses} style={containerStyle}>
            
            {data.logoUrl && (
                <div className="w-full flex justify-center pt-8 relative z-10">
                    <img src={data.logoUrl} alt="Company Logo" className="object-contain" style={{ height: `${data.logoSize || 56}px` }} />
                </div>
            )}

            <div className={`relative ${data.logoUrl ? 'mt-8' : 'mt-16'}`}>
                {data.avatarUrl ? (
                    <img src={data.avatarUrl} className="w-28 h-28 mx-auto rounded-full object-cover border-2 relative z-10" style={{ borderColor: data.theme, boxShadow: `0 0 35px ${data.theme}40` }} alt="Profile" />
                ) : (
                    <div className="w-28 h-28 mx-auto rounded-full border-2 flex items-center justify-center text-4xl font-black relative z-10" style={{ backgroundColor: cardBgColor, borderColor: data.theme, color: data.theme, boxShadow: `0 0 35px ${data.theme}40` }}>
                        {data.name.charAt(0)}
                    </div>
                )}
            </div>
            
            <div className="pt-6 pb-8 px-6 text-center">
                <h1 className={`text-3xl font-black uppercase tracking-tight ${textNameClass}`}>{data.name}</h1>
                <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: data.theme }}>{data.title}</p>
                <p className={`text-sm font-medium mt-1 ${textCompanyClass}`}>{data.company}</p>

                <div className="mt-10 space-y-3 text-left">
                    {activeLinks.map(link => (
                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className={`flex items-center gap-4 p-2 pr-4 rounded-2xl transition-all group ${buttonBgClass}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${buttonIconBgClass}`} style={{ color: data.iconColor }}>
                                <link.icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <p className={`text-sm font-bold uppercase tracking-wide truncate ${buttonTitleClass}`}>{link.title}</p>
                                <p className={`text-xs truncate mt-0.5 ${buttonSubtitleClass}`}>{link.subtitle}</p>
                            </div>
                            <ArrowRight size={18} className={`flex-shrink-0 transition-transform group-hover:translate-x-1 ${arrowClass}`} />
                        </a>
                    ))}
                </div>

                <button onClick={handleSaveContact} className="mt-8 w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: data.theme, color: data.textColor }}>
                    <Download size={16} /> Save to Contacts
                </button>
            </div>
        </div>
    );
};

// --- THE BUILDER APP ---
export default function BusinessCardApp({ session, activeTab }) {
    const [cardData, setCardData] = useState(DEFAULT_CARD);
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState({ avatar: false, logo: false, qrLogo: false });
    const [showQrModal, setShowQrModal] = useState(false);

    useEffect(() => {
        if (!session) return;
        fetch('/api/get-card', { headers: { 'Authorization': `Bearer ${session}` } })
            .then(res => res.json())
            .then(data => {
                if (data.card) setCardData({ ...DEFAULT_CARD, ...data.card }); 
                if (data.slug) setSlug(data.slug);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session]);

    const handleSave = async () => {
        if (!slug || slug.trim() === '') {
            alert("Please claim a custom link (e.g. your name) before saving!");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/save-card', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ card: cardData, slug: slug })
            });
            const result = await res.json();
            
            if (result.error) {
                alert(result.error); 
                setIsSaving(false);
                return;
            }
            
            setTimeout(() => setIsSaving(false), 1000);
        } catch (err) {
            alert("Failed to save card.");
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(prev => ({ ...prev, [fieldName]: true }));
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setCardData(prev => ({ ...prev, [fieldName]: result.url }));
            } else {
                alert("Upload failed.");
            }
        } catch (err) {
            alert("Image server unreachable.");
        } finally {
            setIsUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const handlePresetSelect = (preset) => {
        if (preset.id === 'custom') {
            setCardData({ ...cardData, themePreset: 'custom' });
        } else {
            setCardData({ ...cardData, themePreset: preset.id, ...preset.data });
        }
    };

    const getShareUrl = () => {
        if (!slug) return '';
        return `https://crowds.bio/${slug}`;
    };

    const copyShareLink = () => {
        const url = getShareUrl();
        if (!url) {
            alert("Save your custom link first!");
            return;
        }
        navigator.clipboard.writeText(url);
        alert("Public link copied to clipboard!");
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/> Loading Builder...</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white">
                        {activeTab === 'design' ? 'Design & Theme' : 'Card Builder'}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        {activeTab === 'design' ? 'Customize the look and feel of your card.' : 'Update your contact and social information.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => slug ? setShowQrModal(true) : alert('Save your custom link first!')} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                        <QrCode size={14} /> Get QR Code
                    </button>
                    <button onClick={copyShareLink} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                        <Share2 size={14} /> Copy Link
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                
                {/* LEFT: THE FORMS */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* TAB 1: BUILDER (CORE DETAILS) */}
                    {activeTab === 'builder' && (
                        <div className="animate-in fade-in duration-300">
                            
                            <div className="mb-6 p-6 bg-[#111] rounded-2xl border border-[#9df01c]/30 shadow-lg shadow-[#9df01c]/5">
                                <label className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3 block">Claim Your Public Link</label>
                                <div className="flex items-center gap-2 bg-black p-1.5 pl-4 rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors overflow-hidden">
                                    <span className="text-gray-500 font-bold whitespace-nowrap">crowds.bio /</span>
                                    <input 
                                        type="text" 
                                        value={slug} 
                                        onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} 
                                        placeholder="your-name" 
                                        className="flex-1 bg-transparent text-white font-bold outline-none min-w-[50px]"
                                    />
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaving} 
                                        className="bg-[#9df01c] text-black hover:bg-[#8ce015] px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-sm flex-shrink-0"
                                    >
                                        {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                                        {isSaving ? '...' : 'Save'}
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-500 mt-2 font-medium">Letters, numbers, and hyphens only. This is what you will share with people!</p>
                            </div>

                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8">
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2">
                                    <User size={18} className="text-[#9df01c]"/> Details
                                </h3>
                                
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
                                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Link2 size={18} className="text-[#9df01c]"/> Social Media</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Link2 size={10}/> Sellout Crowds URL</label>
                                            <input type="text" value={cardData.sellout} onChange={e => setCardData({...cardData, sellout: e.target.value})} placeholder="selloutcrowds.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Instagram size={10}/> Instagram URL</label>
                                            <input type="text" value={cardData.instagram} onChange={e => setCardData({...cardData, instagram: e.target.value})} placeholder="instagram.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><TiktokIcon size={10}/> TikTok URL</label>
                                            <input type="text" value={cardData.tiktok} onChange={e => setCardData({...cardData, tiktok: e.target.value})} placeholder="tiktok.com/@username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Youtube size={10}/> YouTube URL</label>
                                            <input type="text" value={cardData.youtube} onChange={e => setCardData({...cardData, youtube: e.target.value})} placeholder="youtube.com/@channel" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Facebook size={10}/> Facebook URL</label>
                                            <input type="text" value={cardData.facebook} onChange={e => setCardData({...cardData, facebook: e.target.value})} placeholder="facebook.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Twitter size={10}/> X (Twitter) URL</label>
                                            <input type="text" value={cardData.twitter} onChange={e => setCardData({...cardData, twitter: e.target.value})} placeholder="x.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Linkedin size={10}/> LinkedIn URL</label>
                                            <input type="text" value={cardData.linkedin} onChange={e => setCardData({...cardData, linkedin: e.target.value})} placeholder="linkedin.com/in/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
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
                    )}

                    {/* TAB 2: DESIGN & THEME */}
                    {activeTab === 'design' && (
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 animate-in fade-in duration-300">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Palette size={18} className="text-[#9df01c]"/> Brand Imagery</h3>
                            
                            <div className="flex flex-col sm:flex-row gap-6 mb-8">
                                {/* Profile Photo Upload */}
                                <div className="flex-1 bg-black p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="mb-4">
                                        {cardData.avatarUrl ? (
                                            <img src={cardData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white/10 bg-[#0a0a0a]" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={24} className="text-gray-500" /></div>
                                        )}
                                    </div>
                                    <label className={`w-full justify-center py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.avatar ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading.avatar ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                        {isUploading.avatar ? 'Uploading...' : 'Profile Photo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatarUrl')} />
                                    </label>
                                </div>

                                {/* Logo Image Upload */}
                                <div className="flex-1 bg-black p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center relative">
                                    <div className="mb-4 w-full flex items-center justify-center h-20">
                                        {cardData.logoUrl ? (
                                            <img src={cardData.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-20 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center"><ImageIcon size={24} className="text-gray-500" /></div>
                                        )}
                                    </div>
                                    <label className={`w-full justify-center py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.logo ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading.logo ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                        {isUploading.logo ? 'Uploading...' : 'Brand Logo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                    </label>
                                    
                                    {cardData.logoUrl && (
                                        <div className="w-full mt-4 bg-white/5 p-2 rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Logo Size</label>
                                                <button onClick={() => setCardData({...cardData, logoUrl: ''})} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest">Remove</button>
                                            </div>
                                            <input type="range" min="30" max="150" value={cardData.logoSize || 56} onChange={e => setCardData({...cardData, logoSize: e.target.value})} className="w-full accent-[#9df01c] cursor-pointer" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Theme Presets</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                                    {PRESETS.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => handlePresetSelect(p)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${cardData.themePreset === p.id ? 'bg-white/10 border-[#9df01c]' : 'bg-black border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden" style={{ background: p.bg }}>
                                                {p.accent !== 'transparent' && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }}></div>}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{p.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {cardData.themePreset === 'custom' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in bg-black p-5 rounded-2xl border border-white/5">
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Background Color</label>
                                            <input type="color" value={cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#ffffff' : '#111111')} onChange={e => setCardData({...cardData, cardBgColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Text & Panel Mode</label>
                                            <div className="flex bg-black p-1 rounded-lg border border-white/10 h-12">
                                                <button onClick={() => setCardData({...cardData, cardBgType: 'dark'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'dark' || !cardData.cardBgType ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`} title="Use white text">Dark</button>
                                                <button onClick={() => setCardData({...cardData, cardBgType: 'light'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'light' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`} title="Use black text">Light</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Accent Color</label>
                                            <input type="color" value={cardData.theme} onChange={e => setCardData({...cardData, theme: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Icons Color</label>
                                            <input type="color" value={cardData.iconColor} onChange={e => setCardData({...cardData, iconColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-white/5 mt-8">
                                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">QR Code Setting</h4>
                                
                                <div className="flex items-center justify-between bg-black p-5 rounded-2xl border border-white/5 mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-white">Embed Logo in QR Code</p>
                                        <p className="text-[10px] text-gray-500 font-medium mt-1">Place a logo directly in the center of your shareable QR code.</p>
                                    </div>
                                    <button onClick={() => setCardData({...cardData, qrLogoEnabled: !cardData.qrLogoEnabled})} className={`w-12 h-6 rounded-full transition-colors relative ${cardData.qrLogoEnabled ? 'bg-[#9df01c]' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${cardData.qrLogoEnabled ? 'left-7 bg-black' : 'left-1 bg-gray-400'}`}></div>
                                    </button>
                                </div>

                                {cardData.qrLogoEnabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black p-5 rounded-xl border border-white/5 animate-in fade-in">
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Logo Background Block</label>
                                            <input type="color" value={cardData.qrLogoBg || '#ffffff'} onChange={e => setCardData({...cardData, qrLogoBg: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                            <p className="text-[9px] text-gray-600 mt-2">The color of the square sitting behind the logo.</p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Custom QR Logo (Optional)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center p-1">
                                                    {(cardData.qrLogoUrl || cardData.logoUrl) ? (
                                                        <img src={cardData.qrLogoUrl || cardData.logoUrl} className="max-w-full max-h-full object-contain" alt="QR center" />
                                                    ) : (
                                                        <ImageIcon size={16} className="text-gray-500" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-white/10 ${isUploading.qrLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        {isUploading.qrLogo ? <Loader2 size={12} className="animate-spin"/> : <UploadCloud size={12}/>}
                                                        Upload Specific Logo
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'qrLogoUrl')} />
                                                    </label>
                                                    {cardData.qrLogoUrl && (
                                                        <button onClick={() => setCardData({...cardData, qrLogoUrl: ''})} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest text-left pl-1">Use Main Brand Logo</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                    {isSaving ? 'Saving...' : 'Save Design'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: THE LIVE PREVIEW */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <div className="flex items-center justify-center gap-2 mb-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <MonitorSmartphone size={14} /> Live Preview
                        </div>
                        {/* We wrap the preview in a simulated screen background so they can see the full effect! */}
                        <div className={`p-8 rounded-[3rem] border shadow-2xl transition-colors pointer-events-none ${cardData.cardBgType === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/10'}`} style={{ backgroundColor: cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#f9fafb' : '#050505') }}>
                           <PublicCardView data={cardData} />
                        </div>
                    </div>
                </div>
            </div>

            {/* QR CODE MODAL - FEATURING THE EMBEDDED LOGO */}
            {showQrModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative">
                        <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black uppercase italic text-white mb-2">Scan to Connect</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6 text-center">Have them open their camera app</p>
                        
                        <div className="bg-white p-3 rounded-2xl shadow-xl relative inline-flex items-center justify-center">
                            {/* ecc=H enables High Error Correction so covering the center is perfectly safe! */}
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=H&margin=0&data=${encodeURIComponent(getShareUrl())}`} alt="QR Code" className="w-48 h-48" />
                            
                            {cardData.qrLogoEnabled && (cardData.qrLogoUrl || cardData.logoUrl) && (
                                <div className="absolute w-12 h-12 rounded-lg flex items-center justify-center p-1 shadow-md border-[3px] border-white overflow-hidden" style={{ backgroundColor: cardData.qrLogoBg || '#ffffff' }}>
                                    <img src={cardData.qrLogoUrl || cardData.logoUrl} alt="QR Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}