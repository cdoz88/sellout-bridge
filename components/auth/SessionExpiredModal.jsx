import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function SessionExpiredModal({ session, setSession, setSessionExpired, handleLogout }) {
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] p-8 rounded-[2rem] border border-red-500/30 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4 relative z-10" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2 relative z-10">Session Expired</h3>
                <p className="text-sm font-medium text-gray-400 mb-6 relative z-10 leading-relaxed">
                    For your security, your session has timed out. To save your work without losing it, <strong>open the Hub in a new tab</strong>, log in, then come back here and click the button below.
                </p>
                <div className="space-y-3 relative z-10">
                    <button 
                        onClick={() => window.open(window.location.origin, '_blank')}
                        className="w-full bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold py-4 rounded-xl text-[11px] uppercase tracking-widest transition-colors"
                    >
                        1. Open Hub in New Tab
                    </button>
                    <button 
                        onClick={() => {
                            const newToken = localStorage.getItem('bridge_session');
                            if (newToken && newToken !== session) {
                                setSession(newToken);
                                setSessionExpired(false);
                            } else {
                                alert("We couldn't detect a new session. Please make sure you logged in on the new tab!");
                            }
                        }}
                        className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20"
                    >
                        2. I've Logged In, Resume Work
                    </button>
                </div>
                <button onClick={() => { setSessionExpired(false); handleLogout(); }} className="mt-6 text-[9px] text-gray-500 hover:text-white font-bold uppercase tracking-widest relative z-10 transition-colors">
                    Discard work and log out
                </button>
            </div>
        </div>
    );
}