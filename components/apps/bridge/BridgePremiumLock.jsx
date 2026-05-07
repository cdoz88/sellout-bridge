import React from 'react';
import { Lock } from 'lucide-react';

export default function BridgePremiumLock() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
            <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                    The Subscription Bridge allows creators to bypass standard site commissions by connecting their external billing accounts. This tool is available to our premium subscribers.
                </p>
                <a 
                    href="https://www.selloutcrowds.com/plans" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#9df01c] text-black font-black py-4 px-10 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10"
                >
                    Learn More About Premium Plans
                </a>
            </div>
        </div>
    );
}