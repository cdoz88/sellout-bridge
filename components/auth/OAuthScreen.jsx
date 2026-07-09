import React from 'react';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import WordPressIcon from '../icons/WordPressIcon';

export default function OAuthScreen({ 
    logoUrl, unaData, oauthParams, oauthError, oauthApproving, handleApproveOAuth 
}) {
    const role = Number(unaData?.user?.role);
    const isPremium = ![1, 2, 15, 18].includes(role);

    if (!isPremium) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
                <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                    <Lock size={56} className="text-gray-500 mb-6 relative z-10 mx-auto" />
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                    <p className="text-sm font-medium text-gray-400 mb-8 leading-relaxed relative z-10">
                        The WordPress integration is exclusively available to All-Star, H.O.F. and Commissioner Exempt subscribers.
                    </p>
                    <a 
                        href="https://www.selloutcrowds.com/plans" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#9df01c] text-black block w-full font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10 mb-3"
                    >
                        Upgrade Account
                    </a>
                    <button 
                        onClick={() => {
                            if (oauthParams?.redirect_uri) {
                                const redirectUrl = new URL(oauthParams.redirect_uri);
                                redirectUrl.searchParams.set('soc_error', 'access_denied');
                                window.location.href = redirectUrl.toString();
                            } else {
                                window.location.href = "https://selloutcrowds.com";
                            }
                        }}
                        className="w-full bg-white/5 text-white hover:bg-white/10 font-bold py-4 rounded-xl text-xs transition-colors"
                    >
                        Return to WordPress
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
            <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/10 blur-[100px] rounded-full"></div>
                
                <div className="flex justify-center mb-6 relative z-10">
                    <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                        <img src={logoUrl} alt="SC" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="w-8 h-0.5 bg-white/10 self-center -mx-2 z-0"></div>
                    <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                        <WordPressIcon className="w-8 h-8 text-[#00769d]" />
                    </div>
                </div>

                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Connect WordPress</h2>
                <p className="text-gray-400 mb-8 text-sm font-medium leading-relaxed relative z-10">
                    Do you want to allow this WordPress site to view your communities and publish posts on your behalf?
                </p>

                {oauthError && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold relative z-10">
                        {oauthError}
                    </div>
                )}

                <div className="space-y-3 relative z-10">
                    <button 
                        onClick={handleApproveOAuth}
                        disabled={oauthApproving}
                        className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2">
                        {oauthApproving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                        {oauthApproving ? 'Approving...' : 'Approve Connection'}
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (oauthParams?.redirect_uri) {
                                const redirectUrl = new URL(oauthParams.redirect_uri);
                                redirectUrl.searchParams.set('soc_error', 'access_denied');
                                window.location.href = redirectUrl.toString();
                            }
                        }}
                        className="w-full bg-white/5 text-white hover:bg-white/10 font-bold py-4 rounded-xl text-xs transition-colors">
                        Cancel & Return
                    </button>
                </div>
            </div>
        </div>
    );
}