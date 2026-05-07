import React from 'react';
import { Repeat, Link2, CreditCard, Users, ArrowRight, Trash2, Loader2 } from 'lucide-react';

export default function BridgeAliases({
    aliases, aliasOriginal, setAliasOriginal, aliasTarget, setAliasTarget, 
    isAliasSaving, handleAddAlias, handleRemoveAlias, audienceStats
}) {
    return (
        <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                        <Repeat size={18} className="text-[#9df01c]" />
                        Create Email Alias
                    </h3>
                    <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6 text-left">
                        Link a subscriber's payment email to their preferred account email on Sellout Crowds.
                    </p>
                    <div className="space-y-5 relative z-10">
                        <div>
                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                Original Payment Email
                            </label>
                            <input 
                                list="subscriber-emails" 
                                value={aliasOriginal}
                                onChange={e => setAliasOriginal(e.target.value)}
                                placeholder="Select or type original email..."
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                            />
                            <datalist id="subscriber-emails">
                                {Array.from(new Set(audienceStats.flatMap(s => s.users.map(u => u.email)))).sort().map(email => (
                                    <option key={email} value={email} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                Alias Email (Sellout Crowds)
                            </label>
                            <input 
                                type="email" 
                                value={aliasTarget} 
                                onChange={(e) => setAliasTarget(e.target.value)} 
                                placeholder="community@example.com" 
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                            />
                        </div>
                        <button 
                            onClick={handleAddAlias}
                            disabled={isAliasSaving || !aliasOriginal || !aliasTarget}
                            className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${!aliasOriginal || !aliasTarget ? 'opacity-50 cursor-not-allowed bg-white/5 text-white' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                            {isAliasSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                            {isAliasSaving ? 'Saving...' : 'Link Emails'}
                        </button>
                        <p className="text-[9px] text-gray-600 mt-3 text-center px-2 font-medium leading-relaxed italic">
                            After saving, click "Change Existing Subscribers" on your Integration tab to instantly apply it.
                        </p>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8">
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                                <Repeat className="w-6 h-6 text-[#9df01c]" />
                                Active Email Aliases
                            </h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                Mapped emails for active subscriptions
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {aliases.length === 0 ? (
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                                <Repeat className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Aliases Set</p>
                                <p className="text-gray-600 text-[10px] mt-2 font-medium">Use the form to link a subscriber's payment email to their account email.</p>
                            </div>
                        ) : (
                            aliases.map((alias) => (
                                <div key={alias.id} className="bg-black border border-white/5 p-5 rounded-[1.5rem] flex items-center justify-between group hover:border-[#9df01c]/30 transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><CreditCard size={10}/> Paying</p>
                                            <p className="font-mono text-sm text-gray-300 truncate">{alias.original_email}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-[#9df01c] mx-2 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10}/> Accessing</p>
                                            <p className="font-mono text-sm text-[#9df01c] truncate">{alias.alias_email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveAlias(alias.id)} className="ml-4 text-gray-600 hover:text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}