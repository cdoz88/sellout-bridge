import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function UpgradeScreen({ handleLogout }) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
            <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full"></div>
                
                <div className="flex justify-center mb-6 relative z-10">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Creators Only</h2>
                <p className="text-gray-400 mb-8 text-sm font-medium leading-relaxed relative z-10">
                    The Creator Hub is exclusively for premium Sellout Crowds members. Upgrade your plan to access these business tools!
                </p>

                <div className="space-y-3 relative z-10">
                    <a 
                        href="https://www.selloutcrowds.com/plans" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2"
                    >
                        Upgrade Account
                    </a>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-white/5 text-white hover:bg-white/10 font-bold py-4 rounded-xl text-xs transition-colors"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}