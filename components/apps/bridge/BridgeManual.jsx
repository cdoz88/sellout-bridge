import React from 'react';
import { UserPlus, AlertCircle, Loader2, Plus, Users, UserCheck, UserX, X } from 'lucide-react';

export default function BridgeManual({
    manualUsers, manualEmail, setManualEmail, manualSelectedMappingId, setManualSelectedMappingId,
    isManualSaving, handleAddManualUser, handleRemoveManualUser, mappings, getProductName,
    manualModalData, setManualModalData, unaData
}) {
    return (
        <>
            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                            <UserPlus size={18} className="text-[#9df01c]" />
                            Grant Access
                        </h3>

                        <div className="bg-[#9df01c]/10 border border-[#9df01c]/20 p-4 rounded-xl flex gap-3 items-start mb-6">
                            <AlertCircle size={16} className="text-[#9df01c] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] text-[#9df01c] font-bold uppercase tracking-widest mb-1">Billing Notice</p>
                                <p className="text-xs text-gray-300">Users manually bridged here are billed at <strong>$0.50/month</strong>. To grant free access to your staff, please use the <strong>Teammates</strong> tab instead.</p>
                            </div>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                    Email Address
                                </label>
                                <input 
                                    type="email" 
                                    value={manualEmail} 
                                    onChange={(e) => setManualEmail(e.target.value)} 
                                    placeholder="vip@example.com" 
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                                />
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                    Grant Access Level
                                </label>
                                <select 
                                    value={manualSelectedMappingId} 
                                    onChange={(e) => setManualSelectedMappingId(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#9df01c] outline-none transition-colors"
                                >
                                    <option value="" disabled>Select an existing Access Rule...</option>
                                    {mappings.filter(m => m.productId && m.communities.length > 0).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {getProductName(m.provider, m.productId)} ({m.communities.length} Communities)
                                        </option>
                                    ))}
                                </select>
                                {mappings.filter(m => m.productId && m.communities.length > 0).length === 0 && (
                                    <p className="text-[9px] text-red-500 mt-2 font-medium">You must create at least one rule in the "Bridges" tab first.</p>
                                )}
                            </div>

                            <button 
                                onClick={handleAddManualUser}
                                disabled={isManualSaving || !manualEmail || !manualSelectedMappingId}
                                className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${(!manualEmail || !manualSelectedMappingId) ? 'opacity-50 cursor-not-allowed bg-white/5 text-white' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                                {isManualSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                {isManualSaving ? 'Granting...' : 'Grant Access'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col text-left">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                                    <Users className="w-6 h-6 text-[#9df01c]" />
                                    Active Manual Members
                                </h3>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                    People who have been manually granted access to your communities.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {manualUsers.length === 0 ? (
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                                    <UserPlus className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Manual Users</p>
                                    <p className="text-gray-600 text-[10px] mt-2 font-medium">Use the form to grant access to a partner or VIP.</p>
                                </div>
                            ) : (
                                manualUsers.map((user, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setManualModalData(user)} 
                                        className="bg-black border border-white/5 hover:border-[#9df01c]/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 group cursor-pointer transition-colors"
                                    >
                                        <div className="flex-1 w-full text-center md:text-left">
                                            <p className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <span className="bg-[#9df01c]/10 text-[#9df01c] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#9df01c]/20">
                                                {user.communities?.length || 0} {(user.communities?.length === 1) ? 'Community' : 'Communities'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {manualModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden text-left">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
                            <div>
                                <h3 className="text-xl font-black uppercase text-white">{manualModalData.email}</h3>
                                <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mt-1">Manual Access Granted</p>
                            </div>
                            <button onClick={() => setManualModalData(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                            {manualModalData.communities?.map((comm, i) => {
                                const isCrowd = comm.module === 'bx_spaces';
                                const sourceList = isCrowd ? (unaData.crowds || []) : (unaData.spaces || []);
                                const commData = sourceList.find(c => c.id === comm.contentId.toString() || c.id === parseInt(comm.contentId));
                                const title = commData ? commData.title : `Unknown ID: ${comm.contentId}`;

                                return (
                                    <div key={i} className="border border-white/5 rounded-xl p-4 flex justify-between items-center bg-black hover:border-white/10 transition-colors">
                                        <div className="flex-1 flex flex-col">
                                            <p className="text-sm font-bold text-white flex items-center gap-2 mb-0.5">
                                                <span className="truncate max-w-[200px]">{title}</span>
                                                <UserCheck className="w-4 h-4 text-[#9df01c] shrink-0" />
                                            </p>
                                            <span className={`text-[8px] font-black uppercase tracking-widest w-fit ${isCrowd ? 'text-[#9df01c]' : 'text-[#38bdf8]'}`}>{isCrowd ? 'Crowd' : 'Space'}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                handleRemoveManualUser(comm.id, manualModalData.email, comm.module, comm.contentId);
                                                const updatedComms = manualModalData.communities.filter(c => c.id !== comm.id);
                                                if (updatedComms.length === 0) setManualModalData(null);
                                                else setManualModalData({...manualModalData, communities: updatedComms});
                                            }} 
                                            className="p-2 bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 rounded-lg transition-colors" title="Revoke Access"
                                        >
                                            <UserX className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}