import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Contact, Users, CreditCard, Link2, Image as ImageIcon, FileText, ListChecks, Lock, ArrowRight, Loader2, Zap, Globe, CalendarClock, TrendingUp, Youtube, Mail } from 'lucide-react';
import WordPressIcon from '../icons/WordPressIcon';

export default function DashboardApp({ session, unaData, handleAppSwitch, hasAccess }) {
    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [billingEstimate, setBillingEstimate] = useState(null);
    const [isBillingLoading, setIsBillingLoading] = useState(true);

    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const role = Number(unaData?.user?.role) || 1;
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    const isTeammate = role === 18;
    const canAccessPremium = isAdmin || [12, 16, 17].includes(role);
    const hasBillingAccess = isAdmin || [12, 15, 16, 17].includes(role);
    const hasContentAccess = isAdmin || [12, 15, 16, 17].includes(role);

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
        { id: 'business-card', tab: 'builder', name: 'Business Card', icon: Contact, desc: 'Create and manage your digital card.', canAccess: hasAccess ? hasAccess('business-card') : true },
        { id: 'address-book', tab: 'contacts', name: 'Address Book', icon: Users, desc: 'Manage and export your saved contacts.', canAccess: hasAccess ? hasAccess('address-book') : canAccessPremium },
        { id: 'linktree', tab: 'links', name: 'Link in Bio Page', icon: Link2, desc: 'Create a custom landing page for your links.', canAccess: hasAccess ? hasAccess('linktree') : canAccessPremium, shared: true },
        { id: 'community-link', tab: 'setup', name: 'Custom Community URL', icon: Globe, desc: 'Create a custom branded redirect domain for your community.', canAccess: hasAccess ? hasAccess('community-link') : canAccessPremium },
        { id: 'content', tab: 'compose', name: 'Post Scheduler', icon: CalendarClock, desc: 'Draft and schedule automated posts.', canAccess: hasAccess ? hasAccess('content') : hasContentAccess, shared: true },
        { id: 'newsletter', tab: 'campaigns', name: 'Email Newsletters', icon: Mail, desc: 'Draft and send emails to your crowd.', canAccess: hasAccess ? hasAccess('newsletter') : hasContentAccess, shared: true },
        { id: 'youtube', tab: 'manage', name: 'YouTube Sync', icon: Youtube, desc: 'Auto-import YouTube videos to communities.', canAccess: hasAccess ? hasAccess('youtube') : hasContentAccess },
        { id: 'wordpress', tab: 'manage', name: 'WordPress Sync', icon: WordPressIcon, desc: 'Connect WP sites to auto-post articles.', canAccess: hasAccess ? hasAccess('wordpress') : canAccessPremium },
        { id: 'bridge', tab: 'stripe', name: 'Subscription Bridge', icon: CreditCard, desc: 'Manage automated community access.', canAccess: hasAccess ? hasAccess('bridge') && canAccessPremium : canAccessPremium },
        { id: 'affiliate', tab: 'dashboard', name: 'Scouting', icon: TrendingUp, desc: 'Recruit creators and earn revenue.', canAccess: hasAccess ? hasAccess('affiliate') : canAccessPremium, shared: true },
        { id: 'teammates', tab: 'directory', name: 'Teammates', icon: Users, desc: 'Manage dashboard access for your team.', canAccess: hasAccess ? hasAccess('teammates') : (hasBillingAccess || isTeammate), shared: true },
        { id: 'assets', tab: 'cat_1', name: 'SC Brand Assets', icon: ImageIcon, desc: 'Download official brand resources.', canAccess: hasAccess ? hasAccess('assets') : true },
        { id: 'guides', tab: 'library', name: 'Help & Guides', icon: FileText, desc: 'Browse articles to master the platform.', canAccess: true }
    ];

    const onboardingApp = { id: 'onboarding', tab: 'checklist', name: 'Getting Started', icon: ListChecks, desc: 'Complete your setup checklist.', canAccess: true };

    let displayApps = [];
    if (progressPercent < 100 && onboardingSteps.length > 0) {
        displayApps = [onboardingApp, ...apps]; 
    } else {
        displayApps = [...apps, onboardingApp]; 
    }

    // Filter out restricted apps if the user is a Teammate
    if (isTeammate) {
        const hiddenForTeammates = ['community-link', 'youtube', 'wordpress', 'bridge', 'onboarding'];
        displayApps = displayApps.filter(app => !hiddenForTeammates.includes(app.id));
    }

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
                    Welcome back, {unaData?.user?.name || 'Creator'}. Select a tool below to get started.
                </p>
            </div>

            {/* LIVE USAGE ESTIMATE BANNER (Hidden for teammates via hasBillingAccess) */}
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
                            {billingEstimate.isEnterprise ? 'Commissioner Exempt accounts include unlimited add-ons' : 'Billed automatically via your Sellout Crowds invoice'}
                        </p>
                    </div>

                    <div className="flex flex-wrap lg:flex-nowrap items-start sm:items-center gap-6 sm:gap-12 relative z-10 w-full lg:w-auto">
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Teammates</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">{billingEstimate.isEnterprise ? billingEstimate.teamCount : billingEstimate.billableTeamCount}</span>
                                <span className="text-xs font-bold text-gray-400 mb-1.5">@ {billingEstimate.isEnterprise ? '$0.00' : '$2.00'}</span>
                            </div>
                            {billingEstimate.freeSeats === Infinity ? (
                                <p className="text-[9px] text-[#9df01c] font-bold uppercase tracking-widest mt-1">Unlimited Included</p>
                            ) : billingEstimate.freeSeats > 0 ? (
                                <p className="text-[9px] text-[#9df01c] font-bold uppercase tracking-widest mt-1">+{billingEstimate.freeSeats} Free Included</p>
                            ) : null}
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                        <div className="w-full sm:w-auto">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Bridged Users</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">{billingEstimate.bridgedCount}</span>
                                <span className="text-xs font-bold text-gray-400 mb-1.5">@ {billingEstimate.isEnterprise ? '$0.00' : '$0.50'}</span>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                        <div className="w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-white/5">
                            <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-1">Monthly Total</p>
                            <div className="flex items-end gap-1">
                                <span className="text-2xl font-black text-[#9df01c]">${monthlyTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {displayApps.map((app, i) => (
                    <button 
                        key={i} 
                        onClick={() => {
                            if (app.canAccess) {
                                handleAppSwitch(app.id, app.tab);
                            } else {
                                window.open('https://www.selloutcrowds.com/plans', '_blank', 'noopener,noreferrer');
                            }
                        }} 
                        className={`relative text-left p-5 sm:p-6 rounded-[2rem] border transition-all duration-300 flex flex-col h-full group ${
                            app.canAccess 
                                ? 'bg-[#111] border-white/5 hover:border-[#9df01c]/50 hover:bg-[#151515] shadow-lg shadow-black/50' 
                                : 'bg-[#0a0a0a] border-white/5 opacity-60 hover:opacity-100 hover:border-[#9df01c]/30 shadow-none'
                        }`}
                    >
                        <div className="flex items-start gap-4 mb-2 w-full">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shrink-0 ${
                                app.canAccess 
                                    ? 'bg-black border-white/10 text-[#9df01c] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#9df01c]/10' 
                                    : 'bg-black border-white/5 text-gray-600 group-hover:text-[#9df01c]'
                            }`}>
                                <app.icon size={24} />
                            </div>
                            
                            <div className="flex flex-col min-w-0 pt-1">
                                <h3 className={`text-lg sm:text-xl leading-none font-black uppercase tracking-tight transition-colors truncate ${app.canAccess ? 'text-white group-hover:text-[#9df01c]' : 'text-gray-500 group-hover:text-white'}`}>
                                    {app.name}
                                </h3>
                                {isTeammate && app.shared && (
                                    <div className="inline-flex items-center gap-1 text-[#38bdf8] mt-1.5">
                                        <Users size={10} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Shared Workspace</span>
                                    </div>
                                )}
                            </div>
                            
                            {!app.canAccess && <Lock size={16} className="text-gray-600 group-hover:text-[#9df01c] ml-auto shrink-0 transition-colors mt-1" />}
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
                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center text-[10px] font-black uppercase tracking-widest transition-colors">
                                {app.canAccess ? (
                                    <span className="flex items-center gap-1 text-gray-600 group-hover:text-white transition-colors">Open Tool <ArrowRight size={12} /></span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[#9df01c] opacity-50 group-hover:opacity-100 transition-opacity">Upgrade to Access <ArrowRight size={12} /></span>
                                )}
                            </div>
                        ) : null}
                    </button>
                ))}
            </div>
        </div>
    );
}