import React, { useState, useEffect } from 'react';
import { Globe, Save, Loader2, CheckCircle2, Lock, Link2, Copy, Trash2, Plus, Upload, X, AlertCircle, ArrowRight } from 'lucide-react';

export default function CommunityLinkApp({ session, unaData }) {
    const role = Number(unaData?.user?.role) || 1;
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    // Feature unlocked for Admin(3), All-Star(16), HOF(17)
    const canAccess = isAdmin || [16, 17].includes(role);

    // Calculate maximum allowed links based on role
    const maxLinks = isAdmin ? Infinity : (role === 17 ? 3 : (role === 16 ? 1 : 0));

    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Single Add Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [subdomain, setSubdomain] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Bulk Add Modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    const fetchDomains = async () => {
        if (!session || !canAccess) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/get-domains', { headers: { 'Authorization': `Bearer ${session}` } });
            const data = await res.json();
            if (data.domains) {
                setDomains(data.domains);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, [session, canAccess]);

    const handleSaveSingle = async () => {
        if (!subdomain || !targetUrl) {
            alert("Both fields are required!");
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/save-domain', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, target_url: targetUrl })
            });
            const data = await res.json();
            
            if (data.error) {
                alert(data.error);
            } else {
                setSubdomain('');
                setTargetUrl('');
                setShowAddModal(false);
                fetchDomains();
            }
        } catch (err) {
            alert("Network error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveBulk = async () => {
        if (!bulkText.trim()) return;
        setIsBulkSaving(true);
        setBulkResult(null);
        
        try {
            // Parse text. Expected format: subdomain, url (separated by comma, space, or tab)
            const lines = bulkText.split('\n');
            const parsedLinks = [];
            
            lines.forEach(line => {
                const parts = line.split(/[, \t]+/); // Split by comma, space, or tab
                const validParts = parts.filter(p => p.trim() !== '');
                if (validParts.length >= 2) {
                    parsedLinks.push({
                        subdomain: validParts[0],
                        targetUrl: validParts[1]
                    });
                }
            });

            if (parsedLinks.length === 0) {
                alert("Could not detect any valid links. Please use the format: subdomain, url");
                setIsBulkSaving(false);
                return;
            }

            const res = await fetch('/api/save-domains-bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: parsedLinks })
            });
            
            const data = await res.json();
            
            if (data.error) {
                alert(data.error);
            } else {
                setBulkResult({ added: data.added, skipped: data.skipped });
                if (data.added > 0) {
                    setBulkText('');
                    fetchDomains();
                }
            }
        } catch (err) {
            alert("Network error processing bulk import.");
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleDelete = async (id, sub) => {
        if (!window.confirm(`Are you sure you want to disconnect ${sub}.selloutcrowds.fan? This will instantly break the link.`)) return;
        
        try {
            const res = await fetch('/api/delete-domain', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, subdomain: sub })
            });
            
            if (res.ok) {
                fetchDomains();
            } else {
                alert("Failed to disconnect link.");
            }
        } catch (err) {
            alert("Network error. Please try again.");
        }
    };

    const copyToClipboard = (sub) => {
        navigator.clipboard.writeText(`https://${sub}.selloutcrowds.fan`);
        alert("Link copied!");
    };

    const currentLinks = domains.length;
    const canAddMore = currentLinks < maxLinks;

    if (!canAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
                <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                    <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                    <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                        Claim branded subdomains (e.g. <strong>yourname</strong>.selloutcrowds.fan) to seamlessly route fans to your communities. Available exclusively to All-Star and H.O.F. subscribers.
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
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <Globe className="text-[#9df01c]" size={36} />
                        Custom Community URL
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Manage branded redirect URLs for your communities.
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    {isAdmin && (
                        <button onClick={() => setShowBulkModal(true)} className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                            <Upload size={14} /> <span className="hidden sm:inline">Bulk Automator</span>
                        </button>
                    )}
                    <button 
                        onClick={() => canAddMore ? setShowAddModal(true) : alert(`You have reached your limit of ${maxLinks} link${maxLinks === 1 ? '' : 's'}. Please delete an existing link to add a new one.`)} 
                        className={`px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center gap-2 shadow-lg ${canAddMore ? 'bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-[#9df01c]/20' : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'}`}
                    >
                        <Plus size={14} /> <span className="hidden sm:inline">New Link</span>
                    </button>
                </div>
            </div>

            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 shadow-2xl relative overflow-hidden min-h-[60vh] flex flex-col">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/5 pb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                        Active Links 
                        <span className="bg-white/10 text-gray-300 text-xs px-3 py-1 rounded-lg">
                            {currentLinks}{!isAdmin && ` / ${maxLinks}`}
                        </span>
                    </h3>
                </div>

                <div className="relative z-10 flex-1">
                    {domains.length === 0 ? (
                        <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                            <Globe size={48} className="text-gray-600 mb-4 opacity-30" />
                            <p className="text-gray-400 font-bold text-sm">No Links Reserved</p>
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-2">Click "New Link" {isAdmin && 'or "Bulk Automator" '}to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {domains.map(d => (
                                <div key={d.id} className="bg-black border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/20 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 px-2 py-0.5 rounded">Active</span>
                                            <p className="text-sm font-bold text-white truncate">{d.subdomain}.selloutcrowds.fan</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono truncate">
                                            <ArrowRight size={12} className="flex-shrink-0" /> {d.target_url}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 border-t border-white/5 sm:border-none sm:pt-0">
                                        <button onClick={() => copyToClipboard(d.subdomain)} className="flex-1 sm:flex-none p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex justify-center items-center" title="Copy Link">
                                            <Copy size={14}/>
                                        </button>
                                        <button onClick={() => handleDelete(d.id, d.subdomain)} className="flex-1 sm:flex-none p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex justify-center items-center" title="Delete Link">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SINGLE ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative flex flex-col">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                        
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-[#9df01c] flex-shrink-0"><Plus size={24}/></div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Create Link</h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">Reserve a single branded subdomain.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Brand Name</label>
                                <div className="flex items-center bg-black rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors overflow-hidden pr-3">
                                    <input 
                                        type="text" 
                                        value={subdomain} 
                                        onChange={e => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} 
                                        placeholder="cowboys" 
                                        className="flex-1 bg-transparent px-4 py-3 text-sm text-white font-bold outline-none" 
                                    />
                                    <span className="text-gray-500 font-bold text-xs whitespace-nowrap">.selloutcrowds.fan</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Target Community URL</label>
                                <div className="flex items-center gap-2 bg-black border border-white/10 focus-within:border-[#9df01c] transition-colors rounded-xl px-4 py-3">
                                    <Link2 size={14} className="text-gray-500" />
                                    <input 
                                        type="text" 
                                        value={targetUrl} 
                                        onChange={e => setTargetUrl(e.target.value)} 
                                        placeholder="https://studio.selloutcrowds.com/..." 
                                        className="bg-transparent text-white text-xs outline-none w-full flex-1" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8">
                            <button onClick={handleSaveSingle} disabled={isSaving || !subdomain || !targetUrl} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Connection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK AUTOMATOR MODAL (ADMIN ONLY) */}
            {showBulkModal && isAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <button onClick={() => { setShowBulkModal(false); setBulkResult(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                        
                        {bulkResult ? (
                            <div className="text-center py-12">
                                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Import Complete</h3>
                                <p className="text-sm font-medium text-gray-400 mb-6">Successfully generated {bulkResult.added} custom links instantly!</p>
                                {bulkResult.skipped > 0 && (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest mb-8">
                                        <AlertCircle size={14}/> Skipped {bulkResult.skipped} duplicates
                                    </div>
                                )}
                                <button onClick={() => { setShowBulkModal(false); setBulkResult(null); }} className="block mx-auto bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest px-8 py-3 rounded-xl transition-colors">
                                    Return to Dashboard
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-[#9df01c] flex-shrink-0"><Upload size={24}/></div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2 flex-shrink-0">Bulk Automator</h3>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6 flex-shrink-0">
                                    Paste a list of names and URLs. The system will process hundreds of them instantly. Separate the name and URL with a comma, space, or tab. One link per line.
                                </p>
                                
                                <div className="bg-[#9df01c]/10 border border-[#9df01c]/20 p-3 rounded-xl mb-4 flex-shrink-0">
                                    <p className="text-[9px] text-[#9df01c] font-bold uppercase tracking-widest mb-1">Format Example:</p>
                                    <p className="text-xs text-gray-300 font-mono">cowboys, https://selloutcrowds.com/crowd/cowboys</p>
                                    <p className="text-xs text-gray-300 font-mono">lakers, https://selloutcrowds.com/crowd/lakers</p>
                                </div>

                                <div className="flex-1 min-h-[200px] mb-6">
                                    <textarea 
                                        value={bulkText}
                                        onChange={e => setBulkText(e.target.value)}
                                        placeholder="cowboys, https://selloutcrowds.com/crowd/cowboys&#10;lakers, https://selloutcrowds.com/crowd/lakers" 
                                        className="w-full h-full bg-black border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:border-[#9df01c] outline-none transition-colors resize-none custom-scrollbar"
                                    ></textarea>
                                </div>

                                <div className="flex-shrink-0">
                                    <button onClick={handleSaveBulk} disabled={isBulkSaving || !bulkText.trim()} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                        {isBulkSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {isBulkSaving ? 'Processing Automations...' : 'Import & Generate Links'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}