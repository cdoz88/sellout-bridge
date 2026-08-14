import React, { useState, useEffect } from 'react';
import { PlayCircle, Info, ChevronDown, Loader2, X } from 'lucide-react';

export default function HelpDrawer({ pageName, session, unaData }) {
    const [showDrawer, setShowDrawer] = useState(false);
    const [mapping, setMapping] = useState(null);
    const [guide, setGuide] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Extract the user's email to pass to the backend for Admin validation
    const userEmail = unaData?.user?.email || '';

    useEffect(() => {
        if (!session || !pageName || !userEmail) return;
        fetchDrawerData();
    }, [session, pageName, userEmail]);

    const fetchDrawerData = async () => {
        setIsLoading(true);
        try {
            // FIXED: Pointing to the correct admin-bridge endpoint!
            const mappingRes = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_page_guide_mapping', 
                    page_name: pageName,
                    email: userEmail
                })
            });
            const mappingData = await mappingRes.json();

            // If mapped and active, fetch the actual guide content from the Help Center database!
            if (mappingData.success && mappingData.mapping && mappingData.mapping.is_active === 1) {
                setMapping(mappingData.mapping);
                
                const guidesRes = await fetch(`/api/guides/data?t=${Date.now()}`, { 
                    headers: { 'Authorization': `Bearer ${session}` }
                });
                const guidesData = await guidesRes.json();
                
                const foundGuide = guidesData.guides?.find(g => g.id === mappingData.mapping.guide_id);
                if (foundGuide) {
                    // Parse content safely
                    let parsedContent = foundGuide.content;
                    if (typeof foundGuide.content === 'string') {
                        try { parsedContent = JSON.parse(foundGuide.content); } catch(e) {}
                    }
                    setGuide({ ...foundGuide, parsedContent });
                }
            }
        } catch (error) {
            console.error("Failed to load Help Drawer data", error);
        } finally {
            setIsLoading(false);
        }
    };

    // If no guide is actively mapped to this page by the admin, render nothing!
    if (isLoading || !mapping || !guide) return null;

    const renderContent = () => {
        if (guide.type === 'faq') {
            return (
                <div className="space-y-4 p-6 sm:p-10 overflow-y-auto custom-scrollbar h-full pb-20">
                    {(Array.isArray(guide.parsedContent) ? guide.parsedContent : []).map((faq, i) => (
                        <details key={faq.id || i} className="group bg-black border border-white/10 rounded-2xl overflow-hidden open:border-[#9df01c]/30 transition-all">
                            <summary className="flex items-center justify-between font-bold text-white p-5 cursor-pointer list-none select-none group-open:bg-white/5">
                                <span>{faq.q}</span>
                                <span className="transition group-open:rotate-180 text-[#9df01c]"><ChevronDown size={18} /></span>
                            </summary>
                            <div className="p-5 pt-2 text-gray-400 text-sm leading-relaxed border-t border-white/5 bg-black/50">
                                {(faq.a || '').split('\n').map((line, j) => <p key={j} className="mb-2 last:mb-0">{line}</p>)}
                            </div>
                        </details>
                    ))}
                </div>
            );
        } else {
            // Renders standard HTML or LayerPath Iframe Embeds flawlessly
            return (
                <div 
                    className="p-6 sm:p-10 text-gray-300 text-base leading-loose whitespace-pre-wrap font-sans overflow-y-auto custom-scrollbar h-full pb-20"
                    dangerouslySetInnerHTML={{ __html: typeof guide.parsedContent === 'string' ? guide.parsedContent : (guide.content || '') }}
                />
            );
        }
    };

    return (
        <div 
            className={`fixed bottom-0 left-0 lg:left-[16rem] right-0 bg-[#0a0a0a] border-t border-[#9df01c]/30 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-[100] transition-transform duration-500 ease-in-out flex flex-col ${showDrawer ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ height: '90vh' }}
        >
            <button
                onClick={() => setShowDrawer(!showDrawer)}
                className={`absolute -top-12 right-6 sm:right-12 h-12 px-6 rounded-t-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all border-t border-l border-r ${
                    showDrawer 
                    ? 'bg-[#111] text-gray-400 hover:text-white border-white/10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]' 
                    : 'bg-[#9df01c] hover:bg-[#8ce015] text-black border-[#9df01c]/30 shadow-[0_0_15px_rgba(157,240,28,0.4)] animate-pulse'
                }`}
            >
                {showDrawer ? <X size={16} /> : <Info size={16} />}
                {showDrawer ? 'Close Guide' : 'Step-by-Step Guide'}
            </button>

            <div className="flex justify-between items-center px-6 py-3 border-b border-white/10 bg-[#111] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#9df01c]/10 flex items-center justify-center text-[#9df01c]">
                        <Info size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">{guide.title}</h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Help & Guides Library</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#050505] w-full h-full relative overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
}