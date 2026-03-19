import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Contact, LayoutDashboard, Globe, Image as ImageIcon, FileText, Download, RefreshCcw, Palette, Users, UserPlus, Repeat, Settings, Plus, Folder, Link2 } from 'lucide-react';

export default function Sidebar({ 
    currentApp, activeTab, setActiveTab, unaData, 
    syncCommunities, isSyncingCommunities, setIsMobileMenuOpen, session
}) {
    const iconUrl = "https://beasellout.com/wp-content/uploads/2025/04/cropped-Icon.png";
    const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    // Category states for Assets and Guides
    const [categories, setCategories] = useState([]);
    const [isEditingCats, setIsEditingCats] = useState(false);

    const [guideCategories, setGuideCategories] = useState([]);
    const [isEditingGuideCats, setIsEditingGuideCats] = useState(false);

    const fetchCategories = async () => {
        if (!session) return;
        try {
            const res = await fetch('/api/assets/data', { headers: { 'Authorization': `Bearer ${session}` } });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.categories) {
                setCategories(data.categories);
                if (currentApp === 'assets' && data.categories.length > 0 && (!activeTab || activeTab === 'logos' || activeTab === 'graphics')) {
                    setActiveTab(`cat_${data.categories[0].id}`);
                }
            }
        } catch(e) {}
    };

    const fetchGuideCategories = async () => {
        if (!session) return;
        try {
            const res = await fetch('/api/guides/data', { headers: { 'Authorization': `Bearer ${session}` } });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.categories) {
                setGuideCategories(data.categories);
                if (currentApp === 'guides' && data.categories.length > 0 && (!activeTab || activeTab === 'library')) {
                    setActiveTab(`cat_${data.categories[0].id}`);
                }
            }
        } catch(e) {}
    };

    useEffect(() => {
        if (currentApp === 'assets') fetchCategories();
        if (currentApp === 'guides') fetchGuideCategories();
    }, [currentApp, session]);

    const handleNavClick = (tab) => {
        setActiveTab(tab);
        if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
    };

    // Assets saving
    const handleSaveCategories = async () => {
        for (const cat of categories) {
            await fetch('/api/assets/categories', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cat.id.toString().startsWith('temp_') ? null : cat.id, name: cat.name, is_hidden: cat.is_hidden })
            });
        }
        setIsEditingCats(false);
        fetchCategories();
        window.dispatchEvent(new CustomEvent('assets-updated'));
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
        fetchCategories();
        window.dispatchEvent(new CustomEvent('assets-updated'));
    };

    // Guides saving
    const handleSaveGuideCategories = async () => {
        for (const cat of guideCategories) {
            await fetch('/api/guides/categories', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cat.id.toString().startsWith('temp_') ? null : cat.id, name: cat.name, is_hidden: cat.is_hidden })
            });
        }
        setIsEditingGuideCats(false);
        fetchGuideCategories();
        window.dispatchEvent(new CustomEvent('guides-updated'));
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
        fetchGuideCategories();
        window.dispatchEvent(new CustomEvent('guides-updated'));
    };

    return (
        <div className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full shadow-xl flex-shrink-0 z-40 relative pb-16 lg:pb-0">
            <div className="p-5 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center text-black overflow-hidden p-1.5 flex-shrink-0">
                    <img src={iconUrl} alt="SC Icon" className="w-full h-full object-contain" />
                </div>
                <div className="overflow-hidden">
                    <span className="block font-black uppercase tracking-tighter text-sm italic leading-none text-white truncate">{unaData.user?.name || 'Creator'}</span>
                    <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.2em] mt-1 block truncate">Creator Hub</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-8 custom-scrollbar">
                
                {currentApp === 'bridge' && (
                    <div className="px-4 flex flex-col h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Integrations</p>
                            <div className="space-y-1">
                                <button onClick={() => handleNavClick('stripe')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'stripe' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <CreditCard size={16} /> Stripe
                                </button>
                                <button onClick={() => handleNavClick('paypal')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'paypal' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Smartphone size={16} /> PayPal
                                </button>
                                <button onClick={() => handleNavClick('patreon')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'patreon' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <img src={patreonIcon} alt="Patreon" className={`w-4 h-4 object-contain ${activeTab === 'patreon' ? 'filter invert' : ''}`} /> Patreon
                                </button>
                                <button onClick={() => handleNavClick('manual')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'manual' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <UserPlus size={16} /> Manual
                                </button>
                                <button onClick={() => handleNavClick('aliases')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'aliases' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Repeat size={16} /> Email to Email
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Sellout Crowds</p>
                            <button 
                                onClick={() => syncCommunities()}
                                disabled={isSyncingCommunities}
                                className="w-full flex items-center justify-center gap-2 bg-[#9df01c]/10 text-[#9df01c] hover:bg-[#9df01c] hover:text-black border border-[#9df01c]/20 font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                                <RefreshCcw className={`w-4 h-4 ${isSyncingCommunities ? 'animate-spin' : ''}`} /> 
                                {isSyncingCommunities ? 'Syncing...' : 'Sync Communities'}
                            </button>
                            <p className="text-[9px] text-gray-600 mt-3 text-center px-2 font-medium leading-relaxed">
                                Click to refresh your Space and Crowd lists if you recently added a new one on the main site.
                            </p>
                        </div>
                    </div>
                )}

                {currentApp === 'business-card' && (
                    <div className="px-4">
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
                )}

                {currentApp === 'linktree' && (
                    <div className="px-4">
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
                )}

                {currentApp === 'address-book' && (
                    <div className="px-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                        <div className="space-y-1">
                            <button onClick={() => handleNavClick('contacts')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'contacts' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Users size={16} /> All Contacts
                            </button>
                        </div>
                    </div>
                )}

                {currentApp === 'assets' && (
                    <div className="px-4">
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
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-2 border border-white/10">
                                        <input 
                                            type="text" 
                                            value={cat.name} 
                                            onChange={(e) => setCategories(cats => cats.map(c => c.id === cat.id ? {...c, name: e.target.value} : c))} 
                                            className="bg-black text-[10px] font-bold text-white p-2 rounded-lg outline-none border border-white/5 focus:border-[#9df01c]" 
                                        />
                                        <div className="flex justify-between px-1">
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
                                    className="w-full py-2.5 border border-dashed border-[#9df01c]/30 hover:bg-[#9df01c]/10 text-[#9df01c] text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors flex items-center justify-center gap-2">
                                    <Plus size={14} /> Add Category
                                </button>
                                <button 
                                    onClick={handleSaveCategories} 
                                    className="w-full py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors mt-2">
                                    Save Changes
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
                )}

                {currentApp === 'guides' && (
                    <div className="px-4">
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
                                {guideCategories.map(cat => (
                                    <div key={cat.id} className="bg-white/5 p-2.5 rounded-xl flex flex-col gap-2 border border-white/10">
                                        <input 
                                            type="text" 
                                            value={cat.name} 
                                            onChange={(e) => setGuideCategories(cats => cats.map(c => c.id === cat.id ? {...c, name: e.target.value} : c))} 
                                            className="bg-black text-[10px] font-bold text-white p-2 rounded-lg outline-none border border-white/5 focus:border-[#9df01c]" 
                                        />
                                        <div className="flex justify-between px-1">
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
                                    className="w-full py-2.5 border border-dashed border-[#9df01c]/30 hover:bg-[#9df01c]/10 text-[#9df01c] text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors flex items-center justify-center gap-2">
                                    <Plus size={14} /> Add Category
                                </button>
                                <button 
                                    onClick={handleSaveGuideCategories} 
                                    className="w-full py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black text-[10px] uppercase tracking-widest font-black rounded-xl transition-colors mt-2">
                                    Save Changes
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
                )}
            </div>
        </div>
    );
}