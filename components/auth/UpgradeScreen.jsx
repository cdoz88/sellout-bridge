import React from 'react';
import { AlertCircle, ArrowLeft, ArrowUpCircle } from 'lucide-react';

export default function UpgradeScreen({ handleLogout, toolName, roleName }) {
    const message = toolName && roleName 
        ? `${toolName} is not available for ${roleName} subscribers. Upgrade your account to access this tool!`
        : `These tools are not available for ${roleName ? roleName : 'your current'} subscribers. Upgrade your account to access them!`;

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans p-4 text-center w-full h-full">
            <div className="bg-[#111] border border-white/5 rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <AlertCircle size={32} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Upgrade Required</h1>
                <p className="text-gray-400 font-medium text-sm leading-relaxed mb-8">
                    {message}
                </p>
                <a 
                    href="https://www.selloutcrowds.com/plans" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-[#9df01c] text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 mb-3"
                >
                    <ArrowUpCircle size={16} /> Upgrade Account
                </a>
                <a 
                    href="https://office.selloutcrowds.com/?app=dashboard&tab=home"
                    className="w-full bg-white/5 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 mb-6"
                >
                    <ArrowLeft size={16} /> Back to Front Office
                </a>
                
                <button onClick={handleLogout} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
                    Log out of this account
                </button>
            </div>
        </div>
    );
}