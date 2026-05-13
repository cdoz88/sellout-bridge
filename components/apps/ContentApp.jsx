import React, { useState, useEffect } from 'react';
import { CalendarClock, Image as ImageIcon, Send, Clock, CheckCircle2, AlertCircle, X, Trash2, UploadCloud, Loader2, Calendar, LayoutList, Lock } from 'lucide-react';

export default function ContentApp({ session, unaData }) {
    const role = Number(unaData?.user?.role) || 1;
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = role === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
    
    // Feature unlocked for Admin(3), Commissioner Exempt(12), Rookie(15), All-Star(16), HOF(17)
    const canAccess = isAdmin || [12, 15, 16, 17].includes(role);

    const [view, setView] = useState('compose'); // 'compose' or 'queue'
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Compose State
    const [content, setContent] = useState('');
    const [selectedCommunity, setSelectedCommunity] = useState(''); // Changed to single string
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    // Default to tomorrow at noon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [publishDate, setPublishDate] = useState(tomorrow.toISOString().split('T')[0]);
    const [publishTime, setPublishTime] = useState('12:00');
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const fetchPosts = async () => {
        if (!session || !canAccess) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/posts', { headers: { 'Authorization': `Bearer ${session}` } });
            const data = await res.json();
            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (e) {
            console.error("Failed to fetch posts:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'queue') {
            fetchPosts();
        } else {
            setIsLoading(false);
        }
    }, [session, canAccess, view]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(true);
        const formData = new FormData(); 
        formData.append('file', file);
        
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setImageUrl(result.url);
            } else {
                alert("Upload failed.");
            }
        } catch (err) { 
            alert("Image server unreachable."); 
        } finally { 
            setIsUploading(false); 
        }
    };

    const handleSchedule = async () => {
        if (!content.trim() && !imageUrl) {
            alert("Your post must include text or an image.");
            return;
        }
        if (!selectedCommunity) {
            alert("Please select a community to post to.");
            return;
        }
        if (!publishDate || !publishTime) {
            alert("Please select a date and time to publish.");
            return;
        }

        setIsSaving(true);
        
        // Combine date and time into a single ISO timestamp
        const combinedDateTime = new Date(`${publishDate}T${publishTime}:00`);

        try {
            const res = await fetch('/api/posts/schedule', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    image_url: imageUrl,
                    target_communities: [selectedCommunity], // Keep as array for backend compatibility
                    publish_time: combinedDateTime.toISOString()
                })
            });

            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setContent('');
                    setImageUrl('');
                    setSelectedCommunity('');
                    setView('queue');
                }, 2000);
            } else {
                alert("Failed to schedule post.");
            }
        } catch (e) {
            alert("Network error.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to cancel and delete this post?")) return;
        
        try {
            const res = await fetch('/api/posts/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) fetchPosts();
        } catch (e) {
            alert("Failed to delete post.");
        }
    };

    const renderCommunityChecklist = () => (
        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-1 bg-black border border-white/10 rounded-xl p-3">
            {(!unaData?.crowds || unaData.crowds.length === 0) && (!unaData?.spaces || unaData.spaces.length === 0) ? (
                <p className="text-xs text-gray-500 italic p-3 text-center border border-dashed border-white/10 rounded-xl">No communities found. Click "Sync Communities" on the Hub dashboard.</p>
            ) : (
                <>
                    {unaData.crowds?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-2 mb-1 px-1 text-left">Crowds</div>}
                    {(unaData?.crowds || []).map(c => {
                        const combinedId = `bx_spaces_${c.id}`;
                        const isSelected = selectedCommunity === combinedId;
                        return (
                            <label key={combinedId} onClick={() => setSelectedCommunity(combinedId)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#9df01c]/10 border-[#9df01c]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'border-[#9df01c]' : 'border-gray-500'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-[#9df01c]"></div>}
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
                        const isSelected = selectedCommunity === combinedId;
                        return (
                            <label key={combinedId} onClick={() => setSelectedCommunity(combinedId)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#38bdf8]/10 border-[#38bdf8]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'border-[#38bdf8]' : 'border-gray-500'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-[#38bdf8]"></div>}
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
    );

    if (!canAccess) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
                <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                    <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Premium Feature</h3>
                    <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                        The Content Scheduler allows you to draft posts and automate their delivery to your crowds and spaces. This feature is exclusively available to premium subscribers.
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
                        <CalendarClock className="text-[#9df01c]" size={36} />
                        Content Scheduler
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Draft and schedule posts to automatically publish to your communities.
                    </p>
                </div>
            </div>

            <div className="flex bg-black p-1 rounded-xl border border-white/10 mb-6 w-full max-w-md mx-auto sm:mx-0">
                <button onClick={() => setView('compose')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${view === 'compose' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>
                    <Send size={14} /> Compose Post
                </button>
                <button onClick={() => setView('queue')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${view === 'queue' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>
                    <LayoutList size={14} /> Queue & History
                </button>
            </div>

            {view === 'compose' ? (
                <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl relative">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-4">Post Content</h3>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows="6" 
                                placeholder="What do you want to share with your community?..." 
                                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-[#9df01c] outline-none transition-colors resize-none custom-scrollbar mb-4"
                            ></textarea>

                            <h3 className="text-sm font-black uppercase tracking-tighter text-white mb-3">Attach Image (Optional)</h3>
                            {imageUrl ? (
                                <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-black flex justify-center p-2 mb-2">
                                    <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-500 text-white rounded-lg transition-colors z-10"><X size={14}/></button>
                                    <img src={imageUrl} className="max-h-48 object-contain rounded-xl" alt="Attached" />
                                </div>
                            ) : (
                                <label className={`w-full h-32 flex flex-col items-center justify-center gap-2 bg-black border-2 border-dashed border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {isUploading ? <Loader2 size={24} className="animate-spin text-[#9df01c]"/> : <ImageIcon size={24} className="text-gray-500"/>}
                                    {isUploading ? 'Uploading Image...' : 'Browse Images'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-6 sm:p-8 shadow-2xl">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-4">Target Community</h3>
                            <div className="mb-6">
                                {renderCommunityChecklist()}
                            </div>

                            <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-4">Schedule Time</h3>
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                        <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors [color-scheme:dark]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Time (Local)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                        <input 
                                            type="time" 
                                            step="300" // Forces 5-minute intervals
                                            value={publishTime} 
                                            onChange={e => setPublishTime(e.target.value)} 
                                            className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors [color-scheme:dark]" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleSchedule} disabled={isSaving || (!content && !imageUrl) || !selectedCommunity} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#9df01c]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-gray-500 disabled:shadow-none">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : (saveSuccess ? <CheckCircle2 size={16} /> : <CalendarClock size={16} />)}
                                {saveSuccess ? 'Post Scheduled!' : 'Schedule Post'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 shadow-2xl min-h-[60vh] animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
                        <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            Post Queue
                        </h3>
                    </div>

                    {posts.length === 0 ? (
                        <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center h-[40vh] flex flex-col items-center justify-center">
                            <CalendarClock size={48} className="text-gray-600 mb-4 opacity-30" />
                            <p className="text-gray-400 font-bold text-sm">Your Queue is Empty</p>
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-2">Go to "Compose Post" to schedule your first update.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map(post => {
                                const isPublished = post.status === 'published';
                                const isFailed = post.status === 'failed';
                                const publishDateObj = new Date(post.publish_time);
                                
                                // Parse community target
                                let comms = [];
                                try { comms = JSON.parse(post.target_communities); } catch(e) {}
                                const isCrowd = comms[0]?.includes('bx_spaces');

                                return (
                                    <div key={post.id} className="bg-black border border-white/10 rounded-2xl p-5 flex flex-col hover:border-white/20 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isPublished ? 'bg-[#9df01c]/10 text-[#9df01c]' : isFailed ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-400'}`}>
                                                {post.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                                                <Clock size={12}/> {publishDateObj.toLocaleDateString()} {publishDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        
                                        {post.image_url && (
                                            <div className="w-full h-32 bg-[#0a0a0a] rounded-xl mb-3 overflow-hidden border border-white/5 flex items-center justify-center p-1">
                                                <img src={post.image_url} alt="Post Attachment" className="max-w-full max-h-full object-cover rounded-lg opacity-80" />
                                            </div>
                                        )}
                                        
                                        <p className="text-sm text-gray-300 mb-4 line-clamp-3 leading-relaxed flex-1">
                                            {post.content || <span className="italic text-gray-600">Image only post</span>}
                                        </p>

                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                Target: <span className={isCrowd ? 'text-[#9df01c]' : 'text-[#38bdf8]'}>{isCrowd ? 'Crowd' : 'Space'}</span>
                                            </span>
                                            
                                            {post.status === 'pending' ? (
                                                <button onClick={() => handleDelete(post.id)} className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors flex items-center justify-center" title="Cancel Post">
                                                    <Trash2 size={14}/>
                                                </button>
                                            ) : (
                                                <span className="text-[9px] text-gray-600 italic">Auto-deletes in 7 days</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}