import React, { useState, useEffect } from 'react';
import { Youtube, Plus, Key, Loader2, Edit3, Trash2, X, Globe, ExternalLink, ArrowLeft, Users, Check } from 'lucide-react';

export default function YoutubeSyncApp({ session, unaData, activeTab = 'manage', setActiveTab }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [teammates, setTeammates] = useState([]);
    
    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPlaylistId, setEditingPlaylistId] = useState(null);
    const [newPlaylistId, setNewPlaylistId] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [selectedPrivacy, setSelectedPrivacy] = useState('');
    const [selectedAuthors, setSelectedAuthors] = useState([]);
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        if (!session) return;
        fetchData();
    }, [session]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [keyRes, listsRes, teamRes] = await Promise.all([
                fetch('/api/youtube/key', { headers: { 'Authorization': `Bearer ${session}` } }),
                fetch('/api/youtube/playlists', { headers: { 'Authorization': `Bearer ${session}` } }),
                fetch('/api/youtube/teammates', { headers: { 'Authorization': `Bearer ${session}` } })
            ]);
            
            const keyData = await keyRes.json();
            const listsData = await listsRes.json();
            const teamData = await teamRes.json();
            
            if (keyData.key) setApiKey(keyData.key);
            if (listsData.playlists) setPlaylists(listsData.playlists);
            if (teamData.teammates) setTeammates(teamData.teammates);
        } catch (err) {
            console.error("Failed to load YouTube data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setEditingPlaylistId(null);
        setNewPlaylistId('');
        setIsActive(true);
        setSelectedPrivacy('');
        setModalError('');
        
        // Default to the main account user
        const defaultAuthor = teammates.length > 0 ? teammates[0] : { id: unaData?.user?.id || 0, name: unaData?.user?.name || 'Primary Account' };
        setSelectedAuthors([defaultAuthor]);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (playlist) => {
        setEditingPlaylistId(playlist.id);
        setNewPlaylistId(playlist.ident);
        setIsActive(playlist.active === 1);
        setSelectedPrivacy(playlist.allow_view_to?.toString() || '');
        setModalError('');

        // Map author and co_authors
        const authorIds = [playlist.author];
        if (playlist.co_authors) {
            const coList = playlist.co_authors.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);
            authorIds.push(...coList);
        }

        const matchedAuthors = authorIds.map(id => {
            const found = teammates.find(t => (t.id === id || t.profile_id === id));
            return found || { id: id, profile_id: id, name: `User #${id}` };
        });

        setSelectedAuthors(matchedAuthors.length > 0 ? matchedAuthors : [{ id: unaData?.user?.id || 0, name: unaData?.user?.name || 'Primary Account' }]);
        setIsAddModalOpen(true);
    };

    const handleToggleAuthor = (teammate) => {
        const exists = selectedAuthors.some(a => (a.id === teammate.id || a.profile_id === teammate.profile_id));
        if (exists) {
            if (selectedAuthors.length === 1) return; // Must keep at least one primary author
            setSelectedAuthors(selectedAuthors.filter(a => a.id !== teammate.id && a.profile_id !== teammate.profile_id));
        } else {
            setSelectedAuthors([...selectedAuthors, teammate]);
        }
    };

    const handleSaveKey = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/youtube/key', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: apiKey })
            });
            if (res.ok) alert("API Key saved successfully!");
            else alert("Failed to save API key.");
        } catch (err) {
            alert("Server error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePlaylist = async () => {
        setModalError('');
        if (!newPlaylistId || !selectedPrivacy) {
            setModalError('Please fill out all required fields.');
            return;
        }

        const authorIds = selectedAuthors.map(a => a.profile_id || a.id);

        setIsSaving(true);
        try {
            const isEdit = !!editingPlaylistId;
            const url = isEdit ? `/api/youtube/playlists/${editingPlaylistId}` : '/api/youtube/playlists';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ident: newPlaylistId, 
                    active: isActive, 
                    allow_view_to: selectedPrivacy,
                    authors: authorIds
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setIsAddModalOpen(false);
                await fetchData();
            } else {
                setModalError(data.error || "Failed to save playlist.");
            }
        } catch (err) {
            setModalError("Server error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlaylist = async (id) => {
        if (!window.confirm("Are you sure you want to remove this playlist?")) return;
        
        try {
            const res = await fetch(`/api/youtube/playlists/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session}` }
            });
            if (res.ok) {
                setPlaylists(playlists.filter(p => p.id !== id));
            }
        } catch (err) {
            alert("Failed to delete playlist.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---------';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // --- VIEW: API KEY SETTINGS ---
    if (activeTab === 'settings') {
        return (
            <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2 m-0 leading-none">
                            <Key className="text-[#9df01c]" size={24} /> API Key Settings
                        </h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                            Connect your Google YouTube API Key
                        </p>
                    </div>
                </div>

                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl max-w-3xl">
                    <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <h4 className="text-sm font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                            <Youtube size={16} className="text-red-500" /> How to obtain your API Key
                        </h4>
                        <ol className="list-decimal list-inside text-xs text-gray-400 space-y-3 leading-relaxed font-medium">
                            <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#9df01c] hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink size={10}/></a>.</li>
                            <li>Create a new project or select an existing one at the top of the page.</li>
                            <li>Enable the <strong>YouTube Data API v3</strong> for your project in the API Library.</li>
                            <li>Go back to the <strong>Credentials</strong> tab and click <strong>+ Create Credentials &gt; API key</strong>.</li>
                            <li>Copy your newly generated API key and paste it below.</li>
                        </ol>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Google YouTube API Key
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSyB..."
                                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#9df01c] transition-colors font-mono"
                            />
                            <button 
                                onClick={handleSaveKey}
                                disabled={isSaving}
                                className="bg-[#9df01c] text-black font-black uppercase text-[10px] tracking-widest py-3.5 px-8 rounded-xl hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/10 whitespace-nowrap"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Key"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: DASHBOARD (DEFAULT) ---
    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white flex items-center gap-3">
                        <Youtube className="text-[#9df01c]" size={36} />
                        YouTube Playlists
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Manage your connected YouTube playlists to automatically import content.
                    </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <button 
                        onClick={handleOpenAddModal}
                        className="flex-1 sm:flex-none bg-[#9df01c] text-black font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/10"
                    >
                        <Plus size={16} /> Add Playlist
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className="flex-1 sm:flex-none bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest py-3 px-4 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <Key size={16} /> <span className="hidden sm:inline">API Key Settings</span>
                    </button>
                </div>
            </div>

            {/* Dashboard Table */}
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl min-h-[50vh] relative overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 text-[#9df01c] animate-spin" />
                    </div>
                ) : playlists.length === 0 ? (
                    <div className="text-center p-16 border-2 border-dashed border-white/5 rounded-2xl text-gray-500 flex flex-col items-center">
                        <Youtube size={48} className="mx-auto mb-4 text-white/20"/>
                        <p className="text-sm font-medium mb-2">No Playlists Connected</p>
                        <p className="text-[10px] max-w-md mx-auto uppercase tracking-widest leading-relaxed">
                            Click "Add Playlist" above to connect your first YouTube playlist and begin importing videos automatically to your communities.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Active</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Playlist Id</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Total</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Transferred</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Updated</th>
                                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Last video date</th>
                                    <th className="pb-4 pr-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {playlists.map(playlist => (
                                    <tr key={playlist.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-4 text-xs font-bold text-white">
                                            {playlist.active === 1 ? 'Yes' : 'No'}
                                        </td>
                                        <td className="py-4 text-sm font-bold text-blue-400 hover:underline cursor-pointer flex items-center gap-3">
                                            {playlist.thumb ? (
                                                <img src={playlist.thumb} alt={playlist.title} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">YT</div>
                                            )}
                                            <a href={`https://www.youtube.com/playlist?list=${playlist.ident}`} target="_blank" rel="noopener noreferrer">
                                                {playlist.title || playlist.ident}
                                            </a>
                                        </td>
                                        <td className="py-4 text-xs font-mono text-gray-400">{playlist.total}</td>
                                        <td className="py-4 text-xs font-mono text-gray-400">{playlist.migrated}</td>
                                        <td className="py-4 text-xs font-mono text-gray-400">
                                            {playlist.last_update ? formatDate(new Date(playlist.last_update * 1000)) : '---------'}
                                        </td>
                                        <td className="py-4 text-xs font-mono text-gray-400">
                                            {formatDate(playlist.cursor)}
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenEditModal(playlist)}
                                                    className="p-1.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-md hover:bg-white/10"
                                                    title="Edit Playlist"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePlaylist(playlist.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-md hover:bg-white/10"
                                                    title="Remove Playlist"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Playlist Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151515] rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                                {editingPlaylistId ? 'Edit Playlist' : 'Add new Playlist'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1 bg-white/5 rounded-full hover:bg-white/10">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            
                            {modalError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                                    {modalError}
                                </div>
                            )}

                            {/* Playlist ID */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Playlist Id <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={newPlaylistId}
                                    onChange={(e) => setNewPlaylistId(e.target.value)}
                                    disabled={!!editingPlaylistId}
                                    placeholder="PLxxxxxxxxxxxxxxxxxxxx"
                                    className={`w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#9df01c] transition-colors ${editingPlaylistId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>

                            {/* Active Switcher */}
                            <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-xl">
                                <span className="text-xs font-bold text-white">Active</span>
                                <button 
                                    type="button"
                                    onClick={() => setIsActive(!isActive)}
                                    className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${isActive ? 'bg-[#9df01c]' : 'bg-white/10'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Creator(s) Multi-Select */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Creator(s) <Users size={12} className="text-[#9df01c]" />
                                </label>
                                
                                {/* Selected Authors Tags */}
                                <div className="flex flex-wrap gap-2 min-h-[42px] p-2.5 bg-black border border-white/10 rounded-xl items-center">
                                    {selectedAuthors.map((author, index) => (
                                        <span 
                                            key={author.id || author.profile_id || index} 
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                index === 0 
                                                    ? 'bg-[#9df01c] text-black shadow-md shadow-[#9df01c]/10' 
                                                    : 'bg-white/10 text-white'
                                            }`}
                                        >
                                            {author.name || author.email}
                                            {index === 0 && <span className="text-[9px] uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded ml-1 font-black">Primary</span>}
                                            {selectedAuthors.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleToggleAuthor(author)} 
                                                    className="hover:opacity-75 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* Teammates Selection Dropdown */}
                                {teammates.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Add or Remove Account Teammates:</p>
                                        <div className="max-h-36 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-black/50 p-1 space-y-0.5">
                                            {teammates.map(tm => {
                                                const isSelected = selectedAuthors.some(a => (a.id === tm.id || a.profile_id === tm.profile_id));
                                                return (
                                                    <button
                                                        key={tm.id || tm.profile_id}
                                                        type="button"
                                                        onClick={() => handleToggleAuthor(tm)}
                                                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors ${
                                                            isSelected ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                    >
                                                        <span>{tm.name} {tm.is_primary ? '(Account Owner)' : ''}</span>
                                                        {isSelected && <Check size={14} className="text-[#9df01c]" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Note: Please be aware that the first user in the list will be assigned as the primary author of this video.
                                </p>
                            </div>

                            {/* Destination Selection (Grouped Crowds & Spaces) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Select Where to Post <span className="text-red-500">*</span>
                                </label>
                                <div className="w-full bg-black border border-white/10 rounded-xl px-4 py-1 text-sm text-white hover:border-white/20 transition-colors flex items-center gap-2">
                                    <Globe size={16} className="text-gray-400 shrink-0" />
                                    <select 
                                        value={selectedPrivacy}
                                        onChange={(e) => setSelectedPrivacy(e.target.value)}
                                        className="w-full bg-transparent text-white border-none focus:ring-0 py-2 outline-none cursor-pointer text-sm"
                                    >
                                        <option value="" className="bg-[#111] text-gray-400">Select Where to Post...</option>
                                        <option value="3" className="bg-[#111] text-white">Public (Entire Site)</option>
                                        
                                        {unaData?.crowds && unaData.crowds.length > 0 && (
                                            <optgroup label="── CROWDS ──" className="bg-[#111] text-[#9df01c] font-black tracking-widest uppercase">
                                                {unaData.crowds.map(crowd => (
                                                    <option key={crowd.id} value={`-${crowd.id}`} className="bg-[#111] text-white font-medium">
                                                        {crowd.title}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}

                                        {unaData?.spaces && unaData.spaces.length > 0 && (
                                            <optgroup label="── SPACES ──" className="bg-[#111] text-[#9df01c] font-black tracking-widest uppercase">
                                                {unaData.spaces.map(space => (
                                                    <option key={space.id} value={`-${space.id}`} className="bg-[#111] text-white font-medium">
                                                        {space.title}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Note: Only new videos will be added to Sellout Crowds. Videos already uploaded on Youtube will not be imported.
                                </p>
                            </div>

                        </div>
                        <div className="p-6 border-t border-white/5 flex gap-3 bg-black/50">
                            <button 
                                onClick={handleSavePlaylist}
                                disabled={isSaving}
                                className="bg-[#9df01c] text-black font-black uppercase text-[11px] tracking-widest py-3 px-8 rounded-xl hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/10 flex items-center justify-center min-w-[100px]"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : (editingPlaylistId ? 'Save' : 'Add')}
                            </button>
                            <button 
                                onClick={() => setIsAddModalOpen(false)} 
                                disabled={isSaving}
                                className="bg-white/5 text-white font-black uppercase text-[11px] tracking-widest py-3 px-8 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
