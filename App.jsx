import React, { useState, useEffect } from 'react';
import { Settings, Plus, Link, CheckCircle, AlertCircle, LogOut, ChevronRight, CreditCard, ShieldCheck, Zap, Trash2, Smartphone, Save } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [activeTab, setActiveTab] = useState('stripe'); 
  const [unaApiKey] = useState('K2PKWb8JWe4g99DvtKze!pZu+RC9bYqRyFRa.3a,pvM.VwrC');
  const [isSaving, setIsSaving] = useState(false);

  // Sellout Crowds Official Branding
  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  const markUrl = "https://beasellout.com/wp-content/uploads/2025/04/cropped-Icon.png";

  // Mock Data (These will eventually be pulled live from your api.js)
  const [stripeProducts] = useState([
    { id: 'prod_123', name: 'Inner Circle Monthly' },
    { id: 'prod_456', name: 'VIP Coaching' }
  ]);

  const [paypalProducts] = useState([
    { id: 'PP-789', name: 'Elite Membership Plan' },
    { id: 'PP-000', name: 'Standard Fan Access' }
  ]);

  const [myUnaContexts] = useState([
    { id: 10, name: 'Exclusive Mastermind', type: 'Crowd' },
    { id: 22, name: 'Creator Lounge', type: 'Space' },
    { id: 5, name: 'Gold Member', type: 'Site Level' }
  ]);

  const addMapping = () => {
    setMappings([...mappings, { id: Date.now(), provider: activeTab, productId: '', unaId: '' }]);
  };

  const updateMapping = (id, field, value) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value, ...(field === 'provider' ? { productId: '' } : {}) } : m));
  };

  const removeMapping = (id) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const saveConfiguration = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      const msg = document.createElement('div');
      msg.className = "fixed bottom-8 right-8 bg-[#9df01c] text-black px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce z-50";
      msg.innerText = "Config Saved Successfully!";
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }, 1000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] shadow-2xl p-10 text-center border border-white/5">
          <div className="mb-10 flex items-center justify-center">
            <img src={logoUrl} alt="Sellout Crowds" className="max-w-[240px] h-auto object-contain" />
          </div>
          <h1 className="text-2xl font-black mb-3 tracking-tight leading-tight">Sellout Crowds Bridge</h1>
          <p className="text-gray-400 mb-10 leading-relaxed px-4 text-sm font-medium">
            Sync your website subscriptions directly to your private community Crowds and Spaces.
          </p>
          <button 
            onClick={() => setIsLoggedIn(true)}
            style={{ backgroundColor: brandColor }}
            className="w-full text-black font-black py-4 px-8 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9df01c]/20 uppercase tracking-wider text-sm"
          >
            Login with Sellout Crowds
          </button>
          <div className="mt-8 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-600" />
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold font-mono">Secure Enterprise Portal</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans pb-20">
      <nav className="bg-[#0a0a0a] border-b border-white/5 px-8 py-5 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-[#111] p-1.5 rounded-xl border border-white/10">
            <img src={markUrl} alt="SC Mark" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <span className="block font-black text-white text-xl tracking-tighter leading-none uppercase">Sellout Crowds Bridge</span>
            <span className="text-[9px] text-[#9df01c] font-black uppercase tracking-[0.3em] mt-1 block font-mono">Automation Engine</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Creator</span>
            <span className="text-white font-bold text-sm">Authorized Portal</span>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="bg-white/5 hover:bg-red-500/10 hover:text-red-500 p-3 rounded-xl transition-all border border-white/5"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        
        {/* Connection Configuration */}
        <section className="bg-[#0a0a0a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-32 h-32 text-[#9df01c]" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-[#9df01c]/10 p-4 rounded-[1.25rem] border border-[#9df01c]/20">
                <Settings style={{ color: brandColor }} className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Configuration</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Connect your payment source</p>
              </div>
            </div>

            <div className="flex bg-black p-1.5 rounded-2xl border border-white/10">
              <button onClick={() => setActiveTab('stripe')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'stripe' ? 'bg-[#1a1a1a] text-[#9df01c] border border-white/5 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>
                <CreditCard className="w-4 h-4" /> Stripe
              </button>
              <button onClick={() => setActiveTab('paypal')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'paypal' ? 'bg-[#1a1a1a] text-[#9df01c] border border-white/5 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>
                <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" className="w-5 h-3 object-contain rounded-sm grayscale brightness-200" alt="PP" /> PayPal
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
                  {activeTab === 'stripe' ? 'Stripe Restricted API Key' : 'PayPal Client ID'}
                </label>
                <input 
                  type="password" 
                  placeholder={activeTab === 'stripe' ? "rk_live_..." : "Access Token..."}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:ring-2 focus:ring-[#9df01c]/30 transition-all font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-600 leading-relaxed font-medium max-w-[70%]">
                  Keys are used to sync product lists and verify payments. 
                </p>
                <button 
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  style={{ backgroundColor: brandColor }}
                  className="flex items-center gap-2 text-black font-black py-2.5 px-6 rounded-xl transition-all hover:scale-[1.05] shadow-lg shadow-[#9df01c]/10 text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Config"}
                </button>
              </div>
            </div>

            <div className="bg-white/[0.02] rounded-[2rem] p-7 border border-white/5 flex items-start gap-5">
              <div className="bg-[#9df01c]/10 p-3 rounded-xl shrink-0 border border-[#9df01c]/20">
                <ShieldCheck style={{ color: brandColor }} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-xs uppercase tracking-widest mb-2">Sellout API Connection</h3>
                <p className="text-[10px] text-gray-500 leading-relaxed font-mono break-all opacity-50">
                  ID: {unaApiKey.substring(0, 15)}...
                </p>
                <p className="text-xs text-gray-500 leading-relaxed font-medium mt-2">
                  Bridge is connected to your community site using your master secret key.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mapping Section */}
        <section className="space-y-8">
          <div className="flex justify-between items-end px-4">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Mapping</h2>
              <p className="text-[#9df01c] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Sync Subscriptions to Community Access</p>
            </div>
            <button 
                onClick={addMapping} 
                style={{ backgroundColor: brandColor }} 
                className="flex items-center gap-2 text-black font-black py-2.5 px-5 rounded-xl transition-all hover:scale-[1.05] shadow-xl shadow-[#9df01c]/10 text-[11px] uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> New Mapping
            </button>
          </div>

          <div className="hidden lg:grid grid-cols-12 px-10 mb-2 gap-8">
            <div className="col-span-3 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">1. Payment Processor</div>
            <div className="col-span-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">2. Product Selection</div>
            <div className="col-span-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">3. Community Access</div>
          </div>

          <div className="space-y-4">
            {mappings.length === 0 ? (
              <div className="bg-[#0a0a0a] border-2 border-dashed border-white/5 rounded-[3rem] py-24 text-center">
                <Smartphone className="text-gray-700 w-10 h-10 mx-auto mb-6" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm italic">No Active Mappings</p>
                <p className="text-gray-700 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Click "New Mapping" to start connecting your Crowds</p>
              </div>
            ) : (
              mappings.map((m) => (
                <div key={m.id} className="bg-[#0a0a0a] rounded-[2rem] p-6 lg:p-8 border border-white/5 shadow-2xl grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 group animate-in fade-in slide-in-from-bottom-4">
                  <div className="col-span-1 lg:col-span-3">
                    <select value={m.provider} onChange={(e) => updateMapping(m.id, 'provider', e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#9df01c]/30 font-bold text-sm appearance-none cursor-pointer shadow-inner">
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>
                  <div className="col-span-1 lg:col-span-4">
                    <select value={m.productId} onChange={(e) => updateMapping(m.id, 'productId', e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#9df01c]/30 font-bold text-sm appearance-none cursor-pointer shadow-inner">
                      <option value="">Choose {m.provider === 'stripe' ? 'Stripe' : 'PayPal'} product...</option>
                      {(m.provider === 'stripe' ? stripeProducts : paypalProducts).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 lg:col-span-4">
                    <select value={m.unaId} onChange={(e) => updateMapping(m.id, 'unaId', e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#9df01c]/30 font-bold text-sm appearance-none cursor-pointer shadow-inner">
                      <option value="">Grant access to Crowd/Space...</option>
                      {myUnaContexts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeMapping(m.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-4 rounded-2xl transition-all border border-red-500/20 group"><Trash2 className="w-5 h-5 transition-transform group-hover:scale-110" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto p-12 border-t border-white/5 mt-16 text-center">
        <div className="flex items-center justify-center gap-4 mb-4 grayscale opacity-20">
          <img src={markUrl} alt="SC" className="w-6 h-6" />
          <span className="font-black tracking-tighter uppercase italic">Sellout Crowds</span>
        </div>
        <p className="text-gray-700 text-[10px] uppercase tracking-[0.4em] font-black">
          Official Integration Engine &copy; 2026
        </p>
      </footer>
    </div>
  );
}