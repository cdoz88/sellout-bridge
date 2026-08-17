import React, { useState, useEffect } from 'react';
import { Download, Loader2, Trash2, Globe, ExternalLink, Settings, X, Save, Search, CheckCircle2, FileText, Info } from 'lucide-react';
import WordPressIcon from '../icons/WordPressIcon';
import HelpDrawer from '../layout/HelpDrawer';

export default function WordpressSyncApp({ session, unaData, activeTab = 'manage', setActiveTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const userEmail = unaData?.user?.email || '';
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

    const [tokens, setTokens] = useState([]);
    const [pluginInfo, setPluginInfo] = useState({
        download_url: 'https://beasellout.com/download/sc_wp_plugin.zip',
        version: '1.0.0',
        date_added: 'Aug 15, 2026'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Admin Modal State
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editDownloadUrl, setEditDownloadUrl] = useState('');
    const [editVersion, setEditVersion] = useState('');
    const [editDateAdded, setEditDateAdded] = useState('');
    const [isSavingAdmin, setIsSavingAdmin] = useState(false);

    useEffect(() => {
        if (!session || !userEmail) return;
        fetchWpData();
    }, [session, userEmail]);

    const fetchWpData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_wp_data', email: userEmail })
            });
            const data = await res.json();
            if (data.success) {
                if (data.tokens) setTokens(data.tokens);
                if (data.plugin_info) setPluginInfo(data.plugin_info);
            }
        } catch (err) {
            console.error("Failed to fetch WordPress Sync data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async (tokenId, siteDomain) => {
        if (!window.confirm(`Are you sure you want to disconnect ${siteDomain}? Posts published on this WordPress site will no longer automatically sync to your communities.`)) return;

        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_wp_token', token_id: tokenId, email: userEmail })
            });
            const data = await res.json();
            if (data.success) {
                setTokens(prev => prev.filter(t => t.id !== tokenId));
            } else {
                alert(data.error || "Failed to disconnect site.");
            }
        } catch (err) {
            alert("Failed to disconnect site. Please try again.");
        }
    };

    const openAdminModal = () => {
        setEditDownloadUrl(pluginInfo.download_url || 'https://beasellout.com/download/sc_wp_plugin.zip');
        setEditVersion(pluginInfo.version || '1.0.0');
        setEditDateAdded(pluginInfo.date_added || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        setShowAdminModal(true);
    };

    const handleSavePluginInfo = async () => {
        if (!editDownloadUrl || !editVersion) {
            alert("Please fill out all fields.");
            return;
        }

        setIsSavingAdmin(true);
        try {
            const res = await fetch('/api/admin-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_wp_plugin_info',
                    download_url: editDownloadUrl,
                    version: editVersion,
                    date_added: editDateAdded,
                    email: userEmail
                })
            });
            const data = await res.json();
            if (data.success) {
                setPluginInfo({
                    download_url: editDownloadUrl,
                    version: editVersion,
                    date_added: editDateAdded
                });
                setShowAdminModal(false);
            } else {
                alert(data.error || "Failed to update plugin info.");
            }
        } catch (e) {
            alert("Failed to save plugin info.");
        } finally {
            setIsSavingAdmin(false);
        }
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return '---------';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return dateInput;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filteredTokens = tokens.filter(t => 
        t.site && t.site.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <WordPressIcon size={36} className="text-[#9df01c]" />
                        WordPress Sync
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Connect your WordPress site to automatically post articles directly to your Crowds and Spaces.
                    </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <a
                        href={pluginInfo.download_url || 'https://beasellout.com/download/sc_wp_plugin.zip'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none font-black uppercase text-[10px] tracking-widest py-3.5 px-6 rounded-xl bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-lg shadow-[#9df01c]/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Download size={16} /> Download Plugin
                    </a>
                    {isAdmin && (
                        <button
                            onClick={openAdminModal}
                            className="flex-1 sm:flex-none font-black uppercase text-[10px] tracking-widest py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                            title="Edit Plugin Version & File URL"
                        >
                            <Settings size={16} /> <span className="hidden sm:inline">Admin Settings</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Instruction Banner & Version Metadata */}
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-2 mb-1">
                            <Info size={18} className="text-[#9df01c]" /> Setup Instructions
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Follow these 4 simple steps to connect your WordPress blog or news site.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-black border border-white/10 rounded-xl px-4 py-2.5 shrink-0">
                        <FileText size={16} className="text-[#9df01c]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Plugin Version v{pluginInfo.version || '1.0.0'}</span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Added: {pluginInfo.date_added || 'Aug 15, 2026'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-black border border-white/5 rounded-2xl p-4">
                        <span className="w-7 h-7 rounded-lg bg-[#9df01c]/10 text-[#9df01c] font-black text-xs flex items-center justify-center mb-3 border border-[#9df01c]/20">1</span>
                        <h4 className="text-xs font-bold text-white mb-1">Download Plugin</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Click the "Download Plugin" button above to get the latest zip package.</p>
                    </div>

                    <div className="bg-black border border-white/5 rounded-2xl p-4">
                        <span className="w-7 h-7 rounded-lg bg-[#9df01c]/10 text-[#9df01c] font-black text-xs flex items-center justify-center mb-3 border border-[#9df01c]/20">2</span>
                        <h4 className="text-xs font-bold text-white mb-1">Install on WordPress</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Go to your WP Admin &gt; Plugins &gt; Add New, and upload the zip file.</p>
                    </div>

                    <div className="bg-black border border-white/5 rounded-2xl p-4">
                        <span className="w-7 h-7 rounded-lg bg-[#9df01c]/10 text-[#9df01c] font-black text-xs flex items-center justify-center mb-3 border border-[#9df01c]/20">3</span>
                        <h4 className="text-xs font-bold text-white mb-1">Connect via OAuth</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Open the plugin dashboard in WP and click "Connect to Sellout Crowds".</p>
                    </div>

                    <div className="bg-black border border-white/5 rounded-2xl p-4">
                        <span className="w-7 h-7 rounded-lg bg-[#9df01c]/10 text-[#9df01c] font-black text-xs flex items-center justify-center mb-3 border border-[#9df01c]/20">4</span>
                        <h4 className="text-xs font-bold text-white mb-1">Auto-Post Articles</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Choose a target Crowd or Space when publishing a post in WordPress.</p>
                    </div>
                </div>
            </div>

            {/* Connected WP Sites Table */}
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl min-h-[50vh] relative overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/5 pb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                        Connected Sites
                        <span className="bg-white/10 text-gray-300 text-xs px-3 py-1 rounded-lg">
                            {tokens.length}
                        </span>
                    </h3>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search domains..."
                            className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-[#9df01c] outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="w-8 h-8 text-[#9df01c] animate-spin" />
                        </div>
                    ) : tokens.length === 0 ? (
                        <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                            <Globe size={48} className="text-gray-600 mb-4 opacity-30" />
                            <p className="text-gray-400 font-bold text-sm">No Connected WordPress Sites</p>
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-2">Download the plugin above and connect your first WordPress blog.</p>
                        </div>
                    ) : filteredTokens.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 font-medium text-sm">No sites match your search.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Website Domain</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Connection Date</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                        <th className="pb-4 pr-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTokens.map(token => (
                                        <tr key={token.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 text-sm font-bold text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#9df01c] border border-white/10 shrink-0">
                                                    WP
                                                </div>
                                                <a href={`https://${token.site}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#9df01c] hover:underline transition-colors flex items-center gap-1.5">
                                                    {token.site} <ExternalLink size={12} className="text-gray-500" />
                                                </a>
                                            </td>
                                            <td className="py-4 text-xs font-mono text-gray-400">
                                                {formatDate(token.created)}
                                            </td>
                                            <td className="py-4">
                                                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 border border-[#9df01c]/20 px-2.5 py-1 rounded-lg">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <button
                                                    onClick={() => handleDisconnect(token.id, token.site)}
                                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 ml-auto"
                                                    title="Disconnect Site"
                                                >
                                                    <Trash2 size={12} /> Disconnect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Settings Modal */}
            {showAdminModal && isAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151515] rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                                Edit Plugin Package
                            </h3>
                            <button onClick={() => setShowAdminModal(false)} className="text-gray-500 hover:text-white transition-colors p-1 bg-white/5 rounded-full hover:bg-white/10">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                                    Download URL
                                </label>
                                <input
                                    type="text"
                                    value={editDownloadUrl}
                                    onChange={(e) => setEditDownloadUrl(e.target.value)}
                                    placeholder="https://beasellout.com/download/sc_wp_plugin.zip"
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#9df01c] font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                                        Version String
                                    </label>
                                    <input
                                        type="text"
                                        value={editVersion}
                                        onChange={(e) => setEditVersion(e.target.value)}
                                        placeholder="1.0.0"
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#9df01c] font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                                        Date Added
                                    </label>
                                    <input
                                        type="text"
                                        value={editDateAdded}
                                        onChange={(e) => setEditDateAdded(e.target.value)}
                                        placeholder="Aug 15, 2026"
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#9df01c]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 flex gap-3 bg-black/50">
                            <button
                                onClick={handleSavePluginInfo}
                                disabled={isSavingAdmin}
                                className="bg-[#9df01c] text-black font-black uppercase text-[11px] tracking-widest py-3 px-8 rounded-xl hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/10 flex items-center justify-center min-w-[100px]"
                            >
                                {isSavingAdmin ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Details'}
                            </button>
                            <button
                                onClick={() => setShowAdminModal(false)}
                                disabled={isSavingAdmin}
                                className="bg-white/5 text-white font-black uppercase text-[11px] tracking-widest py-3 px-8 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contextual Help Drawer */}
            <HelpDrawer pageName="wordpress_plugin" session={session} unaData={unaData} />
        </div>
    );
}