import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, ShieldAlert, Loader2, Save, Check, TrendingUp, Users, Link2, Trash2, CheckSquare, Square, Zap, Play } from 'lucide-react';

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
    
    // Auto-Join State
    const [autoJoinRules, setAutoJoinRules] = useState([]);
    const [targetUrl, setTargetUrl] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Simulator State
    const [testEmail, setTestEmail] = useState('');
    const [testRole, setTestRole] = useState(15);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simMessage, setSimMessage] = useState(null);

    const platformPages = [
        { id: 'youtube_sync_api', name: 'YouTube Sync - API Settings' },
        { id: 'youtube_sync_dash', name: 'YouTube Sync - Dashboard' },
        { id: 'wordpress_plugin', name: 'WordPress Plugin Setup' },
        { id: 'stripe_payments', name: 'Stripe Payments Configuration' },
        { id: 'bridge', name: 'Subscription Bridge' },
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
        { id: 'wordpress', name: 'WordPress Sync' },
        { id: 'newsletter', name: 'Newsletter' },
        { id: 'affiliates', name: 'Affiliates' },
        { id: 'teammates', name: 'Teammates' },
        { id: 'address_book', name: 'Address Book' },
        { id: 'business_card', name: 'Digital Card' },
        { id: 'bio_page', name: 'Bio Page' },
        { id: 'assets', name: 'Asset Library' },
        { id: 'content', name: 'Content Engine' },
        { id: 'community_link', name: 'Community Links' },
        { id: 'bridge', name: 'Subscription Bridge' },
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

            // Fetch Auto-Join Rules
            const autoJoinsRes = await fetch('/api/admin/auto-joins', {
                headers: { 'Authorization': `Bearer ${session}` }
            });
            if (autoJoinsRes.ok) {
                const autoJoinsData = await autoJoinsRes.json();
                if (autoJoinsData.rules) setAutoJoinRules(autoJoinsData.rules);
            }

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

    // Auto-Join Logic
    const toggleRole = (roleId) => {
        setSelectedRoles(prev => 
            prev.includes(roleId) 
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    const handleSaveAutoJoin = async () => {
        if (!targetUrl.trim() || selectedRoles.length === 0) {
            alert("Please enter a URL and select at least one role.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/auto-joins', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    target_url: targetUrl, 
                    roles: selectedRoles 
                })
            });
            
            const data = await res.json();
            if (data.success) {
                setTargetUrl('');
                setSelectedRoles([]);
                
                // Refresh list
                const autoJoinsRes = await fetch('/api/admin/auto-joins', {
                    headers: { 'Authorization': `Bearer ${session}` }
                });
                const autoJoinsData = await autoJoinsRes.json();
                if (autoJoinsData.rules) setAutoJoinRules(autoJoinsData.rules);

            } else {
                alert(data.error || "Failed to save rule.");
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAutoJoin = async (ruleId) => {
        if (!window.confirm("Are you sure you want to delete this routing rule? Future upgrades will no longer be auto-added to this community.")) return;

        try {
            const res = await fetch('/api/admin/auto-joins/delete', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ id: ruleId })
            });
            
            if (res.ok) {
                setAutoJoinRules(prev => prev.filter(r => r.id !== ruleId));
            }
        } catch (error) {
            alert("Failed to delete rule.");
        }
    };

    // Simulator Logic
    const handleSimulate = async () => {
        if (!testEmail.trim()) {
            alert("Please enter a valid test email address.");
            return;
        }
        setIsSimulating(true);
        setSimMessage(null);
        try {
            const res = await fetch('/api/admin/auto-joins/simulate', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${session}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ email: testEmail, roleId: testRole })
            });
            const data = await res.json();
            if (data.success) {
                setSimMessage(data.message);
                setTimeout(() => setSimMessage(null), 8000);
            } else {
                alert(data.error || "Simulation failed.");
            }
        } catch (error) {
            alert("Network error during simulation.");
        } finally {
            setIsSimulating(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-12 text-center text-red-500 font-bold uppercase tracking-widest text-xs">Access Denied</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <Settings className="text-[#9df01c]" size={36} />
                        Command Center
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Global Platform Settings and Architecture
                    </p>
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
            ) : activeTab === 'auto_joins' ? (
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* CREATE & TEST COLUMN */}
                    <div className="lg:col-span-5 space-y-8">
                        
                        {/* CREATE NEW RULE FORM */}
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 shadow-2xl relative overflow-hidden">
                            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-6">Create New Rule</h3>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">
                                        Target Community URL
                                    </label>
                                    <div className="flex items-center gap-2 bg-black border border-white/10 focus-within:border-[#9df01c] transition-colors rounded-xl px-4 py-3">
                                        <Link2 size={14} className="text-gray-500 shrink-0" />
                                        <input 
                                            type="text" 
                                            value={targetUrl}
                                            onChange={e => setTargetUrl(e.target.value)}
                                            placeholder="https://selloutcrowds.com/crowd/coaching" 
                                            className="bg-transparent text-white text-xs outline-none w-full flex-1" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                        Trigger For Roles
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {unaRoles.filter(r => r.id !== 18).map(role => {
                                            const isSelected = selectedRoles.includes(role.id);
                                            return (
                                                <button
                                                    key={role.id}
                                                    onClick={() => toggleRole(role.id)}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                        isSelected 
                                                            ? 'bg-[#9df01c]/10 border-[#9df01c]/50 text-[#9df01c]' 
                                                            : 'bg-black border-white/10 text-gray-400 hover:border-white/30'
                                                    }`}
                                                >
                                                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                    {role.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSaveAutoJoin} 
                                    disabled={isSaving || !targetUrl.trim() || selectedRoles.length === 0}
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                    Save Routing Rule
                                </button>
                            </div>
                        </div>

                        {/* TEST SIMULATOR CARD */}
                        <div className="bg-[#111] rounded-[2rem] border border-[#9df01c]/20 p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#9df01c]/10 blur-[50px] rounded-full pointer-events-none"></div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-[#9df01c] mb-6 flex items-center gap-2 relative z-10">
                                <Zap size={18} /> Test Simulator
                            </h3>

                            <div className="space-y-4 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Test User Email</label>
                                    <input
                                        type="email"
                                        value={testEmail}
                                        onChange={e => setTestEmail(e.target.value)}
                                        placeholder="testuser@example.com"
                                        className="bg-black border border-white/10 focus:border-[#9df01c] transition-colors rounded-xl px-4 py-3 text-white text-xs outline-none w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Simulate Role Upgrade</label>
                                    <select
                                        value={testRole}
                                        onChange={e => setTestRole(Number(e.target.value))}
                                        className="bg-black border border-white/10 focus:border-[#9df01c] transition-colors rounded-xl px-4 py-3 text-white text-xs outline-none w-full appearance-none"
                                    >
                                        {unaRoles.filter(r => r.id !== 18).map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleSimulate}
                                    disabled={isSimulating || !testEmail.trim()}
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                                >
                                    {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                    Run Test Upgrade
                                </button>

                                {simMessage && (
                                    <div className="p-3 bg-[#9df01c]/10 border border-[#9df01c]/20 rounded-xl mt-4">
                                        <p className="text-xs text-[#9df01c] font-bold text-center">{simMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ACTIVE RULES LIST */}
                    <div className="lg:col-span-7">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 shadow-2xl min-h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    Active Rules
                                    <span className="bg-white/10 text-gray-300 text-xs px-2.5 py-0.5 rounded-lg">
                                        {autoJoinRules.length}
                                    </span>
                                </h3>
                            </div>

                            <div className="flex-1">
                                {autoJoinRules.length === 0 ? (
                                    <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                                        <Users size={48} className="text-gray-600 mb-4 opacity-30" />
                                        <p className="text-gray-400 font-bold text-sm">No Active Rules</p>
                                        <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-2">
                                            Create a rule to automatically route upgraded users.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {autoJoinRules.map((rule) => {
                                            const activeRoleIds = JSON.parse(rule.target_roles || '[]');
                                            return (
                                                <div key={rule.id} className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-white/20 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono truncate mb-2">
                                                            <Link2 size={12} className="flex-shrink-0" /> {rule.target_url}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {activeRoleIds.map(roleId => {
                                                                const roleInfo = unaRoles.find(r => r.id === roleId);
                                                                return roleInfo ? (
                                                                    <span key={roleId} className="px-2 py-0.5 bg-white/10 border border-white/10 text-white rounded text-[9px] font-black uppercase tracking-widest">
                                                                        {roleInfo.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteAutoJoin(rule.id)}
                                                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors shrink-0" 
                                                        title="Delete Rule"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}