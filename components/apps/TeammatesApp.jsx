import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Loader2, Trash2, AlertCircle } from 'lucide-react';

export default function TeammatesApp({ session, unaData }) {
    const [teamLimit, setTeamLimit] = useState(0);
    const [teamUsed, setTeamUsed] = useState(0);
    const [teammates, setTeammates] = useState([]);
    const [teamEmail, setTeamEmail] = useState('');
    const [isTeamSaving, setIsTeamSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (session) {
            fetchTeamData();
        }
    }, [session]);

    const fetchTeamData = async () => {
        try {
            const res = await fetch('/api/team', { headers: { 'Authorization': `Bearer ${session}` } });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data) {
                setTeamLimit(data.limit);
                setTeamUsed(data.used);
                setTeammates(data.teammates || []);
            }
        } catch (err) {
            setError("Failed to load team data.");
        }
    };

    const handleInviteTeammate = async () => {
        if (!teamEmail) {
            setError("Please enter an email address.");
            return;
        }
        setIsTeamSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: teamEmail })
            });

            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }

            const textRaw = await res.text();
            let data = {};
            try { data = textRaw ? JSON.parse(textRaw) : {}; } catch(e) {}

            if (res.ok && data.success) {
                setTeamEmail('');
                fetchTeamData();
            } else {
                throw new Error(data.error || `Server Error: ${textRaw.substring(0, 100)}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsTeamSaving(false);
        }
    };

    const handleRevokeTeammate = async (email) => {
        if (!window.confirm(`Are you sure you want to revoke teammate access for ${email}?`)) return;
        try {
            const res = await fetch('/api/team/revoke', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            fetchTeamData();
        } catch (err) {
            console.error("Failed to revoke teammate.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-8 text-left">
            {error && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{error}</p>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                            <Users size={18} className="text-[#9df01c]" />
                            My Team
                        </h3>

                        <div className="mb-6 p-4 bg-black border border-white/5 rounded-2xl text-center">
                            <div className="text-3xl font-black text-white">
                                <span className="text-[#9df01c]">{teamUsed}</span> <span className="text-gray-600">/</span> {teamLimit === 999 ? '∞' : teamLimit}
                            </div>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Seats Used</p>
                        </div>

                        <div className="space-y-5 relative z-10">
                            {teamLimit === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">
                                        Your current account tier does not include teammate seats.
                                    </p>
                                    <a 
                                        href="https://www.selloutcrowds.com/plans" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20"
                                    >
                                        Upgrade to unlock this feature!
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                            Invite Teammate
                                        </label>
                                        <input
                                            type="email"
                                            value={teamEmail}
                                            onChange={(e) => setTeamEmail(e.target.value)}
                                            placeholder="assistant@example.com"
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleInviteTeammate}
                                        disabled={isTeamSaving || !teamEmail || (teamLimit > 0 && teamUsed >= teamLimit)}
                                        className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${(!teamEmail || (teamLimit > 0 && teamUsed >= teamLimit)) ? 'opacity-50 cursor-not-allowed bg-white/5 text-white' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                                        {isTeamSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                        {isTeamSaving ? 'Inviting...' : 'Assign Seat'}
                                    </button>
                                    {teamLimit > 0 && teamUsed >= teamLimit && (
                                        <p className="text-[9px] text-red-500 mt-3 text-center px-2 font-bold leading-relaxed italic">
                                            You have reached your seat limit. Remove a teammate or upgrade your account to add more!
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col text-left">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                                    <Users className="w-6 h-6 text-[#9df01c]" />
                                    Active Teammates
                                </h3>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                    Manage dashboard access for your assistants and partners.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {teammates.length === 0 ? (
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col justify-center mt-8">
                                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Teammates Yet</p>
                                    <p className="text-gray-600 text-[10px] mt-2 font-medium">Use the form to the left to grant platform access to a teammate.</p>
                                </div>
                            ) : (
                                teammates.map((mate) => (
                                    <div key={mate.id} className="bg-black border border-white/5 hover:border-white/10 transition-colors rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 group">
                                        <div className="flex-1 w-full text-center md:text-left">
                                            <p className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                                <span>{mate.teammate_email}</span>
                                                <span className="text-[8px] bg-[#9df01c]/10 text-[#9df01c] border border-[#9df01c]/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-black">Active</span>
                                            </p>
                                            <p className="text-[9px] text-gray-600 font-medium mt-1">Added {new Date(mate.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeTeammate(mate.teammate_email)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest w-full md:w-auto justify-center"
                                            title="Revoke Teammate Access"
                                        >
                                            <Trash2 size={16} /> <span className="md:hidden">Revoke Access</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}