import React from 'react';
import { FileText, Plus } from 'lucide-react';

export default function GuidesApp({ unaData }) {
    // --- ADMIN ROLE BASED ACCESS CONTROL ---
    const ADMIN_EMAILS = [
        'info@ffadvice.com', 
        'info@fsan.com', 
        'info@selloutcrowds.com'
    ];
    
    // Extract user email from UNA OAuth data securely
    const userEmail = unaData?.user?.email || '';
    const isAdmin = ADMIN_EMAILS.includes(userEmail);

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        Help & Guides
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Learn how to grow your community, maximize your revenue, and optimize your funnels.
                    </p>
                </div>
                
                {/* --- ADMIN ONLY UPLOAD BUTTON --- */}
                {isAdmin && (
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                            <Plus size={14} /> <span className="hidden sm:inline">Add Guide</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <FileText size={48} className="text-gray-600 mb-4 opacity-50" />
                <p className="text-gray-400 font-bold text-sm">Guides Library</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-2">
                    Guides and documentation will appear here once uploaded by an administrator.
                </p>
            </div>
        </div>
    );
}