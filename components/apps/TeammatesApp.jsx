import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Key, Loader2, Mail, Shield, AlertCircle, Briefcase, BadgeCheck, Pencil, Share2, CheckCircle2, X, CheckSquare, Square, Contact } from 'lucide-react';
import HelpDrawer from '../layout/HelpDrawer';

export default function TeammatesApp({ session, unaData, activeTab, setActiveTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = Number(unaData?.user?.role) === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    const role = Number(unaData?.user?.role) || 1;
    const isTeammate = role === 18;

    // Strict tab control: Teammates can ONLY see directory. Bosses trust the activeTab passed from the Sidebar.
    const currentTab = isTeammate ? 'directory' : (activeTab === 'manage' ? 'manage' : 'directory');

    const [teammates, setTeammates] = useState([]);
    const [ownerEmail, setOwnerEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [freeSeats, setFreeSeats] = useState(0);
    
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [inviteCommunities, setInviteCommunities] = useState([]);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState(null);

    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedTeammate, setSelectedTeammate] = useState(null);
    const [selectedCommunities, setSelectedCommunities] = useState([]);
    const [isMapping, setIsMapping] = useState(false);
    const [mapSuccess, setMapSuccess] = useState(false);

    const usedSeats = teammates.length;
    const isNextSeatFree = usedSeats < freeSeats;

    const myEmail = unaData?.user?.email?.toLowerCase() || '';

    const fetchTeammates = async () => {
        try {
            const res = await fetch('/api/team', { headers: { 'Authorization': `Bearer ${session}` } });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.teammates) {
                setTeammates(data.teammates);
            }
            if (data.owner_email) {
                setOwnerEmail(data.owner_email);
            }
        } catch (err) {
            console.error("Failed to load teammates");
        }
    };

    const fetchLimits = async () => {
        if (isAdmin || isTeammate) {
            setFreeSeats(Infinity);
            return;
        }
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_usage_limits', email: unaData?.user?.email })
            });
            const data = await res.json();
            if (data.success && data.limits) {
                const limitEntry = data.limits.find(l => l.feature_name === 'teammates' && Number(l.level_id) === role);
                setFreeSeats(limitEntry ? Number(limitEntry.max_count) : 0);
            }
        } catch (err) {
            console.error("Failed to load usage limits");
        }
    };

    useEffect(() => {
        if (!session) return;
        setIsLoading(true);
        Promise.all([fetchTeammates(), fetchLimits()]).finally(() => setIsLoading(false));
    }, [session]);

    const handleInvite = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            setInviteError("Please enter a valid email address.");
            return;
        }
        setIsInviting(true);
        setInviteError(null);
        try {
            const res = await fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, communities: inviteCommunities })
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.error) {
                setInviteError(data.error);
            } else {
                setNewEmail('');
                setInviteCommunities([]);
                setShowInviteModal(false);
                fetchTeammates();
            }
        } catch (err) {
            setInviteError("Network error. Please try again.");
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevoke = async (email) => {
        const willReduceBill = freeSeats !== Infinity && usedSeats > freeSeats;
        const msg = willReduceBill 
            ? `Are you sure you want to revoke teammate access for ${email}? This will lower your monthly billing by $2.00.`
            : `Are you sure you want to revoke teammate access for ${email}?`;
            
        if (!window.confirm(msg)) return;
        
        try {
            const res = await fetch('/api/team/revoke', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            fetchTeammates();
        } catch (err) {
            alert("Failed to revoke teammate.");
        }
    };

    const openMapModal = (teammate) => {
        setSelectedTeammate(teammate);
        setSelectedCommunities([]);
        setMapSuccess(false);
        setShowMapModal(true);
    };

    const handleSaveMapping = async () => {
        if (selectedCommunities.length === 0) {
            alert("Please select at least one community.");
            return;
        }
        setIsMapping(true);
        try {
            const res = await fetch('/api/team/manual-map', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: selectedTeammate.teammate_email, communities: selectedCommunities })
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.success) {
                setMapSuccess(true);
                setTimeout(() => setShowMapModal(false), 2000);
            } else {
                alert(data.error || data.notice || "Failed to grant access.");
            }
        } catch (err) {
            alert("Server error.");
        } finally {
            setIsMapping(false);
        }
    };

    const toggleInviteCommunity = (id) => {
        setInviteCommunities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const toggleCommunitySelection = (id) => {
        setSelectedCommunities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const renderCommunityChecklist = (selectedArray, toggleFn, setFn) => {
        const allIds = [
            ...(unaData?.crowds || []).map(c => `bx_spaces_${c.id}`),
            ...(unaData?.spaces || []).map(s => `bx_groups_${s.id}`)
        ];
        const isAllSelected = allIds.length > 0 && selectedArray.length === allIds.length;

        const handleToggleAll = () => {
            if (isAllSelected) setFn([]);
            else setFn(allIds);
        };

        return (
            <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Grant Free Access To (Optional)</label>
                    {allIds.length > 0 && (
                        <button onClick={handleToggleAll} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#9df01c] hover:text-white transition-colors">
                            {isAllSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-[#9df01c] font-medium mb-3 flex-shrink-0">
                    Users added to communities here will automatically be granted "Team Member" permissions inside the Crowd/Space.
                </p>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 bg-black border border-white/10 rounded-xl p-3">
                    {(!unaData?.crowds || unaData.crowds.length === 0) && (!unaData?.spaces || unaData.spaces.length === 0) ? (
                        <p className="text-xs text-gray-500 italic p-3 text-center border border-dashed border-white/10 rounded-xl">No communities found. Click "Sync Communities" on the Hub dashboard.</p>
                    ) : (
                        <>
                            {unaData.crowds?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-2 mb-1 px-1 text-left">Crowds</div>}
                            {(unaData?.crowds || []).map(c => {
                                const combinedId = `bx_spaces_${c.id}`;
                                const isSelected = selectedArray.includes(combinedId);
                                return (
                                    <label key={combinedId} onClick={() => toggleFn(combinedId)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#9df01c]/10 border-[#9df01c]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#9df01c] border-[#9df01c]' : 'border-gray-500'}`}>
                                                {isSelected && <CheckCircle2 size={12} className="text-black" />}
                                            </div>
                                            <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-gray-300'}`}>{c.title}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 px-2 py-0.5 rounded">Crowd</span>
                                    </label>
                                );
                            })}

                            {unaData.spaces?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-3 mb-1 px-1 text-left">Spaces</div>}
                            {(unaData?.spaces || []).map(s => {
                                const combinedId = `bx_groups_${s.id}`;
                                const isSelected = selectedArray.includes(combinedId);
                                return (
                                    <label key={combinedId} onClick={() => toggleFn(combinedId)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#38bdf8]/10 border-[#38bdf8]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-gray-500'}`}>
                                                {isSelected && <CheckCircle2 size={12} className="text-black" />}
                                            </div>
                                            <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-gray-300'}`}>{s.title}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">Space</span>
                                    </label>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            {isTeammate && (
                <div className="mb-6 inline-flex items-center gap-2 bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <Users size={14} /> Shared Team Workspace
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        My Team
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        {currentTab === 'directory' ? 'View the active roster for your shared workspace.' : 'Manage your staff, co-hosts, and moderators.'}
                    </p>
                </div>
                {(!isTeammate && currentTab === 'manage') && (
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button onClick={() => { setNewEmail(''); setInviteCommunities([]); setShowInviteModal(true); }} className="px-6 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                            <UserPlus size={14} /> Add Teammate
                        </button>
                    </div>
                )}
            </div>

            {currentTab === 'directory' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl min-h-[50vh] animate-in fade-in duration-300">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                        <Contact size={20} className="text-[#38bdf8]" /> Active Roster
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Boss Card (Highlighted in Blue) */}
                        <div className="bg-black border-2 border-[#38bdf8]/50 rounded-2xl p-5 flex items-center gap-4 hover:border-[#38bdf8] transition-colors shadow-lg shadow-[#38bdf8]/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#38bdf8]/5 rounded-bl-full pointer-events-none"></div>
                            <div className="w-12 h-12 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center flex-shrink-0 border border-[#38bdf8]/20 relative z-10">
                                <Briefcase size={20} />
                            </div>
                            <div className="min-w-0 relative z-10">
                                <p className="text-sm font-bold text-white truncate">
                                    {ownerEmail || 'Account Owner'} {ownerEmail && ownerEmail.toLowerCase() === myEmail ? <span className="text-gray-500 font-normal ml-1">(You)</span> : (!isTeammate ? <span className="text-gray-500 font-normal ml-1">(You)</span> : '')}
                                </p>
                                <p className="text-[10px] text-[#38bdf8] uppercase tracking-widest font-black mt-1">Account Owner</p>
                            </div>
                        </div>

                        {/* Teammate Cards */}
                        {teammates.map(tm => (
                            <div key={tm.id} className="bg-black border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-white/5 text-gray-400 flex items-center justify-center flex-shrink-0 border border-white/10">
                                    <Shield size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {tm.teammate_email} {tm.teammate_email.toLowerCase() === myEmail ? <span className="text-gray-500 font-normal ml-1">(You)</span> : ''}
                                    </p>
                                    <p className="text-[10px] text-[#9df01c] uppercase tracking-widest font-black mt-1">Teammate</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {teammates.length === 0 && (
                        <div className="mt-8 text-center border-2 border-dashed border-white/5 rounded-2xl p-12 text-gray-500">
                            <Users size={32} className="mx-auto mb-3 opacity-20"/>
                            <p className="text-sm font-medium">It's just the boss for now!</p>
                            {!isTeammate && <p className="text-[10px] mt-2">Go to "Manage Team" to add your first teammate.</p>}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                    <div className="lg:col-span-8">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 min-h-[50vh]">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-2 mb-6">
                                <Briefcase size={18} className="text-[#9df01c]"/> Team Access Control
                            </h3>

                            {teammates.length > 0 ? (
                                <div className="space-y-3">
                                    {teammates.map((member) => (
                                        <div key={member.id} className="bg-black p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                    <Shield size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{member.teammate_email}</p>
                                                    <p className="text-[10px] text-[#9df01c] uppercase tracking-widest font-bold mt-1">Authorized Staff</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button onClick={() => openMapModal(member)} className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 border border-white/5">
                                                    <Key size={12}/> Grant Access
                                                </button>
                                                <button onClick={() => handleRevoke(member.teammate_email)} className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 border border-red-500/20">
                                                    <Trash2 size={12}/> Revoke
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-2xl text-gray-500">
                                    <Users size={32} className="mx-auto mb-3 opacity-20"/>
                                    <p className="text-sm font-medium">You haven't added any teammates yet.</p>
                                    <p className="text-[10px] mt-2">Click "Add Teammate" to invite someone to your roster.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 sticky top-24">
                            
                            {/* --- PLAN ALLOWANCE BOX --- */}
                            <div className="mb-8 pb-8 border-b border-white/5">
                                <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-2">Seat Allowance</h3>
                                {freeSeats === Infinity ? (
                                    <>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
                                            Your Administrator account includes <strong>unlimited free teammates</strong>.
                                        </p>
                                        <div className="flex items-center justify-between bg-black p-4 rounded-xl border border-white/5">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seats Used</span>
                                            <span className="text-sm font-black text-[#9df01c]">{usedSeats} / Unlimited</span>
                                        </div>
                                    </>
                                ) : freeSeats > 0 ? (
                                    <>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
                                            Your current plan includes <strong>{freeSeats} free teammates</strong>. Additional seats are $2.00/mo.
                                        </p>
                                        <div className="flex items-center justify-between bg-black p-4 rounded-xl border border-white/5">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seats Used</span>
                                            <span className="text-sm font-black text-[#9df01c]">{usedSeats} / {freeSeats} Free</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
                                            Teammate seats are billed automatically at <strong>$2.00/mo</strong> per user.
                                        </p>
                                        <div className="flex items-center justify-between bg-black p-4 rounded-xl border border-white/5">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seats Used</span>
                                            <span className="text-sm font-black text-[#9df01c]">{usedSeats}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-6">Teammate Benefits</h3>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">
                                When you upgrade a regular user to a Teammate, they unlock premium tools to help manage your brand.
                            </p>
                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9df01c] flex-shrink-0"><BadgeCheck size={18}/></div>
                                    <div><h4 className="text-sm font-bold text-white mb-1">Brand Badge</h4><p className="text-xs text-gray-500">They receive an official staff badge next to their name in your communities.</p></div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9df01c] flex-shrink-0"><Pencil size={18}/></div>
                                    <div><h4 className="text-sm font-bold text-white mb-1">Post Content</h4><p className="text-xs text-gray-500">They can publish posts, moderate comments, and manage content.</p></div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9df01c] flex-shrink-0"><Share2 size={18}/></div>
                                    <div><h4 className="text-sm font-bold text-white mb-1">Digital Business Card</h4><p className="text-xs text-gray-500">They unlock their own shareable, premium digital business card.</p></div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9df01c] flex-shrink-0"><Key size={18}/></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Free Community Access</h4>
                                        <p className="text-xs text-gray-500">You can manually grant them access to your paid spaces at no extra charge. They will automatically be assigned the "Team Member" role inside.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INVITE MODAL */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                        
                        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#9df01c] flex-shrink-0">
                                <UserPlus size={24}/>
                            </div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white m-0">Add Teammate</h3>
                        </div>
                        
                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6 flex-shrink-0">
                            Enter the email address of an existing Sellout Crowds user to instantly upgrade their account to Teammate status.
                        </p>
                        
                        <div className="bg-[#9df01c]/10 border border-[#9df01c]/20 p-4 rounded-xl flex gap-3 items-start mb-6 flex-shrink-0">
                            <AlertCircle size={16} className="text-[#9df01c] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] text-[#9df01c] font-bold uppercase tracking-widest mb-1">Billing Notice</p>
                                {freeSeats === Infinity ? (
                                    <p className="text-xs text-gray-300">
                                        Your Administrator account includes <strong>unlimited free teammates</strong>. This teammate will be added for free.
                                    </p>
                                ) : freeSeats > 0 ? (
                                    <p className="text-xs text-gray-300">
                                        Your plan includes <strong>{freeSeats} free teammates</strong>. You are using {usedSeats}. 
                                        {isNextSeatFree ? ' This teammate will be added for free.' : ' Adding this teammate will add a recurring $2.00/month charge.'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-300">Adding a teammate will add a recurring <strong>$2.00/month</strong> charge to your Sellout Crowds invoice.</p>
                                )}
                            </div>
                        </div>

                        {inviteError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold mb-4 flex-shrink-0">{inviteError}</div>
                        )}

                        <div className="mb-4 flex-shrink-0">
                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">User's Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="colleague@example.com" className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            {renderCommunityChecklist(inviteCommunities, toggleInviteCommunity, setInviteCommunities)}
                        </div>

                        <div className="pt-4 flex-shrink-0">
                            <button onClick={handleInvite} disabled={isInviting} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                {isInviting ? <Loader2 size={16} className="animate-spin" /> : (isNextSeatFree ? 'Add Teammate (Free)' : 'Confirm & Charge $2.00')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL MAP MODAL */}
            {showMapModal && selectedTeammate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <button onClick={() => setShowMapModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                        
                        {mapSuccess ? (
                            <div className="text-center py-8">
                                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-white">Access Granted!</h3>
                                <p className="text-xs font-medium text-gray-400">Your teammate has been securely added to the selected communities as a Team Member.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#9df01c] flex-shrink-0">
                                        <Key size={24}/>
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white m-0">Grant Free Access</h3>
                                </div>
                                
                                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6 flex-shrink-0">
                                    Select the paid communities you want to grant <strong>{selectedTeammate.teammate_email}</strong> access to. Because they are on your payroll, they bypass the metered $0.50/user bridging fee and will automatically be assigned the "Team Member" role inside!
                                </p>
                                
                                <div className="flex-1 min-h-0 flex flex-col mb-4">
                                    {renderCommunityChecklist(selectedCommunities, toggleCommunitySelection, setSelectedCommunities)}
                                </div>
                                
                                <button onClick={handleSaveMapping} disabled={isMapping} className="w-full py-4 flex-shrink-0 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                    {isMapping ? <Loader2 size={16} className="animate-spin" /> : 'Grant Secure Access'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            <HelpDrawer pageName="teammates" session={session} unaData={unaData} />
        </div>
    );
}