import React from 'react';
import { CheckCircle2, LogOut, Loader2, Save, Users, UserCheck, UserX, RefreshCcw, Upload, Link2, Layers, AlertCircle, CreditCard, Zap } from 'lucide-react';

export default function BridgeProviderSetup({
    activeTab, stripeAccountId, paypalClientId, setPaypalClientId, paypalSecretKey, setPaypalSecretKey, paypalAccountId,
    providerProducts, isValidatingKey, keySuccess, isSyncingSubs, syncSubsResult, audienceStats, isStatsLoading, modalData, setModalData,
    patreonUsers, paypalUsers, error, isLoadingOAuth, startStripeOAuth, handleDisconnectStripe, handleSavePaypalKeys, handleDisconnectPaypal,
    handlePatreonUpload, handlePaypalUpload, syncExistingSubscribers, runPatreonImport, runPaypalImport, toggleUserAccess, copyWebhook, webhookCopied,
    processingUser, totalStripeBridged, stripeEstimatedCost, totalPaypalBridged, paypalEstimatedCost, stripeIcon, paypalIcon, patreonIcon
}) {
    return (
        <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
                
                {/* Provider Setup / CSV Upload */}
                {activeTab === 'patreon' ? (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                            <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                            Upload CSV
                        </h3>
                        <div className="space-y-5 relative z-10">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1">
                                    Patreon Audience CSV
                                </label>
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handlePatreonUpload}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#9df01c] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-[#9df01c]/10 file:text-[#9df01c] hover:file:bg-[#9df01c]/20 file:transition-colors cursor-pointer" 
                                />
                            </div>
                            
                            {keySuccess && (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Successfully parsed {patreonUsers.length} users
                                </div>
                            )}

                            <div className="text-[10px] text-gray-500 font-medium leading-relaxed text-left">
                                Upload your Patreon "Relationship Manager" CSV. We will extract your unique Tiers so you can build access rules!
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                            <img src={activeTab === 'stripe' ? stripeIcon : paypalIcon} alt={activeTab} className="w-5 h-5 object-contain" />
                            Provider Setup
                        </h3>
                        <div className="space-y-5 relative z-10">
                            {activeTab === 'stripe' ? (
                                stripeAccountId ? (
                                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-center">
                                        <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
                                        <p className="text-sm font-bold text-white mb-1">Stripe Connected!</p>
                                        <p className="text-xs text-gray-500 mb-4 break-all">ID: {stripeAccountId}</p>
                                        <button onClick={handleDisconnectStripe} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 w-full bg-red-500/10 py-2.5 rounded-lg">
                                            <LogOut size={12} /> Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6 text-left">
                                            Connect your Stripe account to automatically map your active products to Sellout Crowds communities.
                                        </p>
                                        <button 
                                            onClick={startStripeOAuth}
                                            className="w-full font-black py-4 rounded-xl uppercase text-[11px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 bg-[#635BFF] hover:bg-[#7A73FF] text-white shadow-lg shadow-[#635BFF]/20">
                                            Connect with Stripe
                                        </button>
                                    </div>
                                )
                            ) : (
                                paypalAccountId ? (
                                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-center">
                                        <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
                                        <p className="text-sm font-bold text-white mb-1">PayPal API Connected!</p>
                                        <p className="text-[10px] text-gray-500 mb-4 truncate" title={paypalAccountId}>{paypalAccountId}</p>
                                        <button onClick={handleDisconnectPaypal} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 w-full bg-red-500/10 py-2.5 rounded-lg">
                                            <LogOut size={12} /> Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                                PayPal Client ID
                                            </label>
                                            <input 
                                                type="text" 
                                                value={paypalClientId} 
                                                onChange={(e) => setPaypalClientId(e.target.value)} 
                                                placeholder="Enter Client ID..." 
                                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-[#9df01c] transition-colors text-white" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                                PayPal Secret Key
                                            </label>
                                            <input 
                                                type="password" 
                                                value={paypalSecretKey} 
                                                onChange={(e) => setPaypalSecretKey(e.target.value)} 
                                                placeholder="Enter Secret Key..." 
                                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-[#9df01c] transition-colors text-white" 
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSavePaypalKeys}
                                            disabled={isValidatingKey || (!paypalClientId || !paypalSecretKey)}
                                            className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${keySuccess ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                                            {isValidatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : (keySuccess ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />)}
                                            {keySuccess ? 'Connected' : 'Save & Sync Products'}
                                        </button>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* Sync Subscribers Box */}
                {['stripe', 'paypal', 'patreon'].includes(activeTab) && (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden text-left mt-6">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-2 relative z-10 flex items-center gap-2 text-white">
                            {activeTab === 'patreon' ? (
                                <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                            ) : activeTab === 'paypal' ? (
                                <img src={paypalIcon} alt="PayPal" className="w-5 h-5 object-contain" />
                            ) : (
                                <img src={stripeIcon} alt="Stripe" className="w-5 h-5 object-contain" />
                            )}
                            {['patreon', 'paypal'].includes(activeTab) ? 'Import CSV Data' : 'Sync Subscribers'}
                        </h3>
                        <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6 text-left">
                            {activeTab === 'patreon' 
                            ? 'Process your uploaded Patreon CSV to automatically grant access to new patrons and revoke access for canceled ones.'
                            : activeTab === 'paypal'
                            ? 'Upload your active PayPal subscriptions CSV to bridge historic users. The Webhook will handle new signups!'
                            : 'Import your existing Stripe subscribers and automatically grant them access to your community.'}
                        </p>
                        
                        {['patreon', 'paypal'].includes(activeTab) && (
                            <div className="mb-6">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                    {activeTab === 'patreon' ? 'Patreon Audience CSV' : 'PayPal Subscriptions CSV'}
                                </label>
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={activeTab === 'patreon' ? handlePatreonUpload : handlePaypalUpload}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#9df01c] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-[#9df01c]/10 file:text-[#9df01c] hover:file:bg-[#9df01c]/20 file:transition-colors cursor-pointer" 
                                />
                            </div>
                        )}

                        {activeTab === 'stripe' && (
                            <button 
                                onClick={syncExistingSubscribers}
                                disabled={isSyncingSubs || !stripeAccountId}
                                className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 
                                ${syncSubsResult?.success ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-[#9df01c] hover:text-black text-white'}
                                ${(!stripeAccountId) ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-white' : ''}`}>
                                {isSyncingSubs ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncSubsResult?.success ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />)}
                                {syncSubsResult?.success ? syncSubsResult.text : 'Change Existing Subscribers'}
                            </button>
                        )}

                        {['patreon', 'paypal'].includes(activeTab) && (
                            <button 
                                onClick={activeTab === 'patreon' ? runPatreonImport : runPaypalImport}
                                disabled={isSyncingSubs || (activeTab === 'patreon' && patreonUsers.length === 0) || (activeTab === 'paypal' && paypalUsers.length === 0)}
                                className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 
                                ${syncSubsResult?.success ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-[#9df01c] hover:text-black text-white'}
                                ${((activeTab === 'patreon' && patreonUsers.length === 0) || (activeTab === 'paypal' && paypalUsers.length === 0)) ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-white' : ''}`}>
                                {isSyncingSubs ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncSubsResult?.success ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />)}
                                {syncSubsResult?.success ? syncSubsResult.text : 'Run Smart Import'}
                            </button>
                        )}
                    </div>
                )}

                {/* PayPal Webhook */}
                {activeTab === 'paypal' && (
                    <div className="bg-[#111] rounded-[2rem] border border-[#9df01c]/20 p-8 shadow-2xl shadow-[#9df01c]/5 mt-6 text-left">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-white relative z-10 flex items-center gap-2">
                            <img src={paypalIcon} alt="PayPal" className="w-5 h-5 object-contain" />
                            Bridge Webhook URL
                        </h3>
                        <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6">
                            Paste this URL into your PayPal Webhooks settings so we know when someone pays.
                        </p>
                        
                        <div 
                            onClick={copyWebhook} 
                            className="bg-black border border-[#9df01c]/30 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-[#9df01c] transition-colors"
                        >
                            <span className="text-xs font-mono text-gray-300 truncate mr-4">
                                https://bridge.selloutcrowds.com/api/paypal-webhook
                            </span>
                            {webhookCopied ? (
                                <span className="text-[#9df01c] text-[10px] font-black uppercase tracking-widest shrink-0">Copied!</span>
                            ) : (
                                <Link2 className="w-4 h-4 text-[#9df01c] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                        </div>
                    </div>
                )}

                {/* Estimated Billing */}
                {['stripe', 'paypal'].includes(activeTab) && (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 mt-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-[#9df01c] pointer-events-none">
                            <CreditCard size={64} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tighter mb-4 text-white flex items-center gap-2 relative z-10">
                            <Zap size={16} className="text-[#9df01c]"/> Estimated Billing
                        </h3>
                        
                        <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active {activeTab === 'stripe' ? 'Stripe' : 'PayPal'} Subscribers</span>
                                <span className="text-xs font-black text-white">{activeTab === 'stripe' ? totalStripeBridged : totalPaypalBridged}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cost Per Active User</span>
                                <span className="text-xs font-black text-gray-400">$0.50 / mo</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-xs text-white font-black uppercase tracking-widest">Est. Monthly Total</span>
                                <span className="text-lg font-black text-[#9df01c]">${activeTab === 'stripe' ? stripeEstimatedCost : paypalEstimatedCost}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-8">
                {/* Active Subscribers Panel (Stripe) */}
                {activeTab === 'stripe' && (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden text-left h-full flex flex-col">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white mb-6">
                            <Users className="w-6 h-6 text-[#9df01c]" />
                            Active Subscribers
                        </h3>
                        
                        {audienceStats.filter(stat => stat.isMapped).length > 0 ? (
                            <>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-3 flex items-center justify-between px-1">
                                    <span>Bridged Products</span>
                                    {isStatsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                </p>
                                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    {audienceStats.filter(stat => stat.isMapped).map(stat => (
                                        <div 
                                            key={stat.productId} 
                                            onClick={() => setModalData(stat)}
                                            className="bg-black border border-white/5 hover:border-[#9df01c]/50 rounded-xl p-4 flex justify-between items-center cursor-pointer transition-colors group shadow-lg"
                                        >
                                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{stat.productName}</span>
                                            <div className="flex flex-col items-end">
                                                <span className="bg-[#9df01c]/10 text-[#9df01c] px-3 py-1.5 rounded-lg text-[10px] font-black">{stat.bridgedCount} Active on SC</span>
                                                <span className="text-[9px] text-gray-500 font-medium mt-2">{stat.totalCount} Total Stripe Subs</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-600 mt-4 text-center italic border-t border-white/5 pt-4">Click a product to view and manage individual subscribers</p>
                            </>
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col justify-center items-center">
                                <CreditCard className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Active Bridged Subscriptions</p>
                                <p className="text-gray-600 text-[10px] mt-2 font-medium max-w-[250px] mx-auto">Click "Change Existing Subscribers" on the left, or create a Rule in the Bridges tab.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Empty State for Patreon/PayPal */}
                {['patreon', 'paypal'].includes(activeTab) && (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center h-full">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Layers className="text-gray-600 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Automated Billing Sync</h3>
                        <p className="text-xs text-gray-500 font-medium max-w-sm leading-relaxed mb-8">
                            To grant users access, upload your CSV file on the left. Then head over to the <strong>Bridges</strong> tab to dictate which communities they unlock!
                        </p>
                        <button onClick={() => {
                            const event = new URL(window.location);
                            event.searchParams.set('tab', 'mappings');
                            window.history.pushState({}, '', event);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                            window.location.reload();
                        }} className="text-[10px] font-black uppercase tracking-widest text-[#9df01c] hover:underline">
                            Go to Bridges &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* AUDIENCE MODAL */}
            {modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">{modalData.productName}</h3>
                                <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mt-1">
                                    {modalData.bridgedCount} Active on SC / {modalData.totalCount} Total Subs
                                </p>
                            </div>
                            <button onClick={() => setModalData(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {(!modalData.users || modalData.users.length === 0) ? (
                                <p className="text-gray-500 text-center text-sm py-8">No active subscribers found for this product.</p>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="hidden sm:flex justify-between items-center px-4 pb-3 mb-3 border-b border-white/10 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                        <div className="flex-1">User</div>
                                        <div className="w-32 text-center">SC Status</div>
                                        <div className="w-24 text-right">Revoke Access</div>
                                    </div>
                                    <div className="space-y-3">
                                        {modalData.users.map((user, i) => (
                                            <div key={i} className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors ${user.isRevoked ? 'bg-red-500/5 border-red-500/20' : 'bg-black border-white/5 hover:border-white/10'}`}>
                                                <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                                        <span className="truncate">{user.name}</span>
                                                        {user.isRevoked && <UserX className="w-4 h-4 text-red-500 shrink-0" />}
                                                        {user.isBridged && <UserCheck className="w-4 h-4 text-[#9df01c] shrink-0" />}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{user.displayEmail || user.email}</p>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                    <div className="w-full sm:w-32 flex justify-center">
                                                        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg text-center w-full ${user.isBridged ? 'bg-[#9df01c]/10 text-[#9df01c] border border-[#9df01c]/20' : user.isRevoked ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                                            {user.status}
                                                        </span>
                                                    </div>
                                                    <div className="w-auto sm:w-24 flex justify-end">
                                                        {user.isRevoked ? (
                                                            <button 
                                                                onClick={() => toggleUserAccess(user.email, modalData.productId, 'restore')}
                                                                disabled={processingUser === user.email}
                                                                className="p-1.5 bg-white/5 hover:bg-[#9df01c] hover:text-black text-gray-400 rounded-lg transition-colors group relative"
                                                                title="Restore Access">
                                                                {processingUser === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => toggleUserAccess(user.email, modalData.productId, 'revoke')}
                                                                disabled={processingUser === user.email}
                                                                className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 rounded-lg transition-colors group relative"
                                                                title="Revoke Access (Survives Sync)">
                                                                {processingUser === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}