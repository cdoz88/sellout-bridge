import React, { useState, useEffect } from 'react';
import { Settings, Plus, LogOut, ShieldCheck, Trash2, Loader2, Link2, ExternalLink } from 'lucide-react';

/**
 * App.jsx - THE FINAL AUTHENTICATED DASHBOARD
 * This file uses your UNA OAuth2 credentials to log you in
 * and pull your real Crowds and Spaces.
 */

export default function App() {
  const [session, setSession] = useState(null);
  const [unaData, setUnaData] = useState({ user: null, groups: [], spaces: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  const unaAuthUrl = "https://selloutcrowds.com/modules/?r=oauth2/auth";
  
  // YOUR UNA CLIENT INFO FROM SCREENSHOT
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  // 1. CHECK FOR RETURN FROM LOGIN REDIRECT
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleCallback(code);
    }
  }, []);

  const handleCallback = async (code) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            code, 
            redirect_uri: window.location.origin 
        })
      });
      const data = await res.json();
      
      if (data.access_token) {
        setSession(data.access_token);
        fetchAssets(data.access_token);
      } else {
        setError("Could not retrieve access token.");
      }
      
      // Clean the URL so the "code" isn't visible anymore
      window.history.replaceState({}, document.title, "/");
    } catch (err) {
      setError("Connection to bridge failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssets = async (token) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/get-una-assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUnaData(data);
    } catch (err) {
      setError("Failed to load your Crowds and Spaces.");
    } finally {
      setIsLoading(false);
    }
  };

  const startLogin = () => {
    // This sends the user to the UNA login screen
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `${unaAuthUrl}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-black uppercase tracking-widest text-xs">Syncing with Sellout Crowds...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl">
          <img src={logoUrl} alt="Logo" className="max-w-[200px] mx-auto mb-10" />
          <h1 className="text-white text-2xl font-black mb-4 uppercase tracking-tight">Creator Bridge</h1>
          <p className="text-gray-500 mb-10 text-sm font-medium">Log in with your community account to link your Stripe products to your Crowds.</p>
          
          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">{error}</div>}

          <button 
            onClick={startLogin} 
            style={{ backgroundColor: brandColor }} 
            className="w-full text-black font-black py-4 rounded-2xl uppercase text-xs tracking-[0.2em] hover:scale-[1.02] transition-all shadow-lg shadow-[#9df01c]/10"
          >
            Connect My Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <nav className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a] sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#9df01c] flex items-center justify-center text-black font-black text-sm">
                {unaData.user?.name?.charAt(0) || 'U'}
            </div>
            <div>
                <span className="block font-black uppercase tracking-tighter text-sm italic">Welcome, {unaData.user?.name || 'Creator'}</span>
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Authorized Portal</span>
            </div>
        </div>
        <button onClick={() => setSession(null)} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
        </button>
      </nav>

      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="flex justify-between items-end mb-12">
            <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Your Assets</h2>
                <p className="text-[#9df01c] text-[10px] font-black uppercase tracking-[0.3em] mt-3">Ready for Mapping</p>
            </div>
            <div className="flex items-center gap-2 bg-[#9df01c]/10 px-4 py-2 rounded-full border border-[#9df01c]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#9df01c] animate-pulse"></div>
                <span className="text-[#9df01c] text-[9px] font-black uppercase tracking-widest">Live API Sync</span>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            {/* Crowds List */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Crowds (Groups)</h3>
                {unaData.groups.length === 0 ? (
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2rem] text-center text-gray-700 text-[10px] font-black uppercase tracking-widest">No Crowds Created</div>
                ) : (
                    unaData.groups.map(group => (
                        <div key={group.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-[#9df01c]/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black rounded-xl border border-white/10 flex items-center justify-center">
                                    <Link2 className="text-gray-600 group-hover:text-[#9df01c] w-4 h-4 transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-xs">{group.title}</h4>
                                    <p className="text-[9px] text-gray-600 uppercase font-mono mt-1">ID: {group.id}</p>
                                </div>
                            </div>
                            <button className="bg-white/5 p-2 rounded-lg hover:bg-[#9df01c] hover:text-black transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Spaces List */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Spaces</h3>
                {unaData.spaces?.length === 0 ? (
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2rem] text-center text-gray-700 text-[10px] font-black uppercase tracking-widest">No Spaces Created</div>
                ) : (
                    unaData.spaces?.map(space => (
                        <div key={space.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-[#9df01c]/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black rounded-xl border border-white/10 flex items-center justify-center">
                                    <ExternalLink className="text-gray-600 group-hover:text-[#9df01c] w-4 h-4 transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-xs">{space.title}</h4>
                                    <p className="text-[9px] text-gray-600 uppercase font-mono mt-1">ID: {space.id}</p>
                                </div>
                            </div>
                            <button className="bg-white/5 p-2 rounded-lg hover:bg-[#9df01c] hover:text-black transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </main>
    </div>
  );
}