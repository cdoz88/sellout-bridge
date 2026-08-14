import React, { useState, useEffect } from 'react';
import { Youtube, Plus, Key, Loader2, Edit3, Trash2, X, Globe, ExternalLink, ArrowLeft, Users, Check, Search, RefreshCw } from 'lucide-react';
import HelpDrawer from '../layout/HelpDrawer';

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

    // User Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!session) return;
        fetchData();
    }, [session]);

    // Handle Async Search with Debouncing
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/youtube/search-users?term=${encodeURIComponent(searchQuery)}`, {
                    headers: { 'Authorization': `Bearer ${session}` }
                });
                const data = await res.json();
                if (data.users) setSearchResults(data.users);
            } catch (err) {
                console.error("Failed to search users:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, session]);

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
        setSearchQuery('');
        setSearchResults([]);
        
        // Start completely empty so the admin isn't forced as a creator
        setSelectedAuthors([]);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (playlist) => {
        setEditingPlaylistId(playlist.id);
        setNewPlaylistId(playlist.ident);
        setIsActive(playlist.active === 1);
        setSelectedPrivacy(playlist.allow_view_to?.toString() || '');
        setModalError('');
        setSearchQuery('');
        setSearchResults([]);

        // Map ONLY co_authors to the creator list, because playlist.author is now securely the admin manager
        const authorIds = [];
        if (playlist.co_authors) {
            authorIds.push(...playlist.co_authors.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean));
        }

        const matchedAuthors = authorIds.map(id => {
            const found = teammates.find(t => (t.id === id || t.profile_id === id));
            return found || { id: id, profile_id: id, name: `Creator #${id}` };
        });

        setSelectedAuthors(playlist.creators_data || matchedAuthors);
        setIsAddModalOpen(true);
    };

    // Automatically strip the URL if a user pastes a full link instead of just the ID
    const handlePlaylistIdChange = (e) => {
        let val = e.target.value;
        try {
            if (val.includes('youtube.com') || val.includes('youtu.be')) {
                const url = new URL(val);
                const listParam = url.searchParams.get('list');
                if (listParam) {
                    val = listParam;
                }
            }
        } catch(err) {
            // Ignore invalid URL parsing errors
        }
        setNewPlaylistId(val);
    };

    const handleToggleAuthor = (user) => {
        const exists = selectedAuthors.some(a => (a.id === user.id || a.profile_id === user.profile_id));
        if (exists) {
            setSelectedAuthors(selectedAuthors.filter(a => a.id !== user.id && a.profile_id !== user.profile_id));
        } else {
            setSelectedAuthors([...selectedAuthors, user]);
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
            if (res.ok) {
                alert("API Key saved successfully!");
            } else {
                alert("Failed to save API key.");
            }
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

    const formatDate = (dateInput) => {
        if (!dateInput) return '---------';
        
        let date;
        if (typeof dateInput === 'number' || (typeof dateInput === 'string' && !isNaN(dateInput) && !dateInput.includes('-'))) {
            date = new Date(Number(dateInput) * 1000);
        } else {
            date = new Date(dateInput);
        }
        
        if (dateInput instanceof Date) {
            date = dateInput;
        }

        if (isNaN(date.getTime())) return '---------';
        
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        
        return `${mm}-${dd}-${yyyy}`;
    };

    // --- VIEW: API KEY SETTINGS ---
    if (activeTab === 'settings') {
        return (
            <>
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

                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl max-w-3xl relative">
                        
                        <div className="space-y-4 mb-10">
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
                                    disabled={isSaving || !apiKey}
                                    className={`font-black uppercase text-[10px] tracking-widest py-3.5 px-8 rounded-xl transition-colors whitespace-nowrap ${
                                        apiKey 
                                        ? 'bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-lg shadow-[#9df01c]/10' 
                                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Key"}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                                Your key is securely stored and used to fetch playlist metadata directly from Google.
                            </p>
                        </div>

                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                            <h4 className="text-sm font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                                <Youtube size={16} className="text-red-500" /> How to obtain your API Key
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-5">
                                A YouTube API key is free to obtain and required to start syncing YouTube playlists with your communities. 
                            </p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <a 
                                    href="https://console.cloud.google.com/apis/credentials" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-black border border-white/10 hover:border-[#9df01c] text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                                >
                                    Open Google Console <ExternalLink size={14} />
                                </a>
                                <p className="text-xs text-gray-500 italic max-w-xs leading-relaxed">
                                    For detailed instructions, open the <strong className="text-[#9df01c]">Step-by-Step Guide</strong> tab in the bottom right corner of your screen.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- MAGIC UNIVERSAL HELP DRAWER (PASSED UNADATA) --- */}
                <HelpDrawer pageName="youtube_sync_api" session={session} unaData={unaData} />
            </>
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
                        onClick={apiKey ? handleOpenAddModal : undefined}
                        disabled={!apiKey}
                        className={`flex-1 sm:flex-none font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                            apiKey 
                            ? 'bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-lg shadow-[#9df01c]/10 cursor-pointer' 
                            : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                        }`}
                    >
                        <Plus size={16} /> Add Playlist
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 sm:flex-none font-black uppercase text-[10px] tracking-widest py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                            !apiKey 
                            ? 'bg-[#9df01c] text-black hover:bg-[#8ce015] shadow-lg shadow-[#9df01c]/10' 
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                        }`}
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
                            {apiKey 
                                ? 'Click "Add Playlist" above to connect your first YouTube playlist and begin importing videos automatically to your communities.'
                                : 'Please configure your API Key in the settings first to unlock the ability to add playlists.'
                            }
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
                                            {formatDate(playlist.last_update)}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Playlist Manager
                                </label>
                                <div className="flex items-center justify-between bg-[#111] border border-white/5 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {unaData?.user?.avatar ? (
                                            <img src={unaData.user.avatar} alt={unaData.user.name || 'Admin'} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                                {unaData?.user?.name ? unaData.user.name.charAt(0).toUpperCase() : 'A'}
                                            </div>
                                        )}
                                        <span className="text-sm font-bold text-white">{unaData?.user?.name || 'Platform Admin'}</span>
                                    </div>
                                    <RefreshCw size={18} className="text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Playlist Id <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={newPlaylistId}
                                    onChange={handlePlaylistIdChange}
                                    placeholder="PLxxxxxxxxxxxxxxxxxxxx or YouTube URL"
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#9df01c] transition-colors"
                                />
                            </div>

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

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Creator(s) <Users size={12} className="text-[#9df01c]" />
                                </label>
                                
                                <div className="flex flex-wrap gap-2 min-h-[42px] p-2.5 bg-black border border-white/10 rounded-xl items-center">
                                    {selectedAuthors.map((author, index) => (
                                        <span 
                                            key={author.id || author.profile_id || index} 
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                index === 0 
                                                    ? 'bg-[#9df01c] text-black shadow-md shadow-[#9df01c]/10' 
                                                    : 'bg-white/10 text-white'
                                            }`}
                                        >
                                            {author.avatar ? (
                                                <img src={author.avatar} alt={author.name} className="w-5 h-5 rounded-full object-cover border border-black/20" />
                                            ) : (
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${index === 0 ? 'bg-black text-[#9df01c]' : 'bg-white/20 text-white'}`}>
                                                    {author.name ? author.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            
                                            {author.name || author.email}
                                            
                                            {index === 0 && <span className="text-[9px] uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded ml-1 font-black">Primary</span>}
                                            
                                            <button 
                                                type="button"
                                                onClick={() => handleToggleAuthor(author)} 
                                                className="hover:opacity-75 transition-opacity ml-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    {selectedAuthors.length === 0 && (
                                        <span className="text-xs text-gray-500 italic px-2">No creators assigned...</span>
                                    )}
                                </div>

                                <div className="relative mt-2">
                                    <div className="flex items-center bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#9df01c] transition-colors">
                                        <Search size={16} className="text-gray-500 mr-2" />
                                        <input 
                                            type="text" 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search Admin & Creators..."
                                            className="bg-transparent border-none text-white text-sm w-full focus:outline-none"
                                        />
                                        {isSearching && <Loader2 size={16} className="animate-spin text-[#9df01c] ml-2" />}
                                    </div>
                                    
                                    {searchResults.length > 0 && searchQuery.length >= 2 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-[#1a1a1a] p-1 space-y-1 z-10 shadow-2xl">
                                            {searchResults.map(user => {
                                                const isSelected = selectedAuthors.some(a => (a.id === user.id || a.profile_id === user.profile_id));
                                                return (
                                                    <button
                                                        key={user.id || user.profile_id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleToggleAuthor(user);
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                                                            isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {user.avatar ? (
                                                                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col text-left">
                                                                <span className={`text-sm ${isSelected ? 'text-[#9df01c] font-bold' : 'text-white font-medium'}`}>{user.name}</span>
                                                                <span className="text-[10px] text-gray-500">{user.email}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={16} className="text-[#9df01c]" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Note: Please be aware that the first user in the list will be assigned as the primary author of this video.
                                </p>
                            </div>

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
            
            {/* --- MAGIC UNIVERSAL HELP DRAWER (PASSED UNADATA) --- */}
            <HelpDrawer pageName="youtube_sync_dash" session={session} unaData={unaData} />
        </div>
    );
}