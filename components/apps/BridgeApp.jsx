import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Link2, AlertCircle, Save, Zap, RefreshCcw, CheckCircle2, X, UserX, UserCheck, UploadCloud, MonitorSmartphone } from 'lucide-react';

export default function BridgeApp({ session, unaData, activeTab }) {
  const [apiKey, setApiKey] = useState(''); 
  const [mappings, setMappings] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const [providerProducts, setProviderProducts] = useState({ stripe: [], paypal: [], patreon: [] });
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState(false);

  const [isSyncingSubs, setIsSyncingSubs] = useState(false);
  const [syncSubsResult, setSyncSubsResult] = useState(null);

  const [audienceStats, setAudienceStats] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [modalData, setModalData] = useState(null); 
  const [processingUser, setProcessingUser] = useState(null); 

  const [patreonUsers, setPatreonUsers] = useState([]);
  const [error, setError] = useState(null);

  const stripeIcon = "https://beasellout.com/wp-content/uploads/2026/03/Stripe-logo.webp";
  const paypalIcon = "https://beasellout.com/wp-content/uploads/2026/03/paypal-icon.webp";
  const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

  useEffect(() => {
    if (session) {
      fetchDatabaseMappings(session);
      fetchDatabaseSettings(session);
    }
  }, [session]);

  const fetchDatabaseSettings = async (token) => {
    try {
      const res = await fetch('/api/get-settings', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.settings && data.settings.stripe_secret_key) {
        setApiKey(data.settings.stripe_secret_key);
        fetchProviderProducts(data.settings.stripe_secret_key, token);
        fetchAudienceStats(token); 
      }
    } catch (err) {
      console.error("Failed to load settings from database.");
    }
  };

  const fetchDatabaseMappings = async (token) => {
    try {
      const res = await fetch('/api/get-mappings', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.mappings) setMappings(data.mappings);
    } catch (err) {
      console.error("Failed to load mappings from database.");
    }
  };

  const fetchProviderProducts = async (keyToTest, overrideToken) => {
    const activeToken = overrideToken || session;
    if (!keyToTest || !activeToken) return;
    
    setIsValidatingKey(true);
    setError(null);
    setKeySuccess(false);

    if (activeTab === 'stripe') {
      try {
        const res = await fetch('/api/get-stripe-products', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToTest })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        setProviderProducts(prev => ({ ...prev, stripe: data.products }));
        setKeySuccess(true);
        setTimeout(() => setKeySuccess(false), 3000);

        await fetch('/api/save-settings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripeKey: keyToTest })
        });
        fetchAudienceStats(activeToken); 
      } catch (err) {
        setError(err.message || "Invalid Stripe Key.");
        setProviderProducts(prev => ({ ...prev, stripe: [] }));
      }
    }
    setIsValidatingKey(false);
  };

  const handlePatreonUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target.result;
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) { setError("CSV file appears to be empty."); return; }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
          const emailIdx = headers.findIndex(h => h.includes('email'));
          const tierIdx = headers.findIndex(h => h.includes('tier'));
          
          if (emailIdx === -1 || tierIdx === -1) {
              setError("Could not find 'Email' and 'Tier' columns. Are you sure this is a Patreon CSV?"); return;
          }

          const parsedUsers = [];
          const uniqueTiers = new Set();

          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
              const cleanRow = row.map(col => col.replace(/^"|"$/g, '').trim());
              const email = cleanRow[emailIdx];
              const tier = cleanRow[tierIdx];
              
              if (email && email.includes('@') && tier) {
                  parsedUsers.push({ email, tier });
                  uniqueTiers.add(tier);
              }
          }
          setPatreonUsers(parsedUsers);
          setProviderProducts(prev => ({ ...prev, patreon: Array.from(uniqueTiers).map(t => ({ id: t, name: t })) }));
          setKeySuccess(true);
          setTimeout(() => setKeySuccess(false), 3000);
          setError(null);
      };
      reader.readAsText(file);
  };

  const fetchAudienceStats = async (overrideToken) => {
    const activeToken = overrideToken || session;
    if (!activeToken) return;
    setIsStatsLoading(true);
    try {
        const res = await fetch('/api/get-subscribers', { headers: { 'Authorization': `Bearer ${activeToken}` } });
        const data = await res.json();
        if (data.stats) {
            setAudienceStats(data.stats);
            setModalData(prev => prev ? data.stats.find(s => s.productId === prev.productId) || prev : null);
        }
    } catch (err) {
        console.error("Failed to load audience stats");
    } finally {
        setIsStatsLoading(false);
    }
  };

  const saveMappingsToDatabase = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      });
      if (!res.ok) throw new Error("Server rejected the save.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (activeTab === 'stripe') fetchAudienceStats(); 
    } catch (err) {
      setError("Failed to save mappings to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  const syncExistingSubscribers = async () => {
    setIsSyncingSubs(true);
    setSyncSubsResult(null);
    setError(null);
    try {
      const res = await fetch('/api/sync-subscribers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync subscribers.");
      setSyncSubsResult({ success: true, text: `Synced ${data.count} Users!` });
      setTimeout(() => setSyncSubsResult(null), 5000);
      fetchAudienceStats(); 
    } catch (err) {
      setError(err.message || "Failed to sync subscribers.");
    } finally {
      setIsSyncingSubs(false);
    }
  };

  const runPatreonImport = async () => {
      setIsSyncingSubs(true);
      setSyncSubsResult(null);
      setError(null);
      try {
          const patreonMappings = mappings.filter(m => m.provider === 'patreon');
          if (patreonMappings.length === 0) throw new Error("Please map at least one Patreon Tier first.");
          const res = await fetch('/api/patreon-import', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ users: patreonUsers, mappings: patreonMappings })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to import Patreon users.");
          setSyncSubsResult({ success: true, text: `Synced! Added ${data.added}, Revoked ${data.revoked}.` });
          setTimeout(() => setSyncSubsResult(null), 5000);
      } catch (err) {
          setError(err.message || "Failed to import Patreon users.");
      } finally {
          setIsSyncingSubs(false);
      }
  };

  const toggleUserAccess = async (email, action) => {
      setProcessingUser(email);
      try {
          await fetch('/api/toggle-user-access', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, productId: modalData.productId, action })
          });
          await fetchAudienceStats(); 
      } catch (err) {
          console.error("Failed to toggle access.");
      } finally {
          setProcessingUser(null);
      }
  };

  const addMapping = () => setMappings(prev => [...prev, { id: Date.now(), provider: activeTab, productId: '', unaModule: '', unaId: '' }]);
  const updateMapping = (id, field, value) => setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  
  const removeMapping = async (id) => {
    const newMappings = mappings.filter(m => m.id !== id);
    setMappings(newMappings);
    try {
      await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: newMappings })
      });
      if (activeTab === 'stripe') fetchAudienceStats(); 
    } catch (err) {
      console.error("Failed to delete mapping.");
    }
  };

  const copyWebhook = () => {
    const url = `https://bridge.selloutcrowds.com/api/${activeTab}-webhook`;
    navigator.clipboard.writeText(url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const currentTabMappings = mappings.filter(m => m.provider === activeTab);

  return (
    <>
      {/* MOBILE LOCKOUT SCREEN */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-[#050505]">
          <MonitorSmartphone size={48} className="text-gray-600 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Desktop Required</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs">
              The Subscription Bridge requires mapping configurations and CSV uploads that are best handled on a desktop computer.
          </p>
      </div>

      {/* DESKTOP APP */}
      <div className="hidden lg:block max-w-7xl mx-auto py-12 px-8">
          {activeTab === 'patreon' && (
            <div className="mb-8 p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400 text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase text-[10px] tracking-widest mb-1">Manual Migration Tool</p>
                <p className="text-xs font-medium opacity-90 leading-relaxed">
                  Patreon restricts automatic syncing, meaning you must regularly upload a new CSV to add new patrons and automatically remove canceled ones. <strong>We highly recommend fully migrating your subscribers directly to Sellout Crowds</strong> to automate your community and avoid Patreon's high fees!
                </p>
              </div>
            </div>
          )}

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
              
              {activeTab === 'patreon' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                    <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                    Upload CSV
                  </h3>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">
                        Patreon Audience CSV
                      </label>
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={handlePatreonUpload}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#9df01c] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-[#9df01c]/10 file:text-[#9df01c] hover:file:bg-[#9df01c]/20 file:transition-colors cursor-pointer" 
                      />
                    </div>
                    
                    {keySuccess && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Successfully parsed {patreonUsers.length} users
                      </div>
                    )}

                    <div className="text-[10px] text-gray-500 font-medium leading-relaxed">
                      Upload your Patreon "Relationship Manager" CSV. We will extract your unique Tiers so you can map them!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                    <img src={activeTab === 'stripe' ? stripeIcon : paypalIcon} alt={activeTab} className="w-5 h-5 object-contain" />
                    Provider Setup
                  </h3>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block">
                        {activeTab === 'stripe' ? 'Stripe Secret Key' : 'PayPal Secret Key'}
                      </label>
                      <input 
                        type="password" 
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)} 
                        placeholder={activeTab === 'stripe' ? 'sk_live_... or rk_live_...' : 'Enter Secret Key...'} 
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-[#9df01c] transition-colors text-white" 
                      />
                    </div>
                    <button 
                      onClick={() => fetchProviderProducts(apiKey)}
                      disabled={isValidatingKey || !apiKey}
                      className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${keySuccess ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                      {isValidatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : (keySuccess ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />)}
                      {keySuccess ? 'Connected' : 'Save & Sync Products'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab !== 'patreon' && (
                <div className="bg-[#111] rounded-[2rem] border border-[#9df01c]/20 p-8 shadow-2xl shadow-[#9df01c]/5">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-white relative z-10 flex items-center gap-2">
                    <img src={activeTab === 'stripe' ? stripeIcon : paypalIcon} alt={activeTab} className="w-5 h-5 object-contain" />
                    Bridge Webhook URL
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6">
                    Paste this URL into your {activeTab === 'stripe' ? 'Stripe' : 'PayPal'} Webhooks settings so we know when someone pays.
                  </p>
                  
                  <div 
                    onClick={copyWebhook} 
                    className="bg-black border border-[#9df01c]/30 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-[#9df01c] transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-300 truncate mr-4">
                      https://bridge.selloutcrowds.com/api/{activeTab}-webhook
                    </span>
                    {webhookCopied ? (
                      <span className="text-[#9df01c] text-[10px] font-black uppercase tracking-widest shrink-0">Copied!</span>
                    ) : (
                      <Link2 className="w-4 h-4 text-[#9df01c] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2 relative z-10 flex items-center gap-2 text-white">
                  {activeTab === 'patreon' ? (
                     <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                  ) : (
                     <img src={activeTab === 'stripe' ? stripeIcon : paypalIcon} alt={activeTab} className="w-5 h-5 object-contain" />
                  )}
                  {activeTab === 'patreon' ? 'Import CSV Data' : 'Sync Subscribers'}
                </h3>
                <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6">
                  {activeTab === 'patreon' 
                    ? 'Process your uploaded Patreon CSV. Our Smart Engine will automatically grant access to new patrons and revoke access for canceled ones.'
                    : `Pull in your existing ${activeTab === 'stripe' ? 'Stripe' : 'PayPal'} subscribers and automatically grant them access.`}
                </p>
                
                <button 
                  onClick={activeTab === 'patreon' ? runPatreonImport : syncExistingSubscribers}
                  disabled={isSyncingSubs || (activeTab === 'patreon' && patreonUsers.length === 0)}
                  className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 
                    ${syncSubsResult?.success ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-[#9df01c] hover:text-black text-white'}
                    ${(activeTab === 'patreon' && patreonUsers.length === 0) ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-white' : ''}`}>
                  {isSyncingSubs ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncSubsResult?.success ? <CheckCircle2 className="w-4 h-4" /> : (activeTab === 'patreon' ? <UploadCloud className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />))}
                  {syncSubsResult?.success ? syncSubsResult.text : (activeTab === 'patreon' ? 'Run Smart Import' : 'Sync Existing Users')}
                </button>

                {activeTab !== 'patreon' && audienceStats.filter(stat => stat.isMapped).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Bridged Products</span>
                      {isStatsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    </p>
                    <div className="space-y-2">
                      {audienceStats.filter(stat => stat.isMapped).map(stat => (
                        <div 
                          key={stat.productId} 
                          onClick={() => setModalData(stat)}
                          className="bg-black border border-white/5 hover:border-[#9df01c]/50 rounded-xl p-3 flex justify-between items-center cursor-pointer transition-colors group"
                        >
                          <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{stat.productName}</span>
                          <div className="flex flex-col items-end">
                              <span className="bg-[#9df01c]/10 text-[#9df01c] px-2 py-1 rounded-md text-[10px] font-black">{stat.bridgedCount} Active SC Fans</span>
                              <span className="text-[9px] text-gray-500 font-medium mt-1">{stat.totalCount} Total Stripe Subs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-600 mt-3 text-center italic">Click a product to view subscribers</p>
                  </div>
                )}
              </div>

            </div>

            <div className="lg:col-span-8">
              <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                      {activeTab === 'patreon' ? (
                          <img src={patreonIcon} alt="Patreon" className="w-6 h-6 object-contain" />
                      ) : (
                          <img src={activeTab === 'stripe' ? stripeIcon : paypalIcon} alt={activeTab} className="w-6 h-6 object-contain" />
                      )}
                      Subscription Mappings
                    </h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                      Rule: If they buy [{activeTab === 'patreon' ? 'Tier' : 'Product'}], grant access to [Community]
                    </p>
                  </div>
                  <button onClick={addMapping} className="flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 border border-white/10 font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                    <Plus className="w-4 h-4" /> Add Bridge
                  </button>
                </div>

                <div className="space-y-4 flex-1">
                  {currentTabMappings.length === 0 ? (
                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                      <Zap className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Active Mappings</p>
                      <p className="text-gray-600 text-[10px] mt-2 font-medium">Click "Add Bridge" to connect a product to a Crowd or Space.</p>
                    </div>
                  ) : (
                    currentTabMappings.map((mapping) => (
                      <div key={mapping.id} className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        <div className="flex-1 w-full">
                          <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block px-1">
                            {activeTab === 'stripe' ? 'Stripe Product' : activeTab === 'patreon' ? 'Patreon Tier' : 'PayPal Plan'}
                          </label>
                          
                          <select 
                             className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#9df01c]"
                             value={mapping.productId}
                             onChange={(e) => updateMapping(mapping.id, 'productId', e.target.value)}
                          >
                            <option value="">Select {activeTab === 'patreon' ? 'Tier' : 'Product'}...</option>
                            {providerProducts[activeTab] && providerProducts[activeTab].length > 0 ? (
                              providerProducts[activeTab].map(prod => (
                                  <option key={prod.id} value={prod.id}>{prod.name}</option>
                              ))
                            ) : (
                              <option value="" disabled>
                                  {activeTab === 'patreon' ? 'Upload a CSV first to see Tiers.' : 'No products found. Sync Credentials first.'}
                              </option>
                            )}
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

        {/* --- AUDIENCE MODAL --- */}
        {modalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">{modalData.productName}</h3>
                  <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mt-1">
                    {modalData.bridgedCount} Active on SC / {modalData.totalCount} Total Subs
                  </p>
                </div>
                <button onClick={() => setModalData(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {modalData.users.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm py-8">No active subscribers found for this product.</p>
                ) : (
                    <div className="flex flex-col">
                        <div className="hidden sm:flex justify-between items-center px-4 pb-3 mb-3 border-b border-white/10 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            <div className="flex-1">User</div>
                            <div className="w-32 text-center">SC Status</div>
                            <div className="w-24 text-right">Revoke Access</div>
                        </div>

                        <div className="space-y-3">
                            {modalData.users.map((user, i) => (
                                <div key={i} className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors ${user.isRevoked ? 'bg-red-500/5 border-red-500/20' : 'bg-black border-white/5 hover:border-white/10'}`}>
                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <p className="text-sm font-bold text-white flex items-center gap-2">
                                            <span className="truncate">{user.name}</span>
                                            {user.isRevoked && <UserX className="w-4 h-4 text-red-500 shrink-0" />}
                                            {user.isBridged && <UserCheck className="w-4 h-4 text-[#9df01c] shrink-0" />}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{user.email}</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <div className="w-full sm:w-32 flex justify-center">
                                            <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg text-center w-full
                                                ${user.isBridged ? 'bg-[#9df01c]/10 text-[#9df01c] border border-[#9df01c]/20' : 
                                                  user.isRevoked ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                                  'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                                {user.status}
                                            </span>
                                        </div>

                                        <div className="w-auto sm:w-24 flex justify-end">
                                            {user.isRevoked ? (
                                                <button 
                                                    onClick={() => toggleUserAccess(user.email, 'restore')}
                                                    disabled={processingUser === user.email}
                                                    className="p-1.5 bg-white/5 hover:bg-[#9df01c] hover:text-black text-gray-400 rounded-lg transition-colors group relative"
                                                    title="Restore Access">
                                                    {processingUser === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => toggleUserAccess(user.email, 'revoke')}
                                                    disabled={processingUser === user.email}
                                                    className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 rounded-lg transition-colors group relative"
                                                    title="Revoke Access (Survives Sync)">
                                                    {processingUser === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}