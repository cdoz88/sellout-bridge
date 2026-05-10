import React, { useState, useEffect } from 'react';
import { Globe, Save, Loader2, ArrowRight, CheckCircle2, Lock, Link2, Copy } from 'lucide-react';

export default function CommunityLinkApp({ session, unaData }) {
    const role = Number(unaData?.user?.role) || 1;
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    // Feature unlocked for Admin(3), All-Star(16), HOF(17)
    const canAccess = isAdmin || [16, 17].includes(role);

    const [subdomain, setSubdomain] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (!session || !canAccess) {
            setIsLoading(false);
            return;
        }
        fetch('/api/get-domain', { headers: { 'Authorization': `Bearer ${session}` } })
            .then(res => res.json())
            .then(data => {
                if (data.domain) {
                    setSubdomain(data.domain.subdomain || '');
                    setTargetUrl(data.domain.target_url || '');
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session, canAccess]);

    const handleSave = async () => {
        if (!subdomain || !targetUrl) {
            alert("Both fields are required!");
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/save-domain', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, target_url: targetUrl })
            });
            const data = await res.json();
            
            if (data.error) {
                alert(data.error);
            } else {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            alert("Network error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = () => {
        if (!subdomain) return;
        navigator.clipboard.writeText(`https://${subdomain}.selloutcrowds.fan`);
        alert("Link copied!");
    };

    if (!canAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
                <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                    <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                    <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                        Claim a branded subdomain (e.g. <strong>yourname</strong>.selloutcrowds.fan) to seamlessly route fans to your community. Available exclusively to All-Star and H.O.F. subscribers.
                    </p>
                    <a href="https://www.selloutcrowds.com/plans" target="_blank" rel="noopener noreferrer" className="bg-[#9df01c] text-black font-black py-4 px-10 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10">
                        Upgrade to Unlock
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    return (
        <div className="max-w-4xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-10 text-center">
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white flex items-center justify-center gap-3">
                    <Globe className="text-[#9df01c]" size={36} />
                    Community Link
                </h2>
                <p className="text-gray-500 text-xs font-medium max-w-lg mx-auto leading-relaxed">
                    Create a clean, branded link to share on podcasts, streams, and social media. We will instantly redirect anyone who visits it directly to your space or crowd.
                </p>
            </div>

            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="space-y-8 relative z-10">
                    
                    {/* Step 1: Claim Subdomain */}
                    <div>
                        <label className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#9df01c]/20 flex items-center justify-center">1</span> 
                            Claim Your Branded Link
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center bg-black rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors overflow-hidden">
                            <div className="flex items-center flex-1 px-4 py-4 sm:py-0">
                                <input 
                                    type="text" 
                                    value={subdomain} 
                                    onChange={e => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} 
                                    placeholder="yourbrand" 
                                    className="bg-transparent text-white font-black outline-none w-full text-right sm:text-left text-lg placeholder:text-gray-700" 
                                />
                                <span className="text-gray-500 font-bold ml-1 text-lg whitespace-nowrap">.selloutcrowds.fan</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 ml-1 font-medium">Letters, numbers, and hyphens only.</p>
                    </div>

                    <div className="flex justify-center -my-2">
                        <ArrowRight size={24} className="text-[#9df01c] rotate-90 sm:rotate-0" />
                    </div>

                    {/* Step 2: Target URL */}
                    <div>
                        <label className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#9df01c]/20 flex items-center justify-center">2</span> 
                            Where should it go?
                        </label>
                        <div className="flex items-center gap-3 bg-black rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors px-4 py-4">
                            <Link2 className="text-gray-500 flex-shrink-0" size={18} />
                            <input 
                                type="text" 
                                value={targetUrl} 
                                onChange={e => setTargetUrl(e.target.value)} 
                                placeholder="Paste your community URL (e.g. https://studio.selloutcrowds.com/m/spaces/view/...)" 
                                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-gray-700" 
                            />
                        </div>
                    </div>

                    {/* Step 3: Save */}
                    <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="text-left w-full sm:w-auto">
                            {subdomain && targetUrl && (
                                <button onClick={copyToClipboard} className="text-[10px] text-gray-400 hover:text-white font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                    <Copy size={12} /> Copy Share Link
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || !subdomain || !targetUrl} 
                            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${saveSuccess ? 'bg-green-500 text-black' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin"/> : (saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16}/>)}
                            {saveSuccess ? 'Live & Active!' : 'Save Connection'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}