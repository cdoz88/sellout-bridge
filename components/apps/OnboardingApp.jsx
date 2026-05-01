import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, Circle, ChevronUp, ChevronDown, ListChecks, ArrowRight, Save, Lock, X } from 'lucide-react';

const AVAILABLE_ROLES = [
    { id: 18, name: 'Teammate' },
    { id: 15, name: 'Rookie' },
    { id: 16, name: 'All-Star' },
    { id: 17, name: 'H.O.F.' }
];

export default function OnboardingApp({ session, unaData }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    const [steps, setSteps] = useState([]);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // --- NEW: State to control the video modal ---
    const [showVideoModal, setShowVideoModal] = useState(false);

    const fetchOnboardingData = async () => {
        try {
            const res = await fetch(`/api/onboarding/data?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${session}` }});
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.steps) {
                const parsedSteps = data.steps.map(s => {
                    let roles = [];
                    if (s.allowed_roles) {
                        try { roles = JSON.parse(s.allowed_roles); } catch(e) {}
                    }
                    return { ...s, allowed_roles: roles };
                });
                setSteps(parsedSteps);
            }
            if (data.completedStepIds) setCompletedSteps(data.completedStepIds);
            setIsLoading(false);
        } catch (e) { setIsLoading(false); }
    };

    useEffect(() => {
        if (session) fetchOnboardingData();
    }, [session]);

    const toggleProgress = async (stepId) => {
        if (isAdmin && isEditing) return;

        const isCompleted = completedSteps.includes(stepId);
        const newStatus = !isCompleted;
        
        if (newStatus) setCompletedSteps([...completedSteps, stepId]);
        else setCompletedSteps(completedSteps.filter(id => id !== stepId));

        try {
            await fetch('/api/onboarding/progress', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_id: stepId, completed: newStatus })
            });
            window.dispatchEvent(new CustomEvent('onboarding-updated'));
        } catch(e) {}
    };

    const handleSaveSteps = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/onboarding/steps/bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps })
            });
            if (!res.ok) throw new Error("Server rejected save");
            await fetchOnboardingData();
            window.dispatchEvent(new CustomEvent('onboarding-updated'));
            setIsEditing(false);
        } catch (e) {
            alert("Failed to save steps.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStep = async (id) => {
        if (id.toString().startsWith('temp_')) {
            setSteps(steps.filter(s => s.id !== id));
            return;
        }
        if(!window.confirm("Delete this step completely? It will be removed from all users' checklists.")) return;
        await fetch('/api/onboarding/steps/delete', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        await fetchOnboardingData();
        window.dispatchEvent(new CustomEvent('onboarding-updated'));
    };

    const moveStepUp = (index) => {
        if (index === 0) return;
        const newSteps = [...steps];
        [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
        setSteps(newSteps);
    };

    const moveStepDown = (index) => {
        if (index === steps.length - 1) return;
        const newSteps = [...steps];
        [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
        setSteps(newSteps);
    };

    const updateStep = (id, field, value) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addStep = () => {
        setSteps([...steps, { id: `temp_${Date.now()}`, title: '', description: '', action_url: '', action_text: '', action_url_2: '', action_text_2: '', allowed_roles: [] }]);
    };

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    const progressPercent = steps.length > 0 ? Math.round((completedSteps.length / steps.length) * 100) : 0;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-left animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <ListChecks className="text-[#9df01c]" size={36} />
                        Getting Started
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Complete these steps to set up your Creator Hub and launch your community.
                    </p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => {
                            if (isEditing) handleSaveSteps();
                            else setIsEditing(true);
                        }}
                        disabled={isSaving}
                        className={`font-black py-3 px-6 rounded-xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${isEditing ? 'bg-[#9df01c] text-black hover:bg-[#8ce015]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : (isEditing ? <Save size={14} /> : <Plus size={14} />)}
                        {isSaving ? 'Saving...' : (isEditing ? 'Save Checklist' : 'Edit Checklist')}
                    </button>
                )}
            </div>

            {!isEditing && steps.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Progress</span>
                        <span className="text-sm font-black text-[#9df01c]">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#111] border border-white/5 rounded-full h-3 overflow-hidden">
                        <div className="bg-[#9df01c] h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            )}

            {steps.length === 0 && !isEditing ? (
                <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-12 text-center min-h-[40vh] flex flex-col items-center justify-center">
                    <ListChecks size={48} className="text-gray-600 mb-4 opacity-30" />
                    <p className="text-gray-400 font-bold text-sm">No tasks assigned.</p>
                    <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-2">You are ready to go!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {steps.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const userRole = Number(unaData?.user?.role) || 1;
                        const requiredRoles = step.allowed_roles || [];
                        const isLocked = requiredRoles.length > 0 && !requiredRoles.includes(userRole) && !isAdmin;
                        
                        if (isAdmin && isEditing) {
                            return (
                                <div key={step.id} className="bg-[#111] p-5 rounded-[1.5rem] border border-white/10 flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col gap-1 flex-shrink-0 mt-1">
                                            <button onClick={() => moveStepUp(index)} disabled={index === 0} className={`p-1 rounded ${index === 0 ? 'text-gray-700' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><ChevronUp size={16}/></button>
                                            <button onClick={() => moveStepDown(index)} disabled={index === steps.length - 1} className={`p-1 rounded ${index === steps.length - 1 ? 'text-gray-700' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><ChevronDown size={16}/></button>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <input value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)} placeholder="Step Title (e.g. Connect your Stripe Account)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#9df01c] outline-none transition-colors" />
                                            <textarea value={step.description} onChange={e => updateStep(step.id, 'description', e.target.value)} placeholder="Description (Tell the user exactly how to complete this step)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors custom-scrollbar" rows="3" />
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                                <div>
                                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Button 1 Text</label>
                                                    <input value={step.action_text || ''} onChange={e => updateStep(step.id, 'action_text', e.target.value)} placeholder="e.g. Go to Integrations" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Button 1 URL</label>
                                                    <input value={step.action_url || ''} onChange={e => updateStep(step.id, 'action_url', e.target.value)} placeholder="e.g. /?app=bridge" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 focus:border-[#9df01c] outline-none transition-colors" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                                <div>
                                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Button 2 Text (Optional)</label>
                                                    <input value={step.action_text_2 || ''} onChange={e => updateStep(step.id, 'action_text_2', e.target.value)} placeholder="e.g. Download Plugin" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Button 2 URL (Optional)</label>
                                                    <input value={step.action_url_2 || ''} onChange={e => updateStep(step.id, 'action_url_2', e.target.value)} placeholder="e.g. https://..." className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 focus:border-[#9df01c] outline-none transition-colors" />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Available To (Leave blank for everyone)</label>
                                                <div className="flex flex-wrap gap-3">
                                                    {AVAILABLE_ROLES.map(r => {
                                                        const isChecked = (step.allowed_roles || []).includes(r.id);
                                                        return (
                                                            <label key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-[#9df01c]/10 border-[#9df01c]/50 text-[#9df01c]' : 'bg-black border-white/10 text-gray-400 hover:border-white/30'}`}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="hidden"
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const current = step.allowed_roles || [];
                                                                        const next = e.target.checked ? [...current, r.id] : current.filter(id => id !== r.id);
                                                                        updateStep(step.id, 'allowed_roles', next);
                                                                    }}
                                                                />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{r.name}</span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                        </div>
                                        <button onClick={() => handleDeleteStep(step.id)} className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors p-2 rounded-lg self-start flex-shrink-0"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            );
                        }

                        // User View
                        const missingRoleNames = requiredRoles.map(id => AVAILABLE_ROLES.find(r => r.id === id)?.name).filter(Boolean).join(', ');

                        return (
                            <div key={step.id} className={`p-6 rounded-[1.5rem] border transition-all duration-300 flex items-start gap-4 ${isLocked ? 'opacity-50 grayscale bg-[#111] border-white/5' : isCompleted ? 'bg-[#9df01c]/5 border-[#9df01c]/20' : 'bg-[#111] border-white/5 hover:border-white/10 shadow-lg shadow-black/50'}`}>
                                <div className="mt-1 flex-shrink-0">
                                    {isLocked ? (
                                        <Lock size={28} className="text-gray-500" />
                                    ) : (
                                        <button onClick={() => toggleProgress(step.id)} className="transition-transform hover:scale-110 focus:outline-none">
                                            {isCompleted ? <CheckCircle2 size={28} className="text-[#9df01c]" /> : <Circle size={28} className="text-gray-600 hover:text-gray-400" />}
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-lg font-black uppercase tracking-tight mb-1 transition-colors ${isCompleted && !isLocked ? 'text-gray-500 line-through' : 'text-white'}`}>{step.title}</h3>
                                    <p className={`text-sm font-medium leading-relaxed transition-colors ${isCompleted && !isLocked ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>
                                    
                                    {/* --- NATIVE REACT VIDEO BUTTON --- */}
                                    {index === 0 && !isLocked && (
                                        <div 
                                            className="mt-4 mb-2 w-full max-w-lg rounded-xl overflow-hidden shadow-xl border border-white/10 group bg-black transition-colors hover:border-[#9df01c]/50 relative cursor-pointer"
                                            onClick={() => setShowVideoModal(true)}
                                        >
                                            <img 
                                                src="https://embed.wave.video/KypZVgX4MZLAujHP/preview.jpg?width=1920&height=1080&play=true&color=%239df01c" 
                                                alt="Welcome to Sellout Crowds" 
                                                className="w-full h-auto object-cover block"
                                            />
                                        </div>
                                    )}

                                    {isLocked ? (
                                        <a href="https://www.selloutcrowds.com/plans" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg text-gray-400 font-black uppercase tracking-widest text-[10px] transition-colors hover:text-white hover:border-white/20">
                                            <Lock size={12} /> Available for {missingRoleNames}
                                        </a>
                                    ) : (
                                        !isCompleted && (step.action_url || step.action_url_2) && (
                                            <div className="flex flex-wrap gap-3 mt-4">
                                                {step.action_url && (
                                                    <a href={step.action_url} className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2.5 rounded-lg text-[#9df01c] font-black uppercase tracking-widest text-[10px] transition-colors">
                                                        {step.action_text || 'Complete Step'} <ArrowRight size={12} />
                                                    </a>
                                                )}
                                                {step.action_url_2 && (
                                                    <a href={step.action_url_2} className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2.5 rounded-lg text-white font-black uppercase tracking-widest text-[10px] transition-colors">
                                                        {step.action_text_2 || 'Secondary Action'} <ArrowRight size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isEditing && (
                <button onClick={addStep} className="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-[#9df01c]/30 text-[#9df01c] hover:bg-[#9df01c]/10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                    <Plus size={16} /> Add New Step
                </button>
            )}

            {/* --- NATIVE VIDEO MODAL --- */}
            {showVideoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowVideoModal(false)}>
                    <div className="w-full max-w-5xl flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setShowVideoModal(false)} className="bg-white/10 hover:bg-red-500 text-white p-2 rounded-full transition-colors backdrop-blur-md">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                            <iframe 
                                src="https://embed.wave.video/KypZVgX4MZLAujHP?autoplay=true&color=%239df01c" 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                allow="autoplay; fullscreen"
                                title="Welcome Video"
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}