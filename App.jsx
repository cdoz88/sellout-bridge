import React, { useState, useEffect } from 'react';
import { Settings, Plus, LogOut, ShieldCheck, Trash2, Loader2, Link2, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * App.jsx - THE AUTHENTICATED DASHBOARD
 * This version points specifically to the Sellout Crowds Studio 
 * subdomain as required by the OAuth2 Server module.
 */

export default function App() {
  const [session, setSession] = useState(null);
  const [unaData, setUnaData] = useState({ user: null, groups: [], spaces: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  
  // STUDIO CONFIGURATION
  const UNA_STUDIO_URL = "https://studio.selloutcrowds.com";
  const UNA_AUTH_URL = `${UNA_STUDIO_URL}/modules/?r=oauth2/auth`;
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  // STEP 1: Catch the user coming back from Sellout Crowds
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
        setError(data.error_description || "Authentication failed. Check your Client Secret in Vercel.");
      }
      
      // Clear the "code" from the URL bar
      window.history.replaceState({}, document.title, "/");
    } catch (err) {
      setError("The Bridge server is not responding. Ensure api.js is deployed.");
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
      setError("Successfully logged in, but couldn't load your Crowds/Spaces.");
    } finally {
      setIsLoading(false);
    }
  };

  const startLogin = () => {
    const redirectUri = encodeURIComponent(window.location.origin);
    // Construct the full Studio Auth URL
    window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}`;
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Handshaking with Studio...</span>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/10 blur-[100px] rounded-full"></div>
          
          <img src={logoUrl} alt="Sellout Crowds" className="max-w-[200px] mx-auto mb-10 relative z-10" />
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tight">Creator Bridge</h1>
          <p className="text-gray-500 mb-10 text-sm font-medium leading-relaxed">
            Authorized access to your Studio assets. Connect your account to manage subscription mappings.
          </p>
          
          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase text-[10px] tracking-widest mb-1">Connection Error</p>
                <p className="text-xs font-medium opacity-80">{error}</p>
              </div>
            </div>
          )}

          <button 
            onClick={startLogin} 
            style={{ backgroundColor: brandColor }} 
            className="w-full text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#9df01c]/10 relative z-10"
          >
            Connect Studio Account
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-700" />
            <span className="text-[9px] text-gray-700 uppercase tracking-widest font-black">Encrypted OAuth2 Session</span>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#9df01c] selection:text-black">
      <nav className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#9df01c] flex items-center justify-center text-black shadow-lg shadow-[#9df01c]/20">
                <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
                <span className="block font-black uppercase tracking-tighter text-sm italic leading-none">
                    {unaData.user?.name || 'Creator Portal'}
                </span>
                <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.3em] mt-1 block">Studio Live Sync</span>
            </div>
        </div>
        <button 
          onClick={() => setSession(null)} 
          className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-red-500 hover:text-white transition-all text-gray-500"
        >
            <LogOut className="w-5 h-5" />
        </button>
      </nav>

      <main className="max-w-6xl mx-auto py-16 px-8">
        <header className="flex justify-between items-end mb-16">
            <div>
                <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none mb-4">Your Assets</h2>
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#9df01c] animate-pulse"></span>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Connected to studio.selloutcrowds.com</p>
                </div>
            </div>
            <button style={{ backgroundColor: brandColor }} className="flex items-center gap-2 text-black font-black py-3 px-6 rounded-xl text-[11px] uppercase tracking-widest shadow-xl shadow-[#9df01c]/10">
                <Plus className="w-4 h-4" /> New Mapping
            </button>
        </header>

        <div className="grid lg:grid-cols-2 gap-10">
            {/* GROUPS / CROWDS */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Crowds (Groups)</h3>
                </div>
                <div className="grid gap-4">
                    {unaData.groups.length === 0 ? (
                        <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[2.5rem] text-center">
                            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest italic">No Crowds Found</p>
                        </div>
                    ) : (
                        unaData.groups.map(group => (
                            <div key={group.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-[#9df01c]/40 transition-all cursor-pointer">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                                        <Link2 className="text-gray-700 group-hover:text-[#9df01c] w-5 h-5 transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase text-xs tracking-tight">{group.title}</h4>
                                        <p className="text-[9px] text-gray-600 font-mono mt-1 uppercase">ID: {group.id}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                    <Plus className="w-4 h-4 text-[#9df01c]" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SPACES */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <ExternalLink className="w-4 h-4 text-gray-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Spaces</h3>
                </div>
                <div className="grid gap-4">
                    {unaData.spaces.length === 0 ? (
                        <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[2.5rem] text-center">
                            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest italic">No Spaces Found</p>
                        </div>
                    ) : (
                        unaData.spaces.map(space => (
                            <div key={space.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-[#9df01c]/40 transition-all cursor-pointer">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-black rounded-2xl border border-white/10 flex items-center justify-center">
                                        <ExternalLink className="text-gray-700 group-hover:text-[#9df01c] w-5 h-5 transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase text-xs tracking-tight">{space.title}</h4>
                                        <p className="text-[9px] text-gray-600 font-mono mt-1 uppercase">ID: {space.id}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                    <Plus className="w-4 h-4 text-[#9df01c]" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto py-20 px-8 border-t border-white/5 text-center grayscale opacity-20">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-400">Sellout Crowds Automation Engine &copy; 2026</p>
      </footer>
    </div>
  );
}