import React from 'react';
import { Layers, CreditCard, CheckCircle2 } from 'lucide-react';

export default function BridgeOptIn({ setHasOptedIn, canUseBridge }) {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
            <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full text-left">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="w-16 h-16 bg-[#9df01c]/10 rounded-2xl flex items-center justify-center text-[#9df01c] mb-6 relative z-10 mx-auto">
                    <Layers size={32} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10 text-center">Enable Subscription Bridge</h3>
                <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed text-center">
                    Add your community as a seamless perk for your existing website subscribers. The Subscription Bridge grants your audience access without making them pay in two places, and automatically syncs their community membership with their active billing status.
                </p>
                
                <div className="bg-black border border-white/5 rounded-2xl p-6 mb-8 w-full max-w-md mx-auto relative z-10 shadow-lg">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><CreditCard size={18} className="text-[#9df01c]"/> Pay-As-You-Grow Pricing</h4>
                    <ul className="space-y-3 text-sm text-gray-400 font-medium">
                        <li className="flex items-start gap-3"><CheckCircle2 size={16} className="text-[#9df01c] mt-0.5 flex-shrink-0"/> <span>Sync users from Stripe, PayPal, or Patreon.</span></li>
                        <li className="flex items-start gap-3"><CheckCircle2 size={16} className="text-[#9df01c] mt-0.5 flex-shrink-0"/> <span>Automatically grant and revoke community access.</span></li>
                        <li className="flex items-start gap-3"><CheckCircle2 size={16} className="text-[#9df01c] mt-0.5 flex-shrink-0"/> <span>Billed automatically at <strong>$0.50/month per bridged user</strong> via your Sellout Crowds invoice.</span></li>
                    </ul>
                </div>

                {canUseBridge ? (
                    <>
                        <button onClick={() => setHasOptedIn(true)} className="bg-[#9df01c] mx-auto block text-black font-black py-4 px-12 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10">
                            I Understand, Enable Bridge
                        </button>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4 text-center relative z-10">You will not be billed until you successfully map a user.</p>
                    </>
                ) : (
                    <a href="https://www.selloutcrowds.com/plans" target="_blank" rel="noopener noreferrer" className="bg-[#9df01c] w-fit mx-auto block text-black font-black py-4 px-12 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10">
                        Upgrade to Unlock
                    </a>
                )}
            </div>
        </div>
    );
}