import React from 'react';
import { ChevronsUpDown, LogOut, CreditCard, LayoutDashboard, Image, Link2, FileText } from 'lucide-react';

export default function TopBar({
    currentApp, handleAppSwitch, isAppSwitcherOpen, setIsAppSwitcherOpen, handleLogout
}) {
    const getAppConfig = () => {
        switch(currentApp) {
            case 'bridge': return { name: 'Subscription Bridge', icon: <CreditCard size={20} className="text-[#9df01c]" /> };
            case 'business-card': return { name: 'Business Card Builder', icon: <LayoutDashboard size={20} className="text-[#9df01c]" /> };
            case 'assets': return { name: 'Brand Assets', icon: <Image size={20} className="text-[#9df01c]" /> };
            case 'linktree': return { name: 'Link-in-Bio Tool', icon: <Link2 size={20} className="text-[#9df01c]" /> };
            case 'guides': return { name: 'Creator Guides', icon: <FileText size={20} className="text-[#9df01c]" /> };
            default: return { name: 'Creator Hub', icon: <LayoutDashboard size={20} className="text-[#9df01c]" /> };
        }
    };
    const config = getAppConfig();

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 z-30 sticky top-0 flex-shrink-0">
            <div className="relative">
                <button onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)} className="flex items-center gap-2 font-black text-xl uppercase italic tracking-tighter px-2 py-1.5 -ml-2 rounded-lg hover:bg-white/5 transition-colors text-white">
                    {config.icon}
                    <span>{config.name}</span>
                    <ChevronsUpDown size={18} className="text-gray-500 ml-1" />
                </button>

                {isAppSwitcherOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAppSwitcherOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 w-64 bg-[#111] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50 py-2 animate-in slide-in-from-top-2 duration-200">
                            <button onClick={() => handleAppSwitch('bridge', 'stripe')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'bridge' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><CreditCard size={18} className={currentApp === 'bridge' ? 'text-[#9df01c]' : ''}/> Subscription Bridge</button>
                            <button onClick={() => handleAppSwitch('business-card', 'builder')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'business-card' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><LayoutDashboard size={18} className={currentApp === 'business-card' ? 'text-[#9df01c]' : ''}/> Business Card Builder</button>
                            <button onClick={() => handleAppSwitch('linktree', 'links')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'linktree' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Link2 size={18} className={currentApp === 'linktree' ? 'text-[#9df01c]' : ''}/> Link-in-Bio Tool</button>
                            <button onClick={() => handleAppSwitch('assets', 'logos')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'assets' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Image size={18} className={currentApp === 'assets' ? 'text-[#9df01c]' : ''}/> Brand Assets</button>
                            <button onClick={() => handleAppSwitch('guides', 'getting-started')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'guides' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><FileText size={18} className={currentApp === 'guides' ? 'text-[#9df01c]' : ''}/> Creator Guides</button>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button onClick={handleLogout} className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-red-500 hover:text-white transition-all text-gray-500 shadow-sm" title="Log Out">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}