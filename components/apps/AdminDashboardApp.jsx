import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, ShieldAlert, Loader2, Save, Check } from 'lucide-react';

export default function AdminDashboardApp({ session, unaData }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    const [activeTab, setActiveTab] = useState('guides');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [guides, setGuides] = useState([]);
    const [mappings, setMappings] = useState([]);

    // Hardcoded list of apps/pages across your platform
    const platformPages = [
        { id: 'youtube_sync_api', name: 'YouTube Sync - API Settings' },
        { id: 'youtube_sync_dash', name: 'YouTube Sync - Dashboard' },
        { id: 'wordpress_plugin', name: 'WordPress Plugin Setup' },
        { id: 'stripe_payments', name: 'Stripe Payments Configuration' },
    ];

    useEffect(() => {
        if (!session || !isAdmin) return;
        fetchAdminData();
    }, [session, isAdmin]);

    const fetchAdminData = async () => {
        setIsLoading(true);
        try {
            // Auto-create database tables on UNA if they don't exist
            await fetch('/api/bridge', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'init_admin_tables' })
            });

            // Fetch library guides
            const guidesRes = await fetch(`/api/guides/data`, { headers: { 'Authorization': `Bearer ${session}` } });
            const guidesData = await guidesRes.json();
            if (guidesData.guides) setGuides(guidesData.guides);

            // Fetch active mappings
            const mappingRes = await fetch('/api/bridge', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_guide_mappings' })
            });
            const mappingData = await mappingRes.json();
            if (mappingData.mappings) setMappings(mappingData.mappings);

        } catch (error) {
            console.error("Admin Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMapping = async (pageId, guideId, isActive) => {
        setIsSaving(true);
        try {
            await fetch('/api/bridge', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_guide_mapping', 
                    page_name: pageId,
                    guide_id: parseInt(guideId),
                    is_active: isActive ? 1 : 0
                })
            });
            // Update local state instantly
            const newMappings = mappings.filter(m => m.page_name !== pageId);
            setMappings([...newMappings, { page_name: pageId, guide_id: parseInt(guideId), is_active: isActive ? 1 : 0 }]);
        } catch (e) {
            alert("Failed to save mapping");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-12 text-center text-red-500 font-bold uppercase tracking-widest text-xs">Access Denied</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <Settings className="text-[#9df01c]" size={36} />
                        Command Center
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Global Platform Settings and Architecture
                    </p>
                </div>
                <div className="flex bg-[#111] p-1 rounded-xl border border-white/5">
                    <button onClick={() => setActiveTab('guides')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'guides' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><BookOpen size={14}/> Guide Maps</button>
                    <button onClick={() => setActiveTab('acl')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'acl' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><ShieldAlert size={14}/> Access Control</button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-[#9df01c] animate-spin" /></div>
            ) : activeTab === 'guides' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl">
                    <div className="mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Contextual Guide Mappings</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Map Help Center articles to specific pages on the platform. When active, a "Step-by-Step Guide" drawer will automatically appear on that page for the user.</p>
                    </div>

                    <div className="space-y-4">
                        {platformPages.map(page => {
                            const currentMap = mappings.find(m => m.page_name === page.id) || { guide_id: '', is_active: 0 };
                            return (
                                <div key={page.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-black border border-white/5 rounded-xl gap-4 hover:border-white/10 transition-colors">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white mb-1">{page.name}</p>
                                        <p className="text-[9px] text-gray-500 font-mono">{page.id}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                                        <select 
                                            value={currentMap.guide_id}
                                            onChange={(e) => handleSaveMapping(page.id, e.target.value, currentMap.is_active)}
                                            className="w-full sm:w-auto flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white focus:border-[#9df01c] outline-none"
                                        >
                                            <option value="">-- No Guide Mapped --</option>
                                            {guides.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                                        </select>
                                        
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
                                            <button 
                                                type="button"
                                                onClick={() => handleSaveMapping(page.id, currentMap.guide_id, !currentMap.is_active)}
                                                disabled={!currentMap.guide_id || isSaving}
                                                className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${currentMap.is_active ? 'bg-[#9df01c]' : 'bg-white/10'} ${!currentMap.guide_id && 'opacity-50 cursor-not-allowed'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${currentMap.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-16 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                    Access Control Matrix Module coming next...
                </div>
            )}
        </div>
    );
}