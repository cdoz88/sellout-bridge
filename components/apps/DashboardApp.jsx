import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Contact, Users, CreditCard, Link2, Image as ImageIcon, FileText, ListChecks, Lock, ArrowRight, Loader2, Zap, Globe, CalendarClock, TrendingUp, Youtube, Mail, Calculator, X } from 'lucide-react';
import WordPressIcon from '../icons/WordPressIcon';

export default function DashboardApp({ session, unaData, handleAppSwitch, hasAccess }) {
    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [billingEstimate, setBillingEstimate] = useState(null);
    const [isBillingLoading, setIsBillingLoading] = useState(true);
    const [showBillingModal, setShowBillingModal] = useState(false);

    // New Dashboard Metrics State
    const [dashMetrics, setDashMetrics] = useState({ upcomingPosts: 0, upcomingEmails: 0, teamUsed: 0 });
    const [scoutStats, setScoutStats] = useState({ recruits: 0, credit: 0 });

    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const role = Number(unaData?.user?.role) || 1;
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    const isTeammate = role === 18;
    const canAccessPremium = isAdmin || [12, 16, 17].includes(role);
    const hasBillingAccess = isAdmin || [12, 15, 16, 17].includes(role);
    const hasContentAccess = isAdmin || [12, 15, 16, 17].includes(role);

    useEffect(() => {
        if (!session) return;
        
        // 1. Fetch Onboarding
        fetch(`/api/onboarding/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.steps) setOnboardingSteps(data.steps);
                if (data.completedStepIds) setCompletedSteps(data.completedStepIds);
            })
            .catch(() => {});

        // 2. Fetch Dashboard Engine Metrics
        fetch(`/api/dashboard/metrics`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.metrics) setDashMetrics(data.metrics);
            })
            .catch(() => {});

        // 3. Fetch High-Level Scout Stats
        fetch(`/api/affiliates/stats`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.stats) {
                    setScoutStats({ recruits: data.stats.joins || 0, credit: data.stats.commission || 0 });
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));

    }, [session]);

    useEffect(() => {
        if (!session || !hasBillingAccess) {
            setIsBillingLoading(false);
            return;
        }
        fetch('/api/billing-estimate', { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data && typeof data.teamCount !== 'undefined') {
                    setBillingEstimate(data);
                }
                setIsBillingLoading(false);
            })
            .catch(() => setIsBillingLoading(false));
    }, [session, hasBillingAccess]);

    const progressPercent = onboardingSteps.length > 0 ? Math.round((completedSteps.length / onboardingSteps.length) * 100) : 0;
    
    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    const monthlyTotal = billingEstimate?.isEnterprise ? 0 : ((billingEstimate?.billableTeamCount || 0) * 2) + ((billingEstimate?.bridgedCount || 0) * 0.50);

    return (
        <div className="max-w-7xl mx-auto pt-16 pb-12 lg:py-12 px-4 sm:px-8 animate-in fade-in duration-300">
            
            <div className="mb-10">
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white flex items-center gap-3">
                    <LayoutDashboard className="text-[#9df01c]" size={36} />
                    Front Office
                </h2>
                <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    Welcome back, {unaData?.user?.name || 'Creator'}. Here is your operations snapshot.
                </p>
            </div>

            {/* --- SECTION 1: OPERATIONS & BILLING HUB --- */}
            {hasBillingAccess && !isBillingLoading && billingEstimate && (
                <div className="mb-8">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 pl-2">Operations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Teammates Allowed vs Used */}
                        <div onClick={() => handleAppSwitch('teammates', 'directory')} className="bg-[#111] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xl cursor-pointer hover:border-white/20 transition-colors group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:text-[#9df01c] transition-colors shrink-0">
                                    <Users size={16} />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Teammates Assigned</h4>
                            </div>
                            <div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black text-white leading-none">{dashMetrics.teamUsed}</span>
                                    <span className="text-xs font-bold text-gray-500 mb-1">
                                        / {billingEstimate.freeSeats === Infinity ? 'Unlimited' : billingEstimate.freeSeats} Free
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bridged Users */}
                        <div onClick={() => handleAppSwitch('bridge', 'stripe')} className="bg-[#111] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xl cursor-pointer hover:border-white/20 transition-colors group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:text-[#9df01c] transition-colors shrink-0">
                                    <Link2 size={16} />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Active Bridged Users</h4>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-white leading-none">{billingEstimate.bridgedCount}</span>
                            </div>
                        </div>

                        {/* Upcoming Monthly Invoice */}
                        <div onClick={() => setShowBillingModal(true)} className="bg-[#111] border border-[#eab308]/30 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xl group hover:border-[#eab308] transition-colors cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-[#eab308] pointer-events-none group-hover:scale-110 transition-transform">
                                <Calculator size={80} className="-mt-4 -mr-4" />
                            </div>
                            
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-[#eab308]/10 flex items-center justify-center text-[#eab308] border border-[#eab308]/20 shrink-0">
                                    <CreditCard size={16} />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#eab308]">Upcoming Add-On Charges</h4>
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black text-[#eab308] leading-none">${monthlyTotal.toFixed(2)}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Auto-Billed</span>
                                </div>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-[#eab308]/70 mt-2 flex items-center gap-1">Click to view breakdown <ArrowRight size={8}/></p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* --- SECTION 2: CONTENT QUEUE & SCOUTING --- */}
            <div className="mb-8">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 pl-2">Content Queue & Scouting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div onClick={() => handleAppSwitch('content', 'queue')} className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col justify-between cursor-pointer hover:border-white/20 transition-colors group">
                        <div className="flex items-center gap-3 mb-4">
                            <CalendarClock size={16} className="text-white group-hover:text-[#9df01c] transition-colors" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Post Scheduler</h4>
                        </div>
                        <div>
                            <span className="text-2xl font-black text-white">{dashMetrics.upcomingPosts}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">Pending In Queue</p>
                        </div>
                    </div>

                    <div onClick={() => handleAppSwitch('newsletter', 'campaigns')} className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col justify-between cursor-pointer hover:border-white/20 transition-colors group">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail size={16} className="text-white group-hover:text-[#9df01c] transition-colors" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Newsletters</h4>
                        </div>
                        <div>
                            <span className="text-2xl font-black text-white">{dashMetrics.upcomingEmails}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">Drafts / Scheduled</p>
                        </div>
                    </div>

                    <div onClick={() => handleAppSwitch('affiliate', 'network')} className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col justify-between cursor-pointer hover:border-white/20 transition-colors group">
                        <div className="flex items-center gap-3 mb-4">
                            <Users size={16} className="text-white group-hover:text-[#9df01c] transition-colors" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Scouting Recruits</h4>
                        </div>
                        <div>
                            <span className="text-2xl font-black text-white">{scoutStats.recruits}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">Total Conversions</p>
                        </div>
                    </div>

                    <div onClick={() => handleAppSwitch('affiliate', 'dashboard')} className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col justify-between cursor-pointer hover:border-white/20 transition-colors group">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp size={16} className="text-[#9df01c]" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9df01c]">Pending Revenue</h4>
                        </div>
                        <div>
                            <span className="text-2xl font-black text-white">${parseFloat(scoutStats.credit).toFixed(2)}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">Unpaid Platform Credit</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- SECTION 3: THE TOOLS DIRECTORY --- */}
            <div className="mb-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 pl-2">Tools Directory</h3>
                
                {/* Onboarding Bar */}
                {progressPercent < 100 && onboardingSteps.length > 0 && (
                    <div onClick={() => handleAppSwitch('onboarding', 'checklist')} className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-5 mb-4 flex items-center justify-between cursor-pointer hover:border-[#9df01c]/50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#9df01c]/10 text-[#9df01c] flex items-center justify-center border border-[#9df01c]/20">
                                <ListChecks size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-white group-hover:text-[#9df01c] transition-colors">Setup Checklist</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-32 bg-black border border-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-[#9df01c] h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-500">{progressPercent}% Complete</span>
                                </div>
                            </div>
                        </div>
                        <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                )}

                {/* Vertical App List */}
                <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                    <div className="divide-y divide-white/5">
                        
                        <div onClick={() => handleAppSwitch('business-card', 'builder')} className="flex items-center justify-between p-4 sm:px-6 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <Contact size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Business Card</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Create and manage your digital card.</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                        </div>

                        <div onClick={() => hasAccess('address-book') ? handleAppSwitch('address-book', 'contacts') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('address-book') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                            <div className="flex items-center gap-4">
                                <Users size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Address Book</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Manage and export your saved contacts.</p>
                                </div>
                            </div>
                            {!hasAccess('address-book') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                        </div>

                        <div onClick={() => hasAccess('linktree') ? handleAppSwitch('linktree', 'links') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('linktree') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                            <div className="flex items-center gap-4">
                                <Link2 size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Link in Bio Page</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Create a custom landing page for your links.</p>
                                </div>
                            </div>
                            {!hasAccess('linktree') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                        </div>

                        {!isTeammate && (
                            <div onClick={() => hasAccess('community-link') ? handleAppSwitch('community-link', 'setup') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('community-link') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                                <div className="flex items-center gap-4">
                                    <Globe size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Custom Community URL</h4>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Create a custom branded redirect domain for your community.</p>
                                    </div>
                                </div>
                                {!hasAccess('community-link') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                            </div>
                        )}

                        {!isTeammate && (
                            <div onClick={() => hasAccess('youtube') ? handleAppSwitch('youtube', 'manage') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('youtube') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                                <div className="flex items-center gap-4">
                                    <Youtube size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">YouTube Sync</h4>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Auto-import YouTube videos to communities.</p>
                                    </div>
                                </div>
                                {!hasAccess('youtube') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                            </div>
                        )}
                        
                        {!isTeammate && (
                            <div onClick={() => hasAccess('wordpress') ? handleAppSwitch('wordpress', 'manage') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('wordpress') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                                <div className="flex items-center gap-4">
                                    <WordPressIcon size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">WordPress Sync</h4>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Connect WP sites to auto-post articles.</p>
                                    </div>
                                </div>
                                {!hasAccess('wordpress') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                            </div>
                        )}

                        {!isTeammate && (
                            <div onClick={() => hasAccess('bridge') ? handleAppSwitch('bridge', 'stripe') : null} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${hasAccess('bridge') ? 'hover:bg-white/5 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}>
                                <div className="flex items-center gap-4">
                                    <CreditCard size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Subscription Bridge</h4>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Manage automated community access.</p>
                                    </div>
                                </div>
                                {!hasAccess('bridge') ? <Lock size={14} className="text-gray-600" /> : <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />}
                            </div>
                        )}

                        <div onClick={() => handleAppSwitch('assets', 'cat_1')} className="flex items-center justify-between p-4 sm:px-6 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <ImageIcon size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">SC Brand Assets</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Download official brand resources.</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                        </div>

                        <div onClick={() => handleAppSwitch('guides', 'library')} className="flex items-center justify-between p-4 sm:px-6 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <FileText size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">Help & Guides</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Browse articles to master the platform.</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                        </div>

                    </div>
                </div>
            </div>

            {/* --- POPUP MODAL: BILLING BREAKDOWN --- */}
            {showBillingModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative flex flex-col">
                        <button onClick={() => setShowBillingModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-[#eab308]/10 border border-[#eab308]/20 rounded-xl flex items-center justify-center text-[#eab308] shrink-0">
                                <Calculator size={24}/>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white m-0 leading-none">Billing Breakdown</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Estimated Monthly Add-Ons</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center bg-black border border-white/5 p-4 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-white mb-0.5">Teammate Seats</p>
                                    <p className="text-[9px] text-gray-500 font-mono">{dashMetrics.teamUsed} total ({billingEstimate.freeSeats === Infinity ? 'Unlimited' : billingEstimate.freeSeats} free)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-white">${(billingEstimate.isEnterprise ? 0 : (billingEstimate.billableTeamCount * 2)).toFixed(2)}</p>
                                    <p className="text-[9px] text-gray-500 font-mono">{billingEstimate.isEnterprise ? '0' : billingEstimate.billableTeamCount} @ $2.00</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-black border border-white/5 p-4 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-white mb-0.5">Bridged Users</p>
                                    <p className="text-[9px] text-gray-500 font-mono">Synced community members</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-white">${(billingEstimate.isEnterprise ? 0 : (billingEstimate.bridgedCount * 0.5)).toFixed(2)}</p>
                                    <p className="text-[9px] text-gray-500 font-mono">{billingEstimate.isEnterprise ? '0' : billingEstimate.bridgedCount} @ $0.50</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Estimated Total</p>
                                <p className="text-xs text-gray-400">Auto-billed via Stripe</p>
                            </div>
                            <span className="text-3xl font-black text-[#eab308] leading-none">${monthlyTotal.toFixed(2)}</span>
                        </div>
                        
                        <button onClick={() => setShowBillingModal(false)} className="w-full mt-8 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-white/10 text-white hover:bg-white/20 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}