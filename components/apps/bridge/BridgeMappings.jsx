import React from 'react';
import { Zap, Plus, ArrowRight, CheckCircle2, Trash2, Loader2, Save } from 'lucide-react';

export default function BridgeMappings({
    mappings, providerProducts, unaData, isSaving, saveSuccess,
    addMapping, updateMapping, toggleCommunity, removeMapping, saveMappingsToDatabase
}) {
    return (
        <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 lg:col-start-3">
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                                <Zap className="w-6 h-6 text-[#9df01c]" />
                                Access Rules
                            </h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                Rule: If they buy [Product], grant access to [Communities]
                            </p>
                        </div>
                        <button onClick={addMapping} className="flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 border border-white/10 font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-black/50">
                            <Plus className="w-4 h-4" /> Add Rule
                        </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        {mappings.length === 0 ? (
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                                <Zap className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Rules Created</p>
                                <p className="text-gray-600 text-[10px] mt-2 font-medium">Click "Add Rule" to map a payment product to a community.</p>
                            </div>
                        ) : (
                            mappings.map((mapping) => (
                                <div key={mapping.id} className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex-1 w-full md:mt-1">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block px-1 text-left">
                                            Payment Product
                                        </label>
                                        <select 
                                            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#9df01c]"
                                            value={mapping.provider && mapping.productId ? `${mapping.provider}:::${mapping.productId}` : ""}
                                            onChange={(e) => {
                                                const [prov, prodId] = e.target.value.split(':::');
                                                updateMapping(mapping.id, 'provider', prov);
                                                updateMapping(mapping.id, 'productId', prodId);
                                            }}
                                        >
                                            <option value="" disabled>Select Product or Tier...</option>
                                            {providerProducts.stripe?.length > 0 && (
                                                <optgroup label="Stripe Products">
                                                    {providerProducts.stripe.map(prod => (
                                                        <option key={`stripe_${prod.id}`} value={`stripe:::${prod.id}`}>{prod.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {providerProducts.paypal?.length > 0 && (
                                                <optgroup label="PayPal Plans">
                                                    {providerProducts.paypal.map(prod => (
                                                        <option key={`paypal_${prod.id}`} value={`paypal:::${prod.id}`}>{prod.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {providerProducts.patreon?.length > 0 && (
                                                <optgroup label="Patreon Tiers">
                                                    {providerProducts.patreon.map(prod => (
                                                        <option key={`patreon_${prod.id}`} value={`patreon:::${prod.id}`}>{prod.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {mapping.provider && mapping.productId && 
                                                (!providerProducts[mapping.provider] || !providerProducts[mapping.provider].find(p => String(p.id) === String(mapping.productId))) && (
                                                    <optgroup label="Saved Rule">
                                                        <option value={`${mapping.provider}:::${mapping.productId}`}>{mapping.productId}</option>
                                                    </optgroup>
                                                )
                                            }
                                        </select>
                                    </div>

                                    <div className="md:pt-9 hidden md:block">
                                        <ArrowRight className="w-5 h-5 text-[#9df01c]" />
                                    </div>

                                    <div className="flex-[2] w-full bg-[#111] border border-white/10 rounded-xl p-3">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">Grant Access To (Select Multiple)</label>
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                            {(!unaData?.crowds || unaData.crowds.length === 0) && (!unaData?.spaces || unaData.spaces.length === 0) ? (
                                                <p className="text-xs text-gray-500 italic p-3 text-center border border-dashed border-white/10 rounded-lg">No communities found. Click "Sync Communities" on the left.</p>
                                            ) : (
                                                <>
                                                    {unaData.crowds?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-2 mb-1 px-1 text-left">Crowds</div>}
                                                    {(unaData?.crowds || []).map(c => {
                                                        const combinedId = `bx_spaces_${c.id}`;
                                                        const isChecked = (mapping.communities || []).includes(combinedId);
                                                        return (
                                                            <label key={combinedId} onClick={() => toggleCommunity(mapping.id, combinedId)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-[#9df01c]/10 border-[#9df01c]/50' : 'bg-black border-transparent hover:bg-white/5'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-[#9df01c] border-[#9df01c]' : 'border-gray-500'}`}>
                                                                        {isChecked && <CheckCircle2 size={12} className="text-black" />}
                                                                    </div>
                                                                    <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-white' : 'text-gray-400'}`}>{c.title}</span>
                                                                </div>
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 px-2 py-0.5 rounded">Crowd</span>
                                                            </label>
                                                        );
                                                    })}

                                                    {unaData.spaces?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-3 mb-1 px-1 text-left">Spaces</div>}
                                                    {(unaData?.spaces || []).map(s => {
                                                        const combinedId = `bx_groups_${s.id}`;
                                                        const isChecked = (mapping.communities || []).includes(combinedId);
                                                        return (
                                                            <label key={combinedId} onClick={() => toggleCommunity(mapping.id, combinedId)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-[#38bdf8]/10 border-[#38bdf8]/50' : 'bg-black border-transparent hover:bg-white/5'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-gray-500'}`}>
                                                                        {isChecked && <CheckCircle2 size={12} className="text-black" />}
                                                                    </div>
                                                                    <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-white' : 'text-gray-400'}`}>{s.title}</span>
                                                                </div>
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">Space</span>
                                                            </label>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="md:pt-8 w-full md:w-auto">
                                        <button onClick={() => removeMapping(mapping.id)} className="w-full md:w-auto p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex justify-center">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                        <button 
                            onClick={saveMappingsToDatabase}
                            disabled={isSaving}
                            className={`flex items-center gap-2 font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all ${saveSuccess ? 'bg-green-500 text-black' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saveSuccess ? 'Saved!' : 'Save Rules'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}