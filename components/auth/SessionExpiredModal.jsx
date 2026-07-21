import React from 'react';
import { AlertCircle, LogIn } from 'lucide-react';

export default function SessionExpiredModal({ setSessionExpired, handleLogout, startLogin }) {
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] p-8 rounded-[2rem] border border-red-500/30 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4 relative z-10" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2 relative z-10">Session Expired</h3>
                <p className="text-sm font-medium text-gray-400 mb-6 relative z-10 leading-relaxed">
                    For your security, your session has timed out. Please click below to quickly re-authenticate. You will be brought right back to where you left off!
                </p>
                <div className="space-y-3 relative z-10">
                    <button 
                        onClick={() => {
                            setSessionExpired(false);
                            startLogin();
                        }}
                        className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 flex items-center justify-center gap-2"
                    >
                        <LogIn size={18} />
                        Securely Log Back In
                    </button>
                </div>
                <button 
                    onClick={() => { 
                        setSessionExpired(false); 
                        handleLogout(); 
                    }} 
                    className="mt-6 text-[9px] text-gray-500 hover:text-white font-bold uppercase tracking-widest relative z-10 transition-colors"
                >
                    Discard work and log out
                </button>
            </div>
        </div>
    );
}