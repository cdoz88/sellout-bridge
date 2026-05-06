import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Contact, Users, CreditCard, Link2, Image as ImageIcon, FileText, ListChecks, Lock, ArrowRight, Loader2, Zap } from 'lucide-react';

export default function DashboardApp({ session, unaData, handleAppSwitch }) {
    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [billingEstimate, setBillingEstimate] = useState(null);
    const [isBillingLoading, setIsBillingLoading] = useState(true);

    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const role = Number(unaData?.user?.role) || 1;
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    // Bridge unlocked for Admin, All-Star(16), HOF(17)
    const canAccessBridge = isAdmin || [16, 17].includes(role);
    const hasBillingAccess = isAdmin || [15, 16, 17].includes(role);

    useEffect(() => {
        if (!session) return;
        fetch(`/api/onboarding/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }, cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.steps) setOnboardingSteps(data.steps);
                if (data.completedStepIds) setCompletedSteps(data.completedStepIds);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session]);

    // Fetch the live estimated billing
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
    
    const apps = [
        { id: 'business-card', tab: 'builder', name: 'Business Card', icon: Contact, desc: 'Create and manage your digital card.', canAccess: true },
        { id: 'address-book', tab: 'contacts', name: 'Address Book', icon: Users, desc: 'Manage and export your saved contacts.', canAccess: isAdmin || [16, 17].includes(role) },
        { id: 'linktree', tab: 'links', name: 'Link in Bio Page', icon: Link2, desc: 'Create a custom landing page for your links.', canAccess: isAdmin || [16, 17].includes(role) },
        { id: 'bridge', tab: 'stripe', name: 'Subscription Bridge', icon: CreditCard, desc: 'Manage automated community access.', canAccess: canAccessBridge },
        { id: 'teammates', tab: 'manage', name: 'Teammates', icon: Users, desc: 'Manage dashboard access for your team.', canAccess: hasBillingAccess },
        { id: 'assets', tab: 'cat_1', name: 'SC Brand Assets', icon: ImageIcon, desc: 'Download official brand resources.', canAccess: true },
        { id: 'guides', tab: 'library', name: 'Help & Guides', icon: FileText, desc: 'Browse articles to master the platform.', canAccess: true }
    ];

    const onboardingApp = { id: 'onboarding', tab: 'checklist', name: 'Getting Started', icon: ListChecks, desc: 'Complete your setup checklist.', canAccess: true };

    let displayApps = [];
    if (progressPercent < 100 && onboardingSteps.length > 0) {
        displayApps = [onboardingApp, ...apps]; 
    } else {
        displayApps = [...apps, onboardingApp]; 
    }

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    return (
        <div className="max-w-7xl mx-auto pt-16 pb-12 lg:py-12 px-4 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-10">
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white flex items-center gap-3">
                    <LayoutDashboard className="text-[#9df01c]" size={36} />
                    Creator Hub
                </h2>
                <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    Welcome back, {unaData?.user?.name || 'Creator'}. Select a tool below to get started.
                </p>
            </div>

            {/* --- LIVE USAGE ESTIMATE BANNER --- */}
            {hasBillingAccess && !isBillingLoading && billingEstimate && (
                <div className="mb-10 bg-[#111] border border-white/5 rounded-[2rem] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden group hover:border-[#9df01c]/30 transition-colors cursor-default">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-[#9df01c] pointer-events-none transition-transform group-hover:scale-110">
                        <CreditCard size={120} className="-mt-4 -mr-4" />
                    </div>
                    
                    <div className="relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-2 mb-1">
                            <Zap size={18} className="text-[#9df01c]"/> Est. Add-On Usage
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Billed automatically via your Sellout Crowds invoice
                        </p>
                    </div>

                    <div className="flex flex-wrap lg:flex-nowrap items-start sm:items-center gap-6 sm:gap-12 relative z-10 w-full lg:w-auto">
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Teammates</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">{billingEstimate.billableTeamCount}</span>
                                <span className="text-xs font-bold text-gray-400 mb-1.5">@ $2.00</span>
                            </div>
                            {billingEstimate.freeSeats > 0 && (
                                <p className="text-[9px] text-[#9df01c] font-bold uppercase tracking-widest mt-1">+{billingEstimate.freeSeats} Free Included</p>
                            )}
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Bridged Users</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">{billingEstimate.bridgedCount}</span>
                                <span className="text-xs font-bold text-gray-400 mb-1.5">@ $0.50</span>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                        <div className="w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-white/5">
                            <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-1">Monthly Total</p>
                            <div className="flex items-end gap-1">
                                <span className="text-2xl font-black text-[#9df01c]">${((billingEstimate.billableTeamCount * 2) + (billingEstimate.bridgedCount * 0.50)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {displayApps.map((app, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleAppSwitch(app.id, app.tab)} 
                        className={`relative text-left p-5 sm:p-6 rounded-[2rem] border transition-all duration-300 flex flex-col h-full group ${
                            app.canAccess 
                                ? 'bg-[#111] border-white/5 hover:border-[#9df01c]/50 hover:bg-[#151515] shadow-lg shadow-black/50' 
                                : 'bg-[#0a0a0a] border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-center gap-4 mb-2 w-full">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shrink-0 ${
                                app.canAccess 
                                    ? 'bg-black border-white/10 text-[#9df01c] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#9df01c]/10' 
                                    : 'bg-black border-white/5 text-gray-500'
                            }`}>
                                <app.icon size={24} />
                            </div>
                            
                            <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight transition-colors ${app.canAccess ? 'text-white group-hover:text-[#9df01c]' : 'text-gray-400'}`}>
                                {app.name}
                            </h3>
                            
                            {!app.canAccess && <Lock size={16} className="text-gray-500 ml-auto shrink-0" />}
                        </div>
                        
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-5 mt-1">
                            {app.desc}
                        </p>

                        {app.id === 'onboarding' && progressPercent < 100 && onboardingSteps.length > 0 && (
                            <div className="mt-auto pt-4 w-full border-t border-white/5">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Progress</span>
                                    <span className="text-[10px] font-black text-[#9df01c]">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-black border border-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="bg-[#9df01c] h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                        )}

                        {app.id !== 'onboarding' || progressPercent === 100 || onboardingSteps.length === 0 ? (
                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">
                                {app.canAccess ? (
                                    <span className="flex items-center gap-1">Open Tool <ArrowRight size={12} /></span>
                                ) : (
                                    <span className="flex items-center gap-1 text-gray-500">Requires Upgrade</span>
                                )}
                            </div>
                        ) : null}
                    </button>
                ))}
            </div>
        </div>
    );
}