import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Loader2, Trash2, Download, X, Folder } from 'lucide-react';
import HelpDrawer from '../layout/HelpDrawer';

export default function AssetsApp({ session, unaData, activeTab, setActiveTab }) {
    const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
    const isAdmin = unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase());

    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadData, setUploadData] = useState({ title: '', category_id: '', file_url: '' });
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownloadAsset = async (asset) => {
        setDownloadingId(asset.id);
        try {
            // Determine correct file extension
            const urlParts = asset.file_url.split('?')[0].split('.');
            const ext = urlParts.length > 1 ? `.${urlParts.pop()}` : '.png';
            
            // Format a clean filename
            const safeName = (asset.title || 'sc_asset').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${safeName}${ext}`;

            // Try to download via our secure backend proxy to bypass browser CORS
            const proxyUrls = [
                `/api/proxy-image?url=${encodeURIComponent(asset.file_url)}`,
                `https://corsproxy.io/?${encodeURIComponent(asset.file_url)}`,
                `https://api.allorigins.win/raw?url=${encodeURIComponent(asset.file_url)}`
            ];

            let blob = null;
            for (const proxyUrl of proxyUrls) {
                try {
                    const res = await fetch(proxyUrl);
                    if (!res.ok) continue;
                    blob = await res.blob();
                    break;
                } catch(e) {}
            }

            if (!blob) throw new Error('All download proxies failed');

            // Force browser to download the blob as a file
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
        } catch (error) {
            console.error("Secure download failed, falling back to direct open:", error);
            // Absolute fallback: just open it in a new tab
            const link = document.createElement('a');
            link.href = asset.file_url;
            link.target = '_blank';
            link.download = asset.title || 'sc_asset';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => {
        if (session) fetchAssets();
        const handleUpdate = () => fetchAssets();
        window.addEventListener('assets-updated', handleUpdate);
        return () => window.removeEventListener('assets-updated', handleUpdate);
    }, [session]);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`/api/assets/data?t=${Date.now()}`, { 
                headers: { 'Authorization': `Bearer ${session}` },
                cache: 'no-store'
            });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const data = await res.json();
            if (data.assets) setAssets(data.assets);
            if (data.categories) setCategories(data.categories);
            setIsLoading(false);
        } catch (e) {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData(); 
        formData.append('file', file);
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setUploadData({ ...uploadData, file_url: result.url });
            } else alert("Upload failed.");
        } catch (err) { alert("Server unreachable."); } 
        finally { setIsUploading(false); }
    };

    const handleSaveAsset = async () => {
        if (!uploadData.title || !uploadData.file_url || !uploadData.category_id) {
            alert("Please fill out all fields and upload a file.");
            return;
        }

        try {
            await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            setShowUploadModal(false);
            setUploadData({ title: '', category_id: '', file_url: '' });
            fetchAssets();
        } catch(e) {
            alert("Failed to save asset.");
        }
    };

    const handleDeleteAsset = async (id) => {
        if(!window.confirm("Delete this asset?")) return;
        try {
            await fetch('/api/assets/delete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            fetchAssets();
        } catch(e) {}
    };

    if (isLoading) return <div className="p-12 text-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

    const activeCatId = activeTab && activeTab.startsWith('cat_') ? parseInt(activeTab.replace('cat_', '')) : (categories.length > 0 ? categories[0].id : null);
    const activeCategory = categories.find(c => c.id === activeCatId);
    const visibleAssets = assets.filter(a => a.category_id === activeCatId);

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        {activeCategory ? activeCategory.name : 'Brand Kit'}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Download official logos, graphics, and promotional materials.
                    </p>
                </div>
                {isAdmin && categories.length > 0 && (
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button 
                            onClick={() => {
                                setUploadData({ title: '', category_id: activeCatId, file_url: '' });
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
                    <Folder size={48} className="text-gray-600 mb-4 opacity-50" />
                    <p className="text-gray-400 font-bold text-sm">Library Empty</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-2">
                        {isAdmin ? 'Use the sidebar to create your first Folder!' : 'Assets will appear here once added by an administrator.'}
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
                            
                            <button 
                                onClick={() => handleDownloadAsset(asset)}
                                disabled={downloadingId === asset.id}
                                className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloadingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {downloadingId === asset.id ? 'Downloading...' : 'Download'}
                            </button>

                            {isAdmin && (
                                <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-6 right-6 bg-red-500/90 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-xl">
                                    <Trash2 size={14}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-8 flex flex-col shadow-2xl relative">
                        <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-white mb-6">Upload Asset</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Asset Title</label>
                                <input type="text" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} placeholder="e.g. Primary White Logo" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Category</label>
                                <select value={uploadData.category_id} onChange={e => setUploadData({...uploadData, category_id: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#9df01c] outline-none transition-colors appearance-none">
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">File</label>
                                {uploadData.file_url ? (
                                    <div className="bg-black p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3">
                                        <img src={uploadData.file_url} className="max-h-32 object-contain" />
                                        <button onClick={() => setUploadData({...uploadData, file_url: ''})} className="text-[9px] text-red-500 font-bold uppercase tracking-widest">Remove File</button>
                                    </div>
                                ) : (
                                    <label className={`w-full h-32 flex flex-col items-center justify-center gap-2 bg-black border-2 border-dashed border-white/10 hover:border-[#9df01c]/50 hover:bg-[#9df01c]/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? <Loader2 size={24} className="animate-spin text-[#9df01c]"/> : <ImageIcon size={24} className="text-gray-500"/>}
                                        {isUploading ? 'Uploading...' : 'Browse Files'}
                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                )}
                            </div>

                            <button onClick={handleSaveAsset} className="w-full mt-4 py-4 bg-[#9df01c] text-black rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/10">Save to Library</button>
                        </div>
                    </div>
                </div>
            )}
            
            <HelpDrawer pageName="assets" session={session} unaData={unaData} />
        </div>
    );
}