import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Loader2, Trash2, Download } from 'lucide-react';

export default function AssetsApp({ session, unaData, activeTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadData, setUploadData] = useState({ title: '', category_id: '', file_url: '' });

    const fetchAssets = async () => {
        try {
            const res = await fetch('/api/assets/data', { headers: { 'Authorization': `Bearer ${session}` } });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.assets) setAssets(data.assets);
            if (data.categories) setCategories(data.categories);
            setIsLoading(false);
        } catch (e) {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchAssets();
        
        const handleUpdate = () => fetchAssets();
        window.addEventListener('assets-updated', handleUpdate);
        return () => window.removeEventListener('assets-updated', handleUpdate);
    }, [session]);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(true);
        const formData = new FormData(); 
        formData.append('file', file);
        
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setUploadData(prev => ({ ...prev, file_url: result.url }));
            } else {
                alert("Upload failed.");
            }
        } catch (err) { 
            alert("Image server unreachable."); 
        } finally { 
            setIsUploading(false); 
        }
    };

    const handleSaveAsset = async () => {
        if (!uploadData.title || !uploadData.category_id || !uploadData.file_url) {
            alert("Please fill out all fields and wait for the upload to finish.");
            return;
        }
        setIsUploading(true);
        try {
            await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            setShowUploadModal(false);
            setUploadData({ title: '', category_id: '', file_url: '' });
            fetchAssets();
        } catch(e) {}
        finally { setIsUploading(false); }
    };

    const handleDeleteAsset = async (id) => {
        if(!window.confirm("Are you sure you want to delete this asset globally?")) return;
        try {
            await fetch('/api/assets/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            fetchAssets();
        } catch(e) {}
    };

    const activeCatId = activeTab ? parseInt(activeTab.replace('cat_', '')) : null;
    const activeCategory = categories.find(c => c.id === activeCatId);
    const visibleAssets = assets.filter(a => a.category_id === activeCatId);

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        {activeCategory ? activeCategory.name : 'SC Brand Assets'}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Download official logos, graphics, and promotional materials.
                    </p>
                </div>
                
                {isAdmin && (
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button 
                            onClick={() => {
                                setUploadData({ title: '', category_id: activeCatId || '', file_url: '' });
                                setShowUploadModal(true);
                            }}
                            className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                            <Plus size={14} /> <span className="hidden sm:inline">Upload Asset</span>
                        </button>
                    </div>
                )}
            </div>

            {categories.length === 0 ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                    <ImageIcon size={48} className="text-gray-600 mb-4 opacity-50" />
                    <p className="text-gray-400 font-bold text-sm">Asset Library Empty</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-2">
                        {isAdmin ? 'Use the sidebar to create your first Category!' : 'Assets will appear here once uploaded by an administrator.'}
                    </p>
                </div>
            ) : visibleAssets.length === 0 ? (
                <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                    <ImageIcon size={48} className="text-gray-600 mb-4 opacity-30" />
                    <p className="text-gray-400 font-bold text-sm">No assets in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {visibleAssets.map(asset => (
                        <div key={asset.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col group relative hover:border-white/20 transition-colors">
                            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-white/5 flex items-center justify-center p-2">
                                <img src={asset.file_url} className="max-w-full max-h-full object-contain" alt={asset.title} />
                            </div>
                            <p className="text-sm font-bold text-white truncate mb-4 px-1">{asset.title}</p>
                            
                            <a href={asset.file_url} download target="_blank" rel="noreferrer" className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                <Download size={14} /> Download
                            </a>

                            {isAdmin && (
                                <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-6 right-6 bg-red-500/90 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-xl">
                                    <Trash2 size={14}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ADMIN UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative">
                        <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20}/></button>
                        
                        <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6">Upload Asset</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Asset Title</label>
                                <input type="text" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} placeholder="e.g. Primary Logo (Dark)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Category</label>
                                <select value={uploadData.category_id} onChange={e => setUploadData({...uploadData, category_id: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#9df01c] outline-none transition-colors">
                                    <option value="" disabled>Select Category...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">File</label>
                                <div className="w-full aspect-video bg-black border border-dashed border-white/10 rounded-xl flex items-center justify-center mb-2 overflow-hidden relative">
                                    {uploadData.file_url ? (
                                        <img src={uploadData.file_url} className="max-w-full max-h-full object-contain p-2" alt="Preview" />
                                    ) : (
                                        <ImageIcon size={32} className="text-gray-600 opacity-50" />
                                    )}
                                    {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#9df01c] animate-spin"/></div>}
                                </div>
                                <label className={`w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2 border border-white/10 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Select File
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveAsset} 
                            disabled={isUploading || !uploadData.title || !uploadData.category_id || !uploadData.file_url}
                            className={`w-full py-3.5 rounded-xl font-black uppercase text-[11px] tracking-widest mt-8 transition-colors ${(!uploadData.title || !uploadData.category_id || !uploadData.file_url) ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                            Publish Asset
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}