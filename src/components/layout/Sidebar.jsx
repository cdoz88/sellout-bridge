import React from 'react';
import { CreditCard, Smartphone, LayoutDashboard, Settings, Image, FileText, Link2, DownloadCloud } from 'lucide-react';

export default function Sidebar({ currentApp, activeTab, setActiveTab, unaData }) {
    const iconUrl = "https://beasellout.com/wp-content/uploads/2025/04/cropped-Icon.png";
    const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

    return (
        <div className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full shadow-xl flex-shrink-0 z-40 relative">
            {/* User Profile Block */}
            <div className="p-5 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center text-black overflow-hidden p-1.5 flex-shrink-0">
                    <img src={iconUrl} alt="SC Icon" className="w-full h-full object-contain" />
                </div>
                <div className="overflow-hidden">
                    <span className="block font-black uppercase tracking-tighter text-sm italic leading-none text-white truncate">{unaData.user?.name || 'Creator'}</span>
                    <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.2em] mt-1 block truncate">Creator Hub</span>
                </div>
            </div>

            {/* Contextual App Menus */}
            <div className="flex-1 overflow-y-auto py-6 space-y-8">
                {currentApp === 'bridge' && (
                    <div className="px-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Integrations</p>
                        <div className="space-y-1">
                            <button onClick={() => setActiveTab('stripe')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'stripe' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <CreditCard size={16} /> Stripe
                            </button>
                            <button onClick={() => setActiveTab('paypal')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'paypal' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Smartphone size={16} /> PayPal
                            </button>
                            <button onClick={() => setActiveTab('patreon')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'patreon' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <img src={patreonIcon} alt="Patreon" className={`w-4 h-4 object-contain ${activeTab === 'patreon' ? 'filter invert' : ''}`} /> Patreon
                            </button>
                        </div>
                    </div>
                )}

                {currentApp === 'business-card' && (
                    <div className="px-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Menu</p>
                        <div className="space-y-1">
                            <button onClick={() => setActiveTab('builder')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'builder' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <LayoutDashboard size={16} /> Builder
                            </button>
                            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'settings' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Settings size={16} /> Settings
                            </button>
                        </div>
                    </div>
                )}

                {currentApp === 'assets' && (
                    <div className="px-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Brand Kit</p>
                        <div className="space-y-1">
                            <button onClick={() => setActiveTab('logos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'logos' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Image size={16} /> SC Logos
                            </button>
                            <button onClick={() => setActiveTab('graphics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === 'graphics' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <DownloadCloud size={16} /> Promo Graphics
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}