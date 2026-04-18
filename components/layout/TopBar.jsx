import React from 'react';
import { ChevronsUpDown, LogOut, CreditCard, LayoutDashboard, Image as ImageIcon, Link2, FileText, Users, Contact, ListChecks, Zap } from 'lucide-react';

export default function TopBar({
    currentApp, handleAppSwitch, isAppSwitcherOpen, setIsAppSwitcherOpen, handleLogout, unaData
}) {
    const getAppConfig = () => {
        switch(currentApp) {
            case 'business-card': return { name: 'Business Card', icon: <Contact size={20} className="text-[#9df01c]" /> };
            case 'address-book': return { name: 'Address Book', icon: <Users size={20} className="text-[#9df01c]" /> };
            case 'bridge': return { name: 'Access Control', icon: <CreditCard size={20} className="text-[#9df01c]" /> };
            case 'teammates': return { name: 'Teammates', icon: <Users size={20} className="text-[#9df01c]" /> };
            case 'linktree': return { name: 'Bio Page', icon: <Link2 size={20} className="text-[#9df01c]" /> };
            case 'assets': return { name: 'SC Brand Assets', icon: <ImageIcon size={20} className="text-[#9df01c]" /> };
            case 'guides': return { name: 'Help and Guides', icon: <FileText size={20} className="text-[#9df01c]" /> };
            case 'onboarding': return { name: 'Getting Started', icon: <ListChecks size={20} className="text-[#9df01c]" /> };
            default: return { name: 'Creator Hub', icon: <LayoutDashboard size={20} className="text-[#9df01c]" /> };
        }
    };
    const config = getAppConfig();
    
    const role = Number(unaData?.user?.role);
    // Show upgrade button for everyone EXCEPT role 17 (H.O.F.)
    const showUpgrade = role && role !== 17;

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
                            
                            <button onClick={() => handleAppSwitch('business-card', 'builder')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'business-card' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <Contact size={18} className={currentApp === 'business-card' ? 'text-[#9df01c]' : ''}/> Business Card
                            </button>
                            
                            <button onClick={() => handleAppSwitch('address-book', 'contacts')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'address-book' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <Users size={18} className={currentApp === 'address-book' ? 'text-[#9df01c]' : ''}/> Address Book
                            </button>

                            <button onClick={() => handleAppSwitch('bridge', 'stripe')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'bridge' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <CreditCard size={18} className={currentApp === 'bridge' ? 'text-[#9df01c]' : ''}/> Access Control
                            </button>

                            <button onClick={() => handleAppSwitch('teammates', 'manage')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'teammates' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <Users size={18} className={currentApp === 'teammates' ? 'text-[#9df01c]' : ''}/> Teammates
                            </button>
                            
                            <button onClick={() => handleAppSwitch('linktree', 'links')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'linktree' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <Link2 size={18} className={currentApp === 'linktree' ? 'text-[#9df01c]' : ''}/> Bio Page
                            </button>
                            
                            <button onClick={() => handleAppSwitch('assets', 'cat_1')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'assets' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <ImageIcon size={18} className={currentApp === 'assets' ? 'text-[#9df01c]' : ''}/> SC Brand Assets
                            </button>
                            
                            <button onClick={() => handleAppSwitch('guides', 'library')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${currentApp === 'guides' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <FileText size={18} className={currentApp === 'guides' ? 'text-[#9df01c]' : ''}/> Help and Guides
                            </button>

                            <button onClick={() => handleAppSwitch('onboarding', 'checklist')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors border-t border-white/5 ${currentApp === 'onboarding' ? 'bg-white/10 text-white' : 'text-[#9df01c] hover:bg-white/5'}`}>
                                <ListChecks size={18} className="text-[#9df01c]" /> Getting Started
                            </button>

                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3">
                {showUpgrade && (
                    <a 
                        href="https://www.selloutcrowds.com/plans" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-[#9df01c]/10 text-[#9df01c] hover:bg-[#9df01c] hover:text-black border border-[#9df01c]/20 px-3 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors shadow-sm"
                        title="Upgrade Account"
                    >
                        <Zap size={14} className="fill-current" />
                        <span className="hidden sm:inline">Unlock More</span>
                        <span className="sm:hidden">Upgrade</span>
                    </a>
                )}
                <button onClick={handleLogout} className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-red-500 hover:text-white transition-all text-gray-500 shadow-sm" title="Log Out">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}