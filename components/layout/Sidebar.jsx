import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Contact, LayoutDashboard, Globe, Image as ImageIcon, FileText, Download, RefreshCcw, Palette, Users, UserPlus, Repeat, Settings, Plus, Folder, Link2, ChevronUp, ChevronDown, Loader2, ListChecks, Lock, Zap } from 'lucide-react';

export default function Sidebar({ 
    currentApp, activeTab, setActiveTab, unaData, 
    syncCommunities, isSyncingCommunities, setIsMobileMenuOpen, session, handleAppSwitch
}) {
    const iconUrl = "https://admin.beasellout.com/wp-content/uploads/2025/04/cropped-Icon.png";
    const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = Number(unaData?.user?.role) === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    // Manual tab is unlocked for Admin, Rookie (15), All-Star (16), and H.O.F (17). Teammates (18) are locked out.
    const canUseManual = isAdmin || [15, 16, 17].includes(Number(unaData?.user?.role));

    const [categories, setCategories] = useState([]);
    const [isEditingCats, setIsEditingCats] = useState(false);
    const [isSavingCats, setIsSavingCats] = useState(false);

    const [guideCategories, setGuideCategories] = useState([]);
    const [isEditingGuideCats, setIsEditingGuideCats] = useState(false);
    const [isSavingGuideCats, setIsSavingGuideCats] = useState(false);

    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [completedSteps, setCompletedSteps] = useState([]);

    const fetchCategories = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/api/assets/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.categories) setCategories(data.categories);
        } catch(e) {}
    };

    const fetchGuideCategories = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/api/guides/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.categories) setGuideCategories(data.categories);
        } catch(e) {}
    };

    const fetchOnboardingData = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/api/onboarding/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.steps) setOnboardingSteps(data.steps);
            if (data.completedStepIds) setCompletedSteps(data.completedStepIds);
        } catch(e) {}
    };

    useEffect(() => {
        if (currentApp === 'assets') fetchCategories();
        if (currentApp === 'guides') fetchGuideCategories();
    }, [currentApp, session]);

    useEffect(() => {
        fetchOnboardingData();
        const handleUpdate = () => fetchOnboardingData();
        window.addEventListener('onboarding-updated', handleUpdate);
        return () => window.removeEventListener('onboarding-updated', handleUpdate);
    }, [session]);

    const handleNavClick = (tab) => {
        setActiveTab(tab);
        if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
    };

    const moveCatUp = (index) => {
        if (index === 0) return;
        const newCats = [...categories];
        [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
        setCategories(newCats);
    };

    const moveCatDown = (index) => {
        if (index === categories.length - 1) return;
        const newCats = [...categories];
        [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
        setCategories(newCats);
    };

    const handleSaveCategories = async () => {
        setIsSavingCats(true);
        try {
            const res = await fetch('/api/assets/categories/bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories })
            });
            if (!res.ok) throw new Error("Server rejected save");
            await fetchCategories();
            window.dispatchEvent(new CustomEvent('assets-updated'));
            setIsEditingCats(false);
        } catch (e) {
            alert("Failed to save categories. Please try again.");
        } finally {
            setIsSavingCats(false);
        }
    };

    const handleDeleteCat = async (id) => {
        if (id.toString().startsWith('temp_')) {
            setCategories(categories.filter(c => c.id !== id));
            return;
        }
        if(!window.confirm("Delete this category AND all assets inside it?")) return;
        await fetch('/api/assets/categories/delete', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        await fetchCategories();
        window.dispatchEvent(new CustomEvent('assets-updated'));
    };

    const moveGuideCatUp = (index) => {
        if (index === 0) return;
        const newCats = [...guideCategories];
        [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
        setGuideCategories(newCats);
    };

    const moveGuideCatDown = (index) => {
        if (index === guideCategories.length - 1) return;
        const newCats = [...guideCategories];
        [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
        setGuideCategories(newCats);
    };

    const handleSaveGuideCategories = async () => {
        setIsSavingGuideCats(true);
        try {
            const res = await fetch('/api/guides/categories/bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories: guideCategories })
            });
            if (!res.ok) throw new Error("Server rejected save");
            await fetchGuideCategories();
            window.dispatchEvent(new CustomEvent('guides-updated'));
            setIsEditingGuideCats(false);
        } catch (e) {
            alert("Failed to save categories. Please try again.");
        } finally {
            setIsSavingGuideCats(false);
        }
    };

    const handleDeleteGuideCat = async (id) => {
        if (id.toString().startsWith('temp_')) {
            setGuideCategories(guideCategories.filter(c => c.id !== id));
            return;
        }
        if(!window.confirm("Delete this category AND all guides inside it?")) return;
        await fetch('/api/guides/categories/delete', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        await fetchGuideCategories();
        window.dispatchEvent(new CustomEvent('guides-updated'));
    };

    const getRoleName = (roleId) => {
        if (!roleId) return 'Creator';
        switch (Number(roleId)) {
            case 3: return 'Admin';
            case 15: return 'Rookie';
            case 16: return 'All-Star';
            case 17: return 'H.O.F.';
            case 18: return 'Teammate';
            default: return 'Creator'; 
        }
    };

    const progressPercent = onboardingSteps.length > 0 ? Math.round((completedSteps.length / onboardingSteps.length) * 100) : 0;
    const showProgressBar = onboardingSteps.length > 0 && progressPercent < 100;

    return (
        <div className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full shadow-xl flex-shrink-0 z-40 relative pb-16 lg:pb-0">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center text-black overflow-hidden p-1.5 flex-shrink-0">
                    <img src={iconUrl} alt="SC Icon" className="w-full h-full object-contain" />
                </div>
                <div className="overflow-hidden">
                    <span className="block font-black uppercase tracking-tighter text-sm italic leading-none text-white truncate">{unaData.user?.name || 'Creator'}</span>
                    <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.2em] mt-1 block truncate">
                        {getRoleName(unaData.user?.role)}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 custom-scrollbar flex flex-col">
                
                {showProgressBar && (
                    <div className="px-4 mb-6 cursor-pointer group" onClick={() => handleAppSwitch && handleAppSwitch('onboarding', 'checklist')}>
                        <div className="bg-[#111] border border-white/5 group-hover:border-[#9df01c]/50 rounded-2xl p-4 transition-all relative overflow-hidden shadow-lg shadow-black/50">
                            <div className="absolute top-0 left-0 h-1 bg-[#9df01c] transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            <div className="flex items-center gap-3 mb-1 mt-1">
                                <div className="w-8 h-8 rounded-lg bg-[#9df01c]/10 text-[#9df01c] flex items-center justify-center flex-shrink-0 border border-[#9df01c]/20">
                                    <ListChecks size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white mb-0.5">Getting Started</p>
                                    <p className="text-[9px] text-gray-500 font-bold">{progressPercent}% Complete</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'bridge' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Integrations</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('stripe')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'stripe' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <CreditCard size={16} /> Stripe {!isAdmin && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                                <button onClick={() => handleNavClick('paypal')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'paypal' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Smartphone size={16} /> PayPal {!isAdmin && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                                <button onClick={() => handleNavClick('patreon')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'patreon' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <img src={patreonIcon} alt="Patreon" className={`w-4 h-4 object-contain ${activeTab === 'patreon' ? 'filter invert' : ''}`} /> Patreon {!isAdmin && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                                
                                <div className="h-px bg-white/5 my-2 mx-2"></div>
                                
                                <button onClick={() => handleNavClick('mappings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'mappings' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Zap size={16} /> Access Rules {!isAdmin && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                                <button onClick={() => handleNavClick('manual')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'manual' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <UserPlus size={16} /> Manual {!canUseManual && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                                <button onClick={() => handleNavClick('aliases')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'aliases' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Repeat size={16} /> Email to Email {!isAdmin && <Lock size={12} className="ml-auto opacity-50 shrink-0" />}
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 pb-4">
                            <button 
                                onClick={() => syncCommunities()}
                                disabled={isSyncingCommunities || !isAdmin}
                                className={`w-full flex items-center justify-center gap-2 font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-all ${
                                    !isAdmin 
                                        ? 'bg-[#111] text-gray-600 border border-white/5 cursor-not-allowed' 
                                        : 'bg-[#9df01c]/10 text-[#9df01c] hover:bg-[#9df01c] hover:text-black border border-[#9df01c]/20'
                                }`}>
                                {isSyncingCommunities ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : !isAdmin ? (
                                    <Lock className="w-4 h-4" />
                                ) : (
                                    <RefreshCcw className="w-4 h-4" />
                                )}
                                {isSyncingCommunities ? 'Syncing...' : 'Sync Communities'}
                            </button>
                            <p className="text-[9px] text-gray-600 mt-3 text-center px-2 font-medium leading-relaxed">
                                {isAdmin 
                                    ? 'Click to refresh your Space and Crowd lists if you recently added a new one on the main site.' 
                                    : 'Enterprise subscription required to sync communities.'}
                            </p>
                        </div>
                    </div>
                )}

                {currentApp === 'teammates' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('manage')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'manage' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Users size={16} /> Manage Team
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'onboarding' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('checklist')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'checklist' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <ListChecks size={16} /> Setup Checklist
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'business-card' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('builder')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'builder' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <LayoutDashboard size={16} /> Card Builder
                                </button>
                                <button onClick={() => handleNavClick('design')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'design' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Palette size={16} /> Design & Theme
                                </button>
                                <button onClick={() => handleNavClick('url')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'url' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Globe size={16} /> Custom URL
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'linktree' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('links')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'links' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Link2 size={16} /> Links and Info
                                </button>
                                <button onClick={() => handleNavClick('design')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'design' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Palette size={16} /> Design & Theme
                                </button>
                                <button onClick={() => handleNavClick('url')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'url' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Globe size={16} /> Custom URL
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'address-book' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('contacts')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'contacts' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Users size={16} /> All Contacts
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentApp === 'assets' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <div className="flex items-center justify-between mb-3 px-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Brand Kit</p>
                                {isAdmin && !isEditingCats && (
                                    <button onClick={() => setIsEditingCats(true)} className="text-gray-500 hover:text-[#9df01c] transition-colors" title="Manage Categories">
                                        <Settings size={14} />
                                    </button>
                                )}
                            </div>

                            {isEditingCats ? (
                                <div className="space-y-2 animate-in fade-in zoom-in-95">
                                    {categories.map((cat, index) => (
                                        <div key={cat.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-2 border border-white/10 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                    <button onClick={() => moveCatUp(index)} disabled={index === 0} className={`p-0.5 rounded ${index === 0 ? 'text-gray-700' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button onClick={() => moveCatDown(index)} disabled={index === categories.length - 1} className={`p-0.5 rounded ${index === categories.length - 1 ? 'text-gray-700' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={cat.name} 
                                                    onChange={(e) => setCategories(cats => cats.map(c => c.id === cat.id ? {...c, name: e.target.value} : c))} 
                                                    className="w-full bg-black text-[10px] font-bold text-white p-2 rounded-lg outline-none border border-white/5 focus:border-[#9df01c]" 
                                                />
                                            </div>
                                            <div className="flex justify-between px-1 pl-8">
                                                <button 
                                                    onClick={() => setCategories(cats => cats.map(c => c.id === cat.id ? {...c, is_hidden: !c.is_hidden} : c))} 
                                                    className="text-[9px] text-gray-400 font-bold uppercase tracking-widest hover:text-white">
                                                    {cat.is_hidden ? 'Unhide' : 'Hide'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCat(cat.id)} 
                                                    className="text-[9px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setCategories([...categories, { id: `temp_${Date.now()}`, name: 'New Category', is_hidden: false }])} 
                                        className="w-full py-2.5 border border-dashed border-[#9df01c]/30 hover:bg-[#9df01c]/10 text-[#9df01c] text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-4">
                                        <Plus size={14} /> Add Category
                                    </button>
                                    <button 
                                        onClick={handleSaveCategories} 
                                        disabled={isSavingCats}
                                        className="w-full py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors mt-2 flex items-center justify-center gap-2">
                                        {isSavingCats ? <Loader2 size={14} className="animate-spin"/> : null}
                                        {isSavingCats ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {categories.length === 0 ? (
                                        <p className="text-[10px] text-gray-600 px-2 italic">No categories found.</p>
                                    ) : (
                                        categories.map(cat => (
                                            <button key={cat.id} onClick={() => handleNavClick(`cat_${cat.id}`)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === `cat_${cat.id}` ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                                <div className="flex items-center gap-3"><Folder size={16} /> {cat.name}</div>
                                                {cat.is_hidden && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Hidden</span>}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentApp === 'guides' && (
                    <div className="px-4 flex flex-col flex-1 h-full min-h-full">
                        <div>
                            <div className="flex items-center justify-between mb-3 px-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Help & Guides</p>
                                {isAdmin && !isEditingGuideCats && (
                                    <button onClick={() => setIsEditingGuideCats(true)} className="text-gray-500 hover:text-[#9df01c] transition-colors" title="Manage Categories">
                                        <Settings size={14} />
                                    </button>
                                )}
                            </div>

                            {isEditingGuideCats ? (
                                <div className="space-y-2 animate-in fade-in zoom-in-95">
                                    {guideCategories.map((cat, index) => (
                                        <div key={cat.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-2 border border-white/10 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                    <button onClick={() => moveGuideCatUp(index)} disabled={index === 0} className={`p-0.5 rounded ${index === 0 ? 'text-gray-700' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button onClick={() => moveGuideCatDown(index)} disabled={index === guideCategories.length - 1} className={`p-0.5 rounded ${index === guideCategories.length - 1 ? 'text-gray-700' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={cat.name} 
                                                    onChange={(e) => setGuideCategories(cats => cats.map(c => c.id === cat.id ? {...c, name: e.target.value} : c))} 
                                                    className="w-full bg-black text-[10px] font-bold text-white p-2 rounded-lg outline-none border border-white/5 focus:border-[#9df01c]" 
                                                />
                                            </div>
                                            <div className="flex justify-between px-1 pl-8">
                                                <button 
                                                    onClick={() => setGuideCategories(cats => cats.map(c => c.id === cat.id ? {...c, is_hidden: !c.is_hidden} : c))} 
                                                    className="text-[9px] text-gray-400 font-bold uppercase tracking-widest hover:text-white">
                                                    {cat.is_hidden ? 'Unhide' : 'Hide'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteGuideCat(cat.id)} 
                                                    className="text-[9px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setGuideCategories([...guideCategories, { id: `temp_${Date.now()}`, name: 'New Category', is_hidden: false }])} 
                                        className="w-full py-2.5 border border-dashed border-[#9df01c]/30 hover:bg-[#9df01c]/10 text-[#9df01c] text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-4">
                                        <Plus size={14} /> Add Category
                                    </button>
                                    <button 
                                        onClick={handleSaveGuideCategories} 
                                        disabled={isSavingGuideCats}
                                        className="w-full py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors mt-2 flex items-center justify-center gap-2">
                                        {isSavingGuideCats ? <Loader2 size={14} className="animate-spin"/> : null}
                                        {isSavingGuideCats ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {guideCategories.length === 0 ? (
                                        <p className="text-[10px] text-gray-600 px-2 italic">No categories found.</p>
                                    ) : (
                                        guideCategories.map(cat => (
                                            <button key={cat.id} onClick={() => handleNavClick(`cat_${cat.id}`)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === `cat_${cat.id}` ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                                <div className="flex items-center gap-3"><FileText size={16} /> {cat.name}</div>
                                                {cat.is_hidden && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Hidden</span>}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}