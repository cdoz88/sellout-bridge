import React from 'react';
import { CreditCard, Smartphone, LayoutDashboard, Globe, Image as ImageIcon, FileText, Download, RefreshCcw, Palette, Users, UserPlus, Repeat, Link2 } from 'lucide-react';

export default function Sidebar({ 
    currentApp, activeTab, setActiveTab, unaData, 
    syncCommunities, isSyncingCommunities, setIsMobileMenuOpen 
}) {
    const iconUrl = "https://beasellout.com/wp-content/uploads/2025/04/cropped-Icon.png";
    const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

    const handleNavClick = (tab) => {
        setActiveTab(tab);
        if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
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

                {/* NEW: BIO PAGE MENU */}
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
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Brand Kit</p>
                        <div className="space-y-1">
                            <button onClick={() => handleNavClick('logos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'logos' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <ImageIcon size={16} /> SC Logos
                            </button>
                            <button onClick={() => handleNavClick('graphics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'graphics' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Download size={16} /> Promo Graphics
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}