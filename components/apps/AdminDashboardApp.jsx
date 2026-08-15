import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, ShieldAlert, Loader2, Save, Check, TrendingUp } from 'lucide-react';

// Notice how activeTab and setActiveTab are ONLY coming from props now!
export default function AdminDashboardApp({ session, unaData, activeTab = 'guides', setActiveTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const userEmail = unaData?.user?.email || '';
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [guides, setGuides] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [aclMatrix, setAclMatrix] = useState([]);
    const [usageLimits, setUsageLimits] = useState([]);

    const platformPages = [
        { id: 'youtube_sync_api', name: 'YouTube Sync - API Settings' },
        { id: 'youtube_sync_dash', name: 'YouTube Sync - Dashboard' },
        { id: 'wordpress_plugin', name: 'WordPress Plugin Setup' },
        { id: 'stripe_payments', name: 'Stripe Payments Configuration' },
    ];

    const unaRoles = [
        { id: 15, name: 'Rookie' },
        { id: 16, name: 'All-Star' },
        { id: 17, name: 'H.O.F.' },
        { id: 12, name: 'Com. Exempt' },
        { id: 18, name: 'Teammate' }
    ];

    const platformFeatures = [
        { id: 'youtube', name: 'YouTube Sync' },
        { id: 'newsletter', name: 'Newsletter' },
        { id: 'affiliates', name: 'Affiliates' },
        { id: 'teammates', name: 'Teammates' },
        { id: 'address_book', name: 'Address Book' },
        { id: 'business_card', name: 'Digital Card' },
        { id: 'bio_page', name: 'Bio Page' },
        { id: 'assets', name: 'Asset Library' },
        { id: 'content', name: 'Content Engine' },
        { id: 'community_link', name: 'Community Links' },
    ];

    const limitFeatures = [
        { id: 'teammates', name: 'Teammates Allowance' },
        { id: 'community_link', name: 'Custom Domains Allowance' }
    ];

    useEffect(() => {
        if (!session || !isAdmin || !userEmail) return;
        fetchAdminData();
    }, [session, isAdmin, userEmail]);

    const fetchAdminData = async () => {
        setIsLoading(true);
        try {
            await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'init_admin_tables', email: userEmail })
            });

            const guidesRes = await fetch(`/api/guides/data`, { headers: { 'Authorization': `Bearer ${session}` } });
            const guidesData = await guidesRes.json();
            if (guidesData.guides) setGuides(guidesData.guides);

            const mappingRes = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_guide_mappings', email: userEmail })
            });
            const mappingData = await mappingRes.json();
            if (mappingData.mappings) setMappings(mappingData.mappings);

            const aclRes = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_acl_matrix', email: userEmail })
            });
            const aclData = await aclRes.json();
            if (aclData.matrix) setAclMatrix(aclData.matrix);

            const limitRes = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_usage_limits', email: userEmail })
            });
            const limitData = await limitRes.json();
            if (limitData.limits) setUsageLimits(limitData.limits);

        } catch (error) {
            console.error("Admin Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMapping = async (pageId, guideId, isActive) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_guide_mapping', 
                    page_name: pageId,
                    guide_id: parseInt(guideId),
                    is_active: isActive ? 1 : 0,
                    email: userEmail
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const newMappings = mappings.filter(m => m.page_name !== pageId);
                setMappings([...newMappings, { page_name: pageId, guide_id: parseInt(guideId), is_active: isActive ? 1 : 0 }]);
            } else {
                alert(data.error || "Server rejected the save. You may not have Admin permissions.");
            }
        } catch (e) {
            alert("Failed to save mapping");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAcl = async (featureId, levelId, isActive) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_acl_matrix', 
                    feature_name: featureId,
                    level_id: parseInt(levelId),
                    is_active: isActive ? 1 : 0,
                    email: userEmail
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const newMatrix = aclMatrix.filter(m => !(m.feature_name === featureId && parseInt(m.level_id) === parseInt(levelId)));
                setAclMatrix([...newMatrix, { feature_name: featureId, level_id: parseInt(levelId), is_active: isActive ? 1 : 0 }]);
            } else {
                alert(data.error || "Server rejected the save.");
            }
        } catch (e) {
            alert("Failed to save Access Control.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLimit = async (featureId, levelId, maxCount) => {
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_usage_limit', 
                    feature_name: featureId,
                    level_id: parseInt(levelId),
                    max_count: parseInt(maxCount) || 0,
                    email: userEmail
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const newLimits = usageLimits.filter(m => !(m.feature_name === featureId && parseInt(m.level_id) === parseInt(levelId)));
                setUsageLimits([...newLimits, { feature_name: featureId, level_id: parseInt(levelId), max_count: parseInt(maxCount) || 0 }]);
            } else {
                alert(data.error || "Server rejected the save.");
            }
        } catch (e) {
            alert("Failed to save Usage Limit.");
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
                <div className="flex bg-[#111] p-1 rounded-xl border border-white/5 overflow-x-auto">
                    <button onClick={() => setActiveTab('guides')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'guides' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><BookOpen size={14}/> Guide Maps</button>
                    <button onClick={() => setActiveTab('acl')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'acl' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><ShieldAlert size={14}/> Access Control</button>
                    <button onClick={() => setActiveTab('limits')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'limits' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><TrendingUp size={14}/> Usage Limits</button>
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
            ) : activeTab === 'acl' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Access Control Matrix</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Toggle which Membership Levels are permitted to access each module in the Front Office.</p>
                        <p className="text-[9px] text-[#9df01c] font-black uppercase tracking-widest mt-2">Note: Platform Admins always have full access.</p>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="p-4 bg-[#1a1a1a] border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-tl-xl">Feature / Module</th>
                                    {unaRoles.map(role => (
                                        <th key={role.id} className="p-4 bg-[#1a1a1a] border-b border-l border-white/10 text-[10px] font-black uppercase tracking-widest text-center text-gray-400 last:rounded-tr-xl">
                                            {role.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {platformFeatures.map((feature, index) => (
                                    <tr key={feature.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index === platformFeatures.length - 1 ? 'border-b-0' : ''}`}>
                                        <td className="p-4 border-r border-white/5">
                                            <p className="text-sm font-bold text-white mb-1">{feature.name}</p>
                                        </td>
                                        {unaRoles.map(role => {
                                            const currentVal = aclMatrix.find(m => m.feature_name === feature.id && parseInt(m.level_id) === role.id);
                                            // Default to True (1) if no record exists yet, just like UNA does
                                            const isActive = currentVal ? parseInt(currentVal.is_active) === 1 : true;
                                            
                                            return (
                                                <td key={role.id} className="p-4 border-r border-white/5 last:border-r-0 text-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleSaveAcl(feature.id, role.id, !isActive)}
                                                        disabled={isSaving}
                                                        className={`mx-auto w-10 h-6 rounded-full transition-colors relative flex items-center ${isActive ? 'bg-[#9df01c]' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'limits' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Usage Limits Matrix</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Set the maximum allowances for specific features based on Membership Level. Set to '0' to disable.</p>
                        <p className="text-[9px] text-[#9df01c] font-black uppercase tracking-widest mt-2">Note: Platform Admins always have unlimited access.</p>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="p-4 bg-[#1a1a1a] border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-tl-xl">Feature / Module</th>
                                    {unaRoles.map(role => (
                                        <th key={role.id} className="p-4 bg-[#1a1a1a] border-b border-l border-white/10 text-[10px] font-black uppercase tracking-widest text-center text-gray-400 last:rounded-tr-xl">
                                            {role.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {limitFeatures.map((feature, index) => (
                                    <tr key={feature.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index === limitFeatures.length - 1 ? 'border-b-0' : ''}`}>
                                        <td className="p-4 border-r border-white/5">
                                            <p className="text-sm font-bold text-white mb-1">{feature.name}</p>
                                        </td>
                                        {unaRoles.map(role => {
                                            const currentVal = usageLimits.find(m => m.feature_name === feature.id && parseInt(m.level_id) === role.id);
                                            const maxCount = currentVal ? parseInt(currentVal.max_count) : 0;
                                            
                                            return (
                                                <td key={role.id} className="p-4 border-r border-white/5 last:border-r-0 text-center">
                                                    <input 
                                                        type="number"
                                                        value={maxCount}
                                                        onChange={(e) => handleSaveLimit(feature.id, role.id, e.target.value)}
                                                        className="w-16 mx-auto bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-white focus:border-[#9df01c] outline-none"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
}