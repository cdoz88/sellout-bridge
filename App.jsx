import React, { useState, useEffect } from 'react';
import { Settings, Plus, LogOut, ShieldCheck, Trash2, Loader2, Link2, ExternalLink, AlertCircle, CreditCard, Smartphone, Save, Zap, Key, RefreshCcw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(() => localStorage.getItem('bridge_session') || null);
  const [unaData, setUnaData] = useState(() => {
    const saved = localStorage.getItem('bridge_unadata');
    return saved ? JSON.parse(saved) : { user: null, crowds: [], spaces: [], debug: null };
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('bridge_apikey') || '');
  
  const [mappings, setMappings] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stripe');

  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  
  const UNA_STUDIO_URL = "https://studio.selloutcrowds.com";
  const UNA_AUTH_URL = `${UNA_STUDIO_URL}/modules/?r=oauth2/auth`;
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  // Auto-save local storage items
  useEffect(() => {
    if (session) localStorage.setItem('bridge_session', session);
    else {
      localStorage.removeItem('bridge_session');
      localStorage.removeItem('bridge_unadata'); 
    }
  }, [session]);

  useEffect(() => { localStorage.setItem('bridge_unadata', JSON.stringify(unaData)); }, [unaData]);
  useEffect(() => { localStorage.setItem('bridge_apikey', apiKey); }, [apiKey]);

  // FETCH MAPPINGS & AUTO-SYNC ON LOAD
  useEffect(() => {
    if (session) {
      fetchDatabaseMappings(session);
      // FIX: If they log in and don't have communities loaded, auto-sync them instantly!
      if (unaData.crowds.length === 0 && unaData.spaces.length === 0) {
        syncCommunities(session);
      }
    }
  }, [session]);

  const fetchDatabaseMappings = async (token) => {
    try {
      const res = await fetch('/api/get-mappings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.mappings) setMappings(data.mappings);
    } catch (err) {
      console.error("Failed to load mappings from database.");
    }
  };

  const saveMappingsToDatabase = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mappings })
      });
      
      if (!res.ok) throw new Error("Server rejected the save.");
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save mappings to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) handleCallback(code);
  }, []);

  const handleCallback = async (code) => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectUri = window.location.origin.endsWith('/') ? window.location.origin : `${window.location.origin}/`;
      const res = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri })
      });
      const data = await res.json();
      
      if (data.access_token) {
        setSession(data.access_token);
        fetchUser(data.access_token); 
        // FIX: Auto-sync their communities the exact second they log in
        syncCommunities(data.access_token);
      } else {
        setError(data.error_description || "Authentication failed.");
      }
      window.history.replaceState({}, document.title, "/");
    } catch (err) {
      setError("The Bridge server is not responding.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async (token) => {
    try {
      const res = await fetch('/api/get-user', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setUnaData(prev => ({ ...prev, user: data.user }));
    } catch (err) {
      console.error("Could not load user data");
    }
  };

  const syncCommunities = async (overrideToken) => {
    const activeToken = overrideToken || session;
    if (!activeToken) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/get-communities', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setUnaData(prev => ({
        ...prev,
        crowds: data.crowds || [],
        spaces: data.spaces || []
      }));
    } catch (err) {
      setError("Failed to sync communities from Sellout Crowds.");
    } finally {
      setIsLoading(false);
    }
  };

  const startLogin = () => {
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(origin.endsWith('/') ? origin : `${origin}/`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
  };

  const addMapping = () => setMappings(prev => [...prev, { id: Date.now(), provider: activeTab, productId: '', unaModule: '', unaId: '' }]);
  
  const updateMapping = (id, field, value) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  
  // FIX: Instant Delete - removes from UI and auto-saves to the database immediately
  const removeMapping = async (id) => {
    const newMappings = mappings.filter(m => m.id !== id);
    setMappings(newMappings);
    
    try {
      await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: newMappings })
      });
    } catch (err) {
      console.error("Failed to delete mapping from database permanently.");
    }
  };

  const handleLogout = () => {
    setSession(null);
    setUnaData({ user: null, crowds: [], spaces: [], debug: null });
    setMappings([]);
    setApiKey('');
  };

  const currentTabMappings = mappings.filter(m => m.provider === activeTab);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Processing...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/10 blur-[100px] rounded-full"></div>
          <img src={logoUrl} alt="Sellout Crowds" className="max-w-[200px] mx-auto mb-10 relative z-10" />
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tight">Creator Bridge</h1>
          <p className="text-gray-500 mb-10 text-sm font-medium leading-relaxed">
            Authorized access to your Studio assets. Connect your account to manage subscription mappings.
          </p>
          <button onClick={startLogin} style={{ backgroundColor: brandColor }} className="w-full text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#9df01c]/10 relative z-10">
            Connect Studio Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
      <nav className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#9df01c] flex items-center justify-center text-black">
                <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
                <span className="block font-black uppercase tracking-tighter text-sm italic leading-none">{unaData.user?.name || 'Creator Portal'}</span>
                <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.3em] mt-1 block">Studio Live Sync</span>
            </div>
        </div>
        <button onClick={handleLogout} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-red-500 hover:text-white transition-all text-gray-500">
            <LogOut className="w-5 h-5" />
        </button>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4">Subscription Bridge</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Connect payment plans to your community</p>
          </div>
          <div className="flex bg-[#111] p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('stripe')} className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${activeTab === 'stripe' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-500 hover:text-white'}`}>
              <CreditCard className="w-4 h-4" /> Stripe
            </button>
            <button onClick={() => setActiveTab('paypal')} className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${activeTab === 'paypal' ? 'bg-[#9df01c] text-black shadow-lg shadow-[#9df01c]/20' : 'text-gray-500 hover:text-white'}`}>
              <Smartphone className="w-4 h-4" /> PayPal
            </button>
          </div>
        </div>

        {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase text-[10px] tracking-widest mb-1">Action Required</p>
                <p className="text-xs font-medium opacity-80">{error}</p>
              </div>
            </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#9df01c]/5 blur-[50px] rounded-full"></div>
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2 relative z-10 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 text-[#9df01c]" /> Sync Assets
                </h3>
                <p className="text-[10px] text-gray-500 font-medium mb-6 relative z-10">Pull your latest Spaces and Crowds from Sellout Crowds to begin mapping.</p>
                <button 
                  onClick={() => syncCommunities()}
                  className="w-full bg-[#9df01c] hover:bg-[#8ce015] text-black font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#9df01c]/20 relative z-10">
                  <RefreshCcw className="w-4 h-4" /> Sync My Communities
                </button>
            </div>

            <div className="bg-[#111] rounded-[2rem] border border-[#9df01c]/20 p-8 shadow-2xl shadow-[#9df01c]/5">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-[#9df01c]">Bridge Webhook URL</h3>
              <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6">
                Paste this URL into your {activeTab === 'stripe' ? 'Stripe' : 'PayPal'} Webhooks settings so we know when someone pays.
              </p>
              <div className="bg-black border border-[#9df01c]/30 rounded-xl p-4 flex items-center justify-between group cursor-copy">
                <span className="text-xs font-mono text-gray-300 truncate mr-4">
                  https://bridge.selloutcrowds.com/api/{activeTab}-webhook
                </span>
                <Link2 className="w-4 h-4 text-[#9df01c] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>

          </div>

          <div className="lg:col-span-8">
            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Access Mappings</h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Rule: If they buy [Product], grant access to [Community]</p>
                </div>
                <button onClick={addMapping} className="flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 border border-white/10 font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                  <Plus className="w-4 h-4" /> Add Link
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {currentTabMappings.length === 0 ? (
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                    <Zap className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Active Mappings</p>
                    <p className="text-gray-600 text-[10px] mt-2 font-medium">Click "Add Link" to connect a product to a Crowd or Space.</p>
                  </div>
                ) : (
                  currentTabMappings.map((mapping) => (
                    <div key={mapping.id} className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                      
                      <div className="flex-1 w-full">
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block px-1">{activeTab === 'stripe' ? 'Stripe Product' : 'PayPal Plan'}</label>
                        <select 
                           className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#9df01c]"
                           value={mapping.productId}
                           onChange={(e) => updateMapping(mapping.id, 'productId', e.target.value)}
                        >
                          <option value="">Select Product...</option>
                          <option value="prod_mock1">Standard Membership</option>
                          <option value="prod_mock2">VIP Access Pass</option>
                        </select>
                      </div>

                      <div className="md:pt-5 hidden md:block">
                        <Zap className="w-5 h-5 text-[#9df01c]" />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block px-1">Grant Access To</label>
                        <select 
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#9df01c]"
                          value={mapping.unaId ? `${mapping.unaModule}_${mapping.unaId}` : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              updateMapping(mapping.id, 'unaModule', '');
                              updateMapping(mapping.id, 'unaId', '');
                            } else {
                              const lastUnderscore = val.lastIndexOf('_');
                              const module = val.substring(0, lastUnderscore);
                              const id = val.substring(lastUnderscore + 1);
                              updateMapping(mapping.id, 'unaModule', module);
                              updateMapping(mapping.id, 'unaId', id);
                            }
                          }}
                        >
                          <option value="">Select Crowd/Space...</option>
                          {unaData.crowds.length > 0 && (
                            <optgroup label="Crowds" className="text-gray-500 font-black bg-black">
                              {unaData.crowds.map(c => <option key={`bx_spaces_${c.id}`} value={`bx_spaces_${c.id}`} className="text-white font-medium">{c.title}</option>)}
                            </optgroup>
                          )}
                          {unaData.spaces.length > 0 && (
                            <optgroup label="Spaces" className="text-gray-500 font-black bg-black">
                              {unaData.spaces.map(s => <option key={`bx_groups_${s.id}`} value={`bx_groups_${s.id}`} className="text-white font-medium">{s.title}</option>)}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div className="md:pt-5 w-full md:w-auto">
                        <button onClick={() => removeMapping(mapping.id)} className="w-full md:w-auto p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* SAVE CONFIGURATION BUTTON */}
              <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                <button 
                  onClick={saveMappingsToDatabase}
                  disabled={isSaving}
                  className={`flex items-center gap-2 font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all ${saveSuccess ? 'bg-green-500 text-black' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saveSuccess ? 'Saved!' : 'Save Configuration'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}