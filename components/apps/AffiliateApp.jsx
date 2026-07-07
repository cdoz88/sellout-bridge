import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Link2, Copy, CheckCircle2, Loader2, Lock, ArrowRight, Lightbulb, Info, CalendarClock } from 'lucide-react';

export default function AffiliateApp({ session, unaData, handleAppSwitch }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());
    
    // Unlock for Premium accounts (Admin, Commissioner Exempt, All-Star, H.O.F.)
    const canAccess = isAdmin || [12, 16, 17].includes(Number(unaData?.user?.role));

    const [stats, setStats] = useState({ clicks: 0, joins: 0, commission: 0 });
    const [referrals, setReferrals] = useState([]);
    const [refLink, setRefLink] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!session || !canAccess) {
            setIsLoading(false);
            return;
        }

        fetch('/api/affiliates/stats', {
            headers: { 'Authorization': `Bearer ${session}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setStats(data.stats);
                setRefLink(data.link || '');
                setReferrals(data.referrals || []);
            }
        })
        .catch(err => console.error("Failed to fetch scouting stats"))
        .finally(() => setIsLoading(false));
    }, [session, canAccess]);

    const handleCopy = () => {
        if (!refLink) return;
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getNextCreditDate = () => {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    if (!canAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
                <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                    <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                    <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                        The Scouting program allows you to recruit new creators to the platform and earn recurring revenue. This tool is exclusively available to our premium creators.
                    </p>
                    <a href="https://www.selloutcrowds.com/plans" target="_blank" rel="noopener noreferrer" className="bg-[#9df01c] text-black font-black py-4 px-10 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10">
                        Upgrade to Unlock
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="mb-10">
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                    <TrendingUp className="text-[#9df01c]" size={36} />
                    Scouting Dashboard
                </h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    Scout Creators. Grow Your Network. Earn Recurring Platform Credits.
                </p>
            </div>

            {/* How Payouts Work Banner */}
            <div className="bg-[#9df01c]/10 border border-[#9df01c]/20 rounded-2xl p-5 sm:p-6 mb-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="flex items-start gap-3">
                    <Info size={20} className="text-[#9df01c] flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-white font-bold text-sm mb-1">How do I get paid?</h4>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
                            You earn a recurring <strong className="text-[#9df01c]">10% of the Net Revenue</strong> generated by any creator who signs up using your link. At the end of each month, your earnings are automatically applied as a credit to your Sellout Crowds account to seamlessly cover the cost of your premium features, teammates, and add-ons!
                        </p>
                    </div>
                </div>
            </div>

            {/* Link & Masking Section */}
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-[#9df01c] pointer-events-none">
                    <Link2 size={120} className="-mt-8 -mr-8" />
                </div>
                
                <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-4 relative z-10">Your Scout Link</h3>
                
                <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <div className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3.5 text-xs text-[#9df01c] font-mono truncate overflow-hidden">
                        {refLink || 'Generating your link...'}
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="px-6 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2 shadow-sm flex-shrink-0"
                    >
                        {copied ? <CheckCircle2 size={14} className="text-[#9df01c]"/> : <Copy size={14}/>}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>

                <div className="mt-6 bg-[#9df01c]/10 border border-[#9df01c]/20 rounded-xl p-4 flex gap-4 items-start relative z-10">
                    <Lightbulb size={20} className="text-[#9df01c] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] text-[#9df01c] font-bold uppercase tracking-widest mb-1.5">Pro Tip: Use Your Link In Bio</p>
                        <p className="text-xs text-gray-300 leading-relaxed mb-3">
                            The easiest way to recruit new creators is to add your Scout Link directly to your Link In Bio page with a button that says <strong>"Join My Network"</strong>!
                        </p>
                        <button 
                            onClick={() => handleAppSwitch && handleAppSwitch('linktree', 'links')}
                            className="text-[10px] font-black uppercase tracking-widest text-black bg-[#9df01c] hover:bg-[#8ce015] px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            Edit My Bio Page <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Top KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#9df01c]/10 text-[#9df01c] flex items-center justify-center shrink-0 border border-[#9df01c]/20">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Lifetime Earnings</p>
                        <p className="text-3xl font-black text-white leading-none">${parseFloat(stats.commission || 0).toFixed(2)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9df01c] mt-1.5">10% of Net Revenue</p>
                    </div>
                </div>
                
                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 text-white flex items-center justify-center shrink-0 border border-white/10">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Total Recruits</p>
                        <p className="text-3xl font-black text-white leading-none">{stats.joins || 0}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1.5">Active Network</p>
                    </div>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-xl flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <CalendarClock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Next Credit Date</p>
                        <p className="text-xl font-black text-white leading-none mt-2">{getNextCreditDate()}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mt-2">Automated Payout</p>
                    </div>
                </div>
            </div>

            {/* Downline Table */}
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl min-h-[40vh]">
                <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
                    <Users className="text-[#9df01c]" size={20} /> Your Network
                </h3>
                
                {referrals.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-2xl text-gray-500">
                        <Users size={32} className="mx-auto mb-3 opacity-20"/>
                        <p className="text-sm font-medium">Your network is empty.</p>
                        <p className="text-[10px] mt-1">Creators who sign up using your Scout Link will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Recruit Name</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Email Address</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Join Date</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right pl-4">Credits Generated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((ref, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 text-sm font-bold text-white pr-4">{ref.name}</td>
                                        <td className="py-4 text-xs font-mono text-gray-400">{ref.email}</td>
                                        <td className="py-4 text-xs text-gray-400 text-right">{ref.date}</td>
                                        <td className="py-4 text-sm font-black text-[#9df01c] text-right pl-4">+${ref.revenue}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}