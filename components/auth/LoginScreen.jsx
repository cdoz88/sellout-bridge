import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LoginScreen({ logoUrl, error, isLoading, startLogin }) {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center px-4 font-sans text-white">
            <img src={logoUrl} alt="Sellout Crowds" className="max-w-[300px] w-full mb-10 relative z-10" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none text-white">Front Office</h1>
            <p className="text-gray-400 max-w-md mx-auto mb-10 text-sm font-medium leading-relaxed">
                Login with your Sellout Crowds credentials to access your business tools, integrations, and guides.
            </p>
            
            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center gap-2 text-xs font-bold justify-center">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <button 
                onClick={startLogin}
                disabled={isLoading}
                className="bg-[#9df01c] hover:bg-[#8ce015] text-black font-black uppercase text-[11px] tracking-widest py-3.5 px-8 rounded-xl transition-all flex items-center justify-center min-w-[200px] shadow-lg shadow-[#9df01c]/10"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login to Office"}
            </button>
        </div>
    );
}