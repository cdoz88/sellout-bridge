import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, FileText, ChevronDown, Video, Link2, Bold, Italic, Image as ImageIcon, Heading2, Newspaper, FileQuestion, LayoutList, Save, Pencil, Folder, GripVertical } from 'lucide-react';

export default function GuidesApp({ session, unaData, activeTab, setActiveTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    const [guides, setGuides] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeGuide, setActiveGuide] = useState(null);
    const [copied, setCopied] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [editingGuide, setEditingGuide] = useState({
        id: null,
        title: '',
        category_id: '',
        type: 'article', 
        content: ''
    });

    const [draggedFaqIndex, setDraggedFaqIndex] = useState(null);

    const fetchGuides = async () => {
        try {
            const res = await fetch(`/api/guides/data?t=${Date.now()}`, { 
                headers: { 'Authorization': `Bearer ${session}` },
                cache: 'no-store'
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.guides) setGuides(data.guides);
            if (data.categories) setCategories(data.categories);
            setIsLoading(false);
        } catch (e) {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchGuides();
        const handleUpdate = () => fetchGuides();
        window.addEventListener('guides-updated', handleUpdate);
        return () => window.removeEventListener('guides-updated', handleUpdate);
    }, [session]);

    // NEW ROUTING LOGIC: Reads the URL and automatically opens the guide if one is linked!
    useEffect(() => {
        if (activeTab && activeTab.startsWith('guide_')) {
            const gId = parseInt(activeTab.replace('guide_', ''));
            const foundGuide = guides.find(g => g.id === gId);
            if (foundGuide) {
                setActiveGuide(foundGuide);
            } else if (guides.length > 0) {
                setActiveGuide(null);
            }
        } else {
            setActiveGuide(null);
        }
    }, [activeTab, guides]);

    const handleSaveGuide = async () => {
        if (!editingGuide.title || !editingGuide.category_id) {
            alert("Please provide a title and select a category.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...editingGuide,
                content: JSON.stringify(editingGuide.content)
            };

            await fetch('/api/guides', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setShowModal(false);
            fetchGuides();
        } catch(e) {
            alert("Failed to save guide.");
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleDeleteGuide = async (id) => {
        if(!window.confirm("Are you sure you want to delete this guide globally?")) return;
        try {
            await fetch('/api/guides/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            
            if (activeGuide && activeGuide.id === id) {
                setActiveTab(`cat_${activeGuide.category_id}`);
            }
            fetchGuides();
        } catch(e) {}
    };

    const handleEditGuide = (guide) => {
        let safeContent = guide.content;
        if (typeof guide.content === 'string') {
            try { safeContent = JSON.parse(guide.content); } catch(err) {}
        }
        
        setEditingGuide({ ...guide, content: safeContent });
        setShowModal(true);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const insertTag = (prefix, suffix) => {
        const textarea = document.getElementById('article-editor');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editingGuide.content || '';
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);
        
        setEditingGuide({ ...editingGuide, content: before + prefix + selected + suffix + after });
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const handleEditorImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData(); formData.append('file', file);
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                insertTag(`<img src="${result.url}" alt="Guide Image" class="w-full rounded-2xl shadow-xl border border-white/10 my-6" />`, '');
            } else alert("Upload failed.");
        } catch (err) { alert("Image server unreachable."); } 
    };

    const embedVideo = () => {
        const url = window.prompt("Paste YouTube URL:");
        if (!url) return;
        const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
        const ytId = (match && match[2].length === 11) ? match[2] : null;
        if (ytId) {
             insertTag(`<div class="aspect-video w-full my-6 rounded-2xl overflow-hidden shadow-2xl border border-white/10"><iframe src="https://www.youtube.com/embed/${ytId}" class="w-full h-full" frameborder="0" allowfullscreen></iframe></div>`, '');
        } else {
             alert("Invalid YouTube URL. Please use standard youtube.com or youtu.be links.");
        }
    };

    const addFaqItem = () => {
        const currentContent = Array.isArray(editingGuide.content) ? editingGuide.content : [];
        setEditingGuide({ ...editingGuide, content: [...currentContent, { id: Date.now(), q: '', a: '' }] });
    };

    const updateFaqItem = (id, field, value) => {
        setEditingGuide({
            ...editingGuide,
            content: editingGuide.content.map(item => item.id === id ? { ...item, [field]: value } : item)
        });
    };

    const removeFaqItem = (id) => {
        setEditingGuide({
            ...editingGuide,
            content: editingGuide.content.filter(item => item.id !== id)
        });
    };

    const handleFaqDragStart = (e, index) => { setDraggedFaqIndex(index); e.dataTransfer.effectAllowed = 'move'; };
    const handleFaqDragOver = (e, index) => {
        e.preventDefault();
        if (draggedFaqIndex === null || draggedFaqIndex === index) return;
        const newContent = [...editingGuide.content];
        const draggedItem = newContent[draggedFaqIndex];
        newContent.splice(draggedFaqIndex, 1);
        newContent.splice(index, 0, draggedItem);
        setDraggedFaqIndex(index);
        setEditingGuide({ ...editingGuide, content: newContent });
    };
    const handleFaqDragEnd = () => setDraggedFaqIndex(null);

    const activeCatId = activeTab && activeTab.startsWith('cat_') ? parseInt(activeTab.replace('cat_', '')) : null;
    const activeCategory = activeGuide ? categories.find(c => c.id === activeGuide.category_id) : categories.find(c => c.id === activeCatId);
    const visibleGuides = guides.filter(g => g.category_id === activeCatId);

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    const renderActiveGuideContent = () => {
        let parsedContent = activeGuide.content;
        if (typeof activeGuide.content === 'string') {
            try { parsedContent = JSON.parse(activeGuide.content); } catch(e) {}
        }
        
        if (activeGuide.type === 'faq') {
            return (
                <div className="space-y-4">
                    {(Array.isArray(parsedContent) ? parsedContent : []).map((faq, i) => (
                        <details key={faq.id || i} className="group bg-black border border-white/10 rounded-2xl overflow-hidden open:border-[#9df01c]/30 transition-all">
                            <summary className="flex items-center justify-between font-bold text-white p-5 cursor-pointer list-none select-none group-open:bg-white/5">
                                <span>{faq.q}</span>
                                <span className="transition group-open:rotate-180 text-[#9df01c]"><ChevronDown size={18} /></span>
                            </summary>
                            <div className="p-5 pt-2 text-gray-400 text-sm leading-relaxed border-t border-white/5 bg-black/50">
                                {(faq.a || '').split('\n').map((line, j) => <p key={j} className="mb-2 last:mb-0">{line}</p>)}
                            </div>
                        </details>
                    ))}
                </div>
            );
        } else {
            return (
                <div 
                    className="text-gray-300 text-base leading-loose whitespace-pre-wrap font-sans"
                    dangerouslySetInnerHTML={{ __html: typeof parsedContent === 'string' ? parsedContent : (activeGuide.content || '') }}
                />
            );
        }
    };

    // RENDERING LOGIC SEPARATED TO PREVENT HTML BREAKS
    const renderContent = () => {
        if (activeGuide) {
            return (
                <div className="max-w-4xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <button onClick={() => setActiveTab(`cat_${activeGuide.category_id}`)} className="text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors">
                            &larr; Back to {activeCategory?.name || 'Category'}
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <button onClick={handleCopyLink} className="text-gray-500 hover:text-[#9df01c] font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors">
                                <Link2 size={14} /> {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                            {isAdmin && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditGuide(activeGuide); }} className="text-gray-500 hover:text-[#9df01c] font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    <Pencil size={14} /> Edit
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white mb-2">{activeGuide.title}</h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-12">
                        {activeCategory?.name} &bull; {new Date(activeGuide.created_at).toLocaleDateString()}
                    </p>

                    <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-12 shadow-2xl">
                        {renderActiveGuideContent()}
                    </div>
                </div>
            );
        }

        if (activeTab === 'library' || !activeCategory) {
            return (
                <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                                Help Center
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                Browse articles and guides to help you master the platform.
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-3 w-full md:w-auto justify-end">
                                <button 
                                    onClick={() => {
                                        setEditingGuide({ id: null, title: '', category_id: categories.length > 0 ? categories[0].id : '', type: 'article', content: '' });
                                        setShowModal(true);
                                    }}
                                    className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                    <Plus size={14} /> <span className="hidden sm:inline">New Guide</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {categories.length === 0 ? (
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                            <Folder size={48} className="text-gray-600 mb-4 opacity-50" />
                            <p className="text-gray-400 font-bold text-sm">Library Empty</p>
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-2">
                                {isAdmin ? 'Use the sidebar to create your first Category!' : 'Guides will appear here once added by an administrator.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {categories.map(cat => {
                                const guideCount = guides.filter(g => g.category_id === cat.id).length;
                                return (
                                    <button key={cat.id} onClick={() => setActiveTab(`cat_${cat.id}`)} className="bg-[#111] border border-white/5 hover:border-[#9df01c]/50 hover:bg-[#151515] p-6 rounded-3xl text-left transition-all group shadow-lg flex flex-col items-start h-full">
                                        <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#9df01c]/10 transition-all">
                                            <Folder size={28} className="text-[#9df01c]" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-[#9df01c] transition-colors">{cat.name}</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-auto">{guideCount} {guideCount === 1 ? 'Guide' : 'Guides'}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                    <div>
                        <button onClick={() => setActiveTab('library')} className="text-gray-500 hover:text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-4 transition-colors">
                            &larr; Help Center Library
                        </button>
                        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                            {activeCategory.name}
                        </h2>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                            Browse articles and guides to help you master the platform.
                        </p>
                    </div>
                    
                    {isAdmin && (
                        <div className="flex gap-3 w-full md:w-auto justify-end">
                            <button 
                                onClick={() => {
                                    setEditingGuide({ id: null, title: '', category_id: activeCatId || '', type: 'article', content: '' });
                                    setShowModal(true);
                                }}
                                className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                                <Plus size={14} /> <span className="hidden sm:inline">New Guide</span>
                            </button>
                        </div>
                    )}
                </div>

                {visibleGuides.length === 0 ? (
                    <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                        <FileText size={48} className="text-gray-600 mb-4 opacity-30" />
                        <p className="text-gray-400 font-bold text-sm">No guides in this category</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleGuides.map(guide => (
                            <div key={guide.id} className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col group hover:border-[#9df01c]/50 hover:bg-[#151515] transition-all cursor-pointer shadow-lg" onClick={() => setActiveTab(`guide_${guide.id}`)}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center text-[#9df01c] group-hover:scale-110 transition-transform">
                                        {guide.type === 'faq' ? <FileQuestion size={20} /> : <Newspaper size={20} />}
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-black px-2 py-1 rounded-md border border-white/5">{guide.type === 'faq' ? 'FAQ Accordion' : 'Article'}</span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-[#9df01c] transition-colors">{guide.title}</h3>
                                <p className="text-xs text-gray-500 mt-auto pt-4 flex items-center justify-between">
                                    <span>Read Guide &rarr;</span>
                                    
                                    {isAdmin && (
                                        <span className="flex items-center gap-2">
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditGuide(guide); }} className="text-gray-500 hover:text-white transition-colors p-1"><Pencil size={14}/></button>
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteGuide(guide.id); }} className="text-gray-500 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                                        </span>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {renderContent()}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 text-left cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 flex-shrink-0">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">{editingGuide.id ? 'Edit Guide' : 'Create Guide'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6 custom-scrollbar">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Guide Title</label>
                                    <input type="text" value={editingGuide.title} onChange={e => setEditingGuide({...editingGuide, title: e.target.value})} placeholder="e.g. How to connect Stripe" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Category</label>
                                    <select value={editingGuide.category_id} onChange={e => setEditingGuide({...editingGuide, category_id: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#9df01c] outline-none transition-colors appearance-none">
                                        <option value="" disabled>Select Category...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {!editingGuide.id && (
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Content Format</label>
                                    <div className="flex bg-black p-1 rounded-xl border border-white/10">
                                        <button onClick={() => setEditingGuide({...editingGuide, type: 'article', content: ''})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingGuide.type === 'article' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><Newspaper size={16}/> Standard Article</button>
                                        <button onClick={() => setEditingGuide({...editingGuide, type: 'faq', content: []})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingGuide.type === 'faq' ? 'bg-[#222] text-[#9df01c] shadow' : 'text-gray-500 hover:text-white'}`}><LayoutList size={16}/> FAQ Accordion</button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 border-t border-white/5">
                                {editingGuide.type === 'article' ? (
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center justify-between">
                                            <span>Article Content</span>
                                            <span className="text-gray-600 font-normal normal-case tracking-normal">Supports plain text & HTML</span>
                                        </label>
                                        
                                        <div className="border border-white/10 rounded-xl overflow-hidden focus-within:border-[#9df01c] transition-colors">
                                            <div className="bg-black p-2 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
                                                <button title="Bold" onClick={() => insertTag('<b class="text-white">', '</b>')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"><Bold size={16}/></button>
                                                <button title="Italic" onClick={() => insertTag('<i>', '</i>')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"><Italic size={16}/></button>
                                                <button title="Header" onClick={() => insertTag('<h2 class="text-2xl font-bold text-white mt-8 mb-4">', '</h2>')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"><Heading2 size={16}/></button>
                                                <div className="w-px h-6 bg-white/10 mx-2"></div>
                                                <button title="Link" onClick={() => { const url = window.prompt("Enter Link URL:"); if(url) insertTag(`<a href="${url}" target="_blank" class="text-[#9df01c] hover:underline font-medium">`, '</a>'); }} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"><Link2 size={16}/></button>
                                                <label title="Upload Image" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer">
                                                    <ImageIcon size={16}/>
                                                    <input type="file" className="hidden" onChange={handleEditorImageUpload} />
                                                </label>
                                                <button title="Embed YouTube Video" onClick={embedVideo} className="p-2 text-gray-400 hover:text-[#9df01c] hover:bg-white/5 rounded-lg"><Video size={16}/></button>
                                            </div>
                                            
                                            <textarea 
                                                id="article-editor"
                                                rows="12" 
                                                value={editingGuide.content} 
                                                onChange={e => setEditingGuide({...editingGuide, content: e.target.value})} 
                                                className="w-full bg-[#0a0a0a] p-4 text-sm text-gray-300 outline-none font-mono resize-y" 
                                                placeholder="Type your guide content here..." 
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">FAQ Blocks</label>
                                            <button onClick={addFaqItem} className="text-[10px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 hover:bg-[#9df01c]/20 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Plus size={12}/> Add Block</button>
                                        </div>

                                        <div className="space-y-4">
                                            {(Array.isArray(editingGuide.content) ? editingGuide.content : []).map((faq, index) => (
                                                <div key={faq.id} draggable onDragStart={(e) => handleFaqDragStart(e, index)} onDragOver={(e) => handleFaqDragOver(e, index)} onDragEnd={handleFaqDragEnd} className={`bg-black border border-white/10 rounded-xl p-4 flex gap-3 transition-colors ${draggedFaqIndex === index ? 'opacity-50 border-[#9df01c]' : ''}`}>
                                                    <div className="text-gray-600 cursor-grab hover:text-white mt-3 flex-shrink-0"><GripVertical size={16} /></div>
                                                    <div className="flex-1 space-y-3">
                                                        <input type="text" value={faq.q} onChange={e => updateFaqItem(faq.id, 'q', e.target.value)} placeholder="Question or Header text" className="w-full bg-transparent border-b border-white/10 pb-2 text-sm font-bold text-white focus:border-[#9df01c] outline-none transition-colors" />
                                                        <textarea rows="2" value={faq.a} onChange={e => updateFaqItem(faq.id, 'a', e.target.value)} placeholder="Answer or content block..." className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-xs text-gray-300 focus:border-[#9df01c] outline-none transition-colors" />
                                                    </div>
                                                    <button onClick={() => removeFaqItem(faq.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2 h-fit flex-shrink-0"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                            {(Array.isArray(editingGuide.content) ? editingGuide.content : []).length === 0 && (
                                                <div className="p-8 text-center text-gray-500 border border-dashed border-white/10 rounded-xl text-xs">No FAQ blocks added. Click "Add Block" above.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="p-6 border-t border-white/5 flex-shrink-0 flex justify-end gap-3 bg-[#0a0a0a] rounded-b-[2rem]">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors">Cancel</button>
                            <button onClick={handleSaveGuide} disabled={isSaving} className="px-8 py-3 bg-[#9df01c] hover:bg-[#8ce015] text-black rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/10">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isSaving ? 'Saving...' : 'Publish Guide'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}