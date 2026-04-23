import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Link2, AlertCircle, Save, Zap, RefreshCcw, CheckCircle2, X, UserX, UserCheck, Upload, MonitorSmartphone, UserPlus, Users, Repeat, ArrowRight, LogOut, Lock } from 'lucide-react';

export default function BridgeApp({ session, unaData, activeTab }) {
  const [stripeAccountId, setStripeAccountId] = useState(null); 
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalSecretKey, setPaypalSecretKey] = useState('');
  const [paypalAccountId, setPaypalAccountId] = useState(null); 
  
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
  const [paypalUsers, setPaypalUsers] = useState([]); 
  const [error, setError] = useState(null);

  const [manualUsers, setManualUsers] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [manualCommunities, setManualCommunities] = useState([]); 
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualModalData, setManualModalData] = useState(null);

  const [aliases, setAliases] = useState([]);
  const [aliasOriginal, setAliasOriginal] = useState('');
  const [aliasTarget, setAliasTarget] = useState('');
  const [isAliasSaving, setIsAliasSaving] = useState(false);

  const stripeIcon = "https://beasellout.com/wp-content/uploads/2026/03/Stripe-logo.webp";
  const paypalIcon = "https://beasellout.com/wp-content/uploads/2026/03/paypal-icon.webp";
  const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

  const STRIPE_CLIENT_ID = 'ca_UAUckMTFQOG8rW8CajO6ZOB2mTzVXo42';

  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);

  useEffect(() => {
    if (session) {
      fetchDatabaseMappings(session);
      fetchDatabaseSettings(session);
      fetchManualUsers(session);
      fetchAliases(session);
    }
  }, [session, activeTab]);

  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && session && state === 'stripe') {
          setIsLoadingOAuth(true);
          fetch('/api/stripe/oauth/callback', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
          })
          .then(res => res.json())
          .then(data => {
              if (data.success) {
                  setStripeAccountId(data.accountId);
                  fetchProviderProducts(data.accountId, null, session, 'stripe');
              } else {
                  setError(data.error || "Failed to connect Stripe.");
              }
              cleanUrl();
          })
          .catch(() => { setError("Network error during Stripe connection."); cleanUrl(); });
      }
  }, [session]);

  const cleanUrl = () => {
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('code');
      newUrl.searchParams.delete('state');
      window.history.replaceState({}, '', newUrl);
      setIsLoadingOAuth(false);
  };

  const fetchDatabaseSettings = async (token) => {
    try {
      const res = await fetch('/api/get-settings', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
      const data = await res.json();
      if (data.settings) {
        if (data.settings.stripe_account_id) {
            setStripeAccountId(data.settings.stripe_account_id);
            fetchProviderProducts(data.settings.stripe_account_id, null, token, 'stripe');
            fetchAudienceStats(token); 
        }
        if (data.settings.paypal_client_id) {
            setPaypalClientId('••••••••••••••••');
            setPaypalSecretKey('••••••••••••••••');
            setPaypalAccountId(`App ID: ...${data.settings.paypal_client_id.slice(-6)}`);
            fetchProviderProducts(null, null, token, 'paypal');
        }
      }
    } catch (err) { console.error("Failed to load settings."); }
  };

  const fetchDatabaseMappings = async (token) => {
    try {
      const res = await fetch('/api/get-mappings', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
      const data = await res.json();
      if (data.mappings) setMappings(data.mappings);
    } catch (err) { console.error("Failed to load mappings."); }
  };

  const fetchManualUsers = async (token = session) => {
      if (!token) return;
      try {
          const res = await fetch('/api/get-manual-users', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (data.users) {
              setManualUsers(data.users);
          }
      } catch (err) { console.error("Failed to load manual users."); }
  };

  const fetchAliases = async (token = session) => {
      if (!token) return;
      try {
          const res = await fetch('/api/get-aliases', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (data.aliases) setAliases(data.aliases);
      } catch (err) {}
  };

  const fetchProviderProducts = async (clientId, secretKey, overrideToken, provider = activeTab) => {
    const activeToken = overrideToken || session;
    if (!activeToken || ['manual', 'aliases', 'patreon', 'team'].includes(provider)) return;

    const isNewKeys = clientId && clientId !== '••••••••••••••••';
    if (isNewKeys) {
        setIsValidatingKey(true);
        setError(null);
        setKeySuccess(false);
    }

    try {
        const endpoint = provider === 'stripe' ? '/api/get-stripe-products' : '/api/get-paypal-products';
        const payload = provider === 'stripe' ? { accountId: clientId } : { }; 

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
        
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        setProviderProducts(prev => ({ ...prev, [provider]: data.products || [] }));

        if (provider === 'stripe') {
            fetchAudienceStats(activeToken);
        }
    } catch (err) {
        setError(err.message || `Failed to fetch ${provider} products.`);
        setProviderProducts(prev => ({ ...prev, [provider]: [] }));
    } finally {
        if (isNewKeys) setIsValidatingKey(false);
    }
  };

  const startStripeOAuth = () => {
      const redirectUri = encodeURIComponent(window.location.origin + '/?app=bridge&tab=stripe');
      window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${redirectUri}&state=stripe`;
  };

  const handleDisconnectStripe = async () => {
      if(!window.confirm("Are you sure you want to disconnect your Stripe account? Active subscriptions will stop syncing.")) return;
      try {
          await fetch('/api/stripe/oauth/disconnect', { method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' }});
          setStripeAccountId(null);
          setProviderProducts(prev => ({...prev, stripe: []}));
          setAudienceStats([]);
      } catch (e) { setError("Failed to disconnect Stripe."); }
  };

  const handleSavePaypalKeys = async () => {
      setIsValidatingKey(true);
      setError(null);
      setKeySuccess(false);

      try {
          const res = await fetch('/api/save-paypal-keys', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: paypalClientId, secretKey: paypalSecretKey })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (data.success) {
              setPaypalAccountId(`App ID: ...${data.accountId.slice(-6)}`);
              setKeySuccess(true);
              setTimeout(() => setKeySuccess(false), 3000);
              fetchProviderProducts(null, null, session, 'paypal');
          } else {
              setError(data.error || "Failed to validate PayPal keys.");
          }
      } catch (err) {
          setError("Network error while syncing PayPal.");
      } finally {
          setIsValidatingKey(false);
      }
  };

  const handleDisconnectPaypal = async () => {
      if(!window.confirm("Are you sure you want to disconnect your PayPal account? Active subscriptions will stop syncing.")) return;
      try {
          await fetch('/api/paypal/oauth/disconnect', { method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' }});
          setPaypalAccountId(null);
          setPaypalClientId('');
          setPaypalSecretKey('');
          setProviderProducts(prev => ({...prev, paypal: []}));
      } catch (e) { setError("Failed to disconnect PayPal."); }
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
          setProviderProducts(prev => ({ ...prev, patreon: [...uniqueTiers].map(t => ({ id: t, name: t })) }));
          setError(null);
      };
      reader.readAsText(file);
  };

  const handlePaypalUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target.result;
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) { setError("CSV file appears to be empty."); return; }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
          
          const emailIdx = headers.findIndex(h => h.includes('email'));
          const planIdx = headers.findIndex(h => h.includes('item name') || h.includes('plan') || h.includes('subscription'));
          
          if (emailIdx === -1 || planIdx === -1) {
              setError("Could not find 'Email' and 'Plan/Item' columns. Are you sure this is a PayPal Subscription CSV?"); return;
          }

          const parsedUsers = [];
          const uniquePlans = new Set();

          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
              const cleanRow = row.map(col => col.replace(/^"|"$/g, '').trim());
              const email = cleanRow[emailIdx];
              const plan = cleanRow[planIdx];
              
              if (email && plan && (status === 'active' || status === 'completed')) {
                  parsedUsers.push({ email, plan });
                  uniquePlans.add(plan);
              }
          }
          setPaypalUsers(parsedUsers);
          
          if (providerProducts.paypal.length === 0) {
              setProviderProducts(prev => ({ ...prev, paypal: [...uniquePlans].map(t => ({ id: t, name: t })) }));
          }
          
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
        if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
        const data = await res.json();
        if (data.stats) {
            setAudienceStats(data.stats);
            setModalData(prev => prev ? data.stats.find(s => s.productId === prev.productId) || prev : null);
        }
    } catch (err) {
        console.error("Failed to load stats");
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
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
      if (!res.ok) throw new Error("Server rejected the save.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (activeTab === 'stripe') fetchAudienceStats(); 
    } catch (err) {
      setError("Failed to save mappings.");
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
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeTab })
      });
      
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to sync subscribers.");
      
      if (data.count === 0 && data.debug && data.debug.length > 0) {
          setError(`Sync complete! Some Stripe subscribers haven't created an account on your site yet, so their access is pending. (If they used a different email, use the 'Email to Email' tool!)`);
      } else {
          setSyncSubsResult({ success: true, text: `Successfully Synced ${data.count} SC Users!` });
          setTimeout(() => setSyncSubsResult(null), 5000);
      }
      if (activeTab === 'stripe') fetchAudienceStats(); 
    } catch (err) {
      setError(err.message || "Sync failed.");
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
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
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

  const runPaypalImport = async () => {
      setIsSyncingSubs(true);
      setSyncSubsResult(null);
      setError(null);
      try {
          const ppMappings = mappings.filter(m => m.provider === 'paypal');
          if (ppMappings.length === 0) throw new Error("Please map at least one PayPal Plan first.");
          const res = await fetch('/api/paypal-import', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ users: paypalUsers, mappings: ppMappings })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to import PayPal users.");
          setSyncSubsResult({ success: true, text: `Imported ${data.added} Historic Users!` });
          setTimeout(() => setSyncSubsResult(null), 5000);
      } catch (err) {
          setError(err.message || "Failed to import PayPal users.");
      } finally {
          setIsSyncingSubs(false);
      }
  };

  const toggleUserAccess = async (email, action) => {
      setProcessingUser(email);
      try {
          const res = await fetch('/api/toggle-user-access', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, productId: modalData.productId, action })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          await fetchAudienceStats(); 
      } catch (err) {
          console.error("Failed to toggle access.");
      } finally {
          setProcessingUser(null);
      }
  };

  const toggleManualCommunity = (commId) => {
      setManualSelectedComms(prev => 
          prev.includes(commId) ? prev.filter(c => c !== commId) : [...prev, commId]
      );
  };

  const handleAddManualUser = async () => {
      if (!manualEmail || manualSelectedComms.length === 0) {
          setError("Please enter an email and select at least one community.");
          return;
      }
      setIsAddingManual(true);
      setError(null);
      try {
          const res = await fetch('/api/add-manual-user', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: manualEmail, communities: manualSelectedComms })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          
          const textRaw = await res.text();
          let data = {};
          try { data = textRaw ? JSON.parse(textRaw) : {}; } catch(e) {}
          
          if (res.ok && data.success) {
              setManualEmail('');
              setManualSelectedComms([]);
              fetchManualUsers(); 
              
              if (data.notice) {
                  setError(`Access saved successfully! Note: This user hasn't registered an account on your site yet. Their access will automatically activate once they sign up.`);
              } else {
                  setError(null);
              }
          } else {
              throw new Error(data.error || `Server Error: ${textRaw.substring(0, 100)}`);
          }
      } catch (err) {
          setError(err.message);
      } finally {
          setIsAddingManual(false);
      }
  };

  const handleRemoveManualUser = async (id, email, module, contentId) => {
      try {
          const res = await fetch('/api/remove-manual-user', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, email, unaModule: module, unaId: contentId })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          fetchManualUsers();
      } catch (err) { console.error("Failed to remove manual user."); }
  };

  const handleAddAlias = async () => {
      if (!aliasOriginal || !aliasTarget) {
          setError("Both emails are required.");
          return;
      }
      setIsAliasSaving(true);
      setError(null);
      try {
          const res = await fetch('/api/add-alias', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ originalEmail: aliasOriginal, aliasEmail: aliasTarget })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          
          const textRaw = await res.text();
          let data = {};
          try { data = textRaw ? JSON.parse(textRaw) : {}; } catch(e) {}
          
          if (res.ok && data.success) {
              setAliasOriginal('');
              setAliasTarget('');
              fetchAliases();
              fetchAudienceStats();
          } else {
              throw new Error(data.error || `Server Error: ${textRaw.substring(0, 100)}`);
          }
      } catch (err) {
          setError(err.message);
      } finally {
          setIsAliasSaving(false);
      }
  };

  const handleRemoveAlias = async (id) => {
      try {
          const res = await fetch('/api/remove-alias', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          fetchAliases();
          fetchAudienceStats();
      } catch (err) {
          console.error("Failed to remove alias.");
      }
  };

  const getCommunityName = (mod, id) => {
      if (id === undefined || id === null) {
          return 'Unknown Community';
      }
      if (mod === 'bx_groups') {
          return unaData.spaces?.find(s => s.id === id.toString())?.title || `Space #${id}`;
      } else {
          return unaData.crowds?.find(c => c.id === id.toString())?.title || `Crowd #${id}`;
      }
  };

  const addMapping = () => setMappings(prev => [...prev, { id: `temp_${Date.now()}`, provider: activeTab, productId: '', communities: [] }]);
  
  const updateMapping = (id, field, value) => {
      setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  
  const toggleCommunity = (mappingId, commId) => {
      setMappings(prev => prev.map(m => {
          if (m.id !== mappingId) return m;
          const currentComms = m.communities || [];
          const newComms = currentComms.includes(commId) 
              ? currentComms.filter(c => c !== commId)
              : [...currentComms, commId];
          return { ...m, communities: newComms };
      }));
  };
  
  const removeMapping = async (id) => {
    const newMappings = mappings.filter(m => m.id !== id);
    setMappings(newMappings);
    try {
      const res = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: newMappings })
      });
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
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

  const ADMIN_EMAILS = ['info@ffadvice.com', 'info@fsan.com', 'info@selloutcrowds.com', 'corey@betheremarketing.com'];
  const isAdmin = Number(unaData?.user?.role) === 3 || (unaData?.user?.email && ADMIN_EMAILS.includes(unaData.user.email.toLowerCase()));
  const canAccessManual = isAdmin || [15, 16, 17].includes(Number(unaData?.user?.role));

  const isBlocked = !isAdmin && !(activeTab === 'manual' && canAccessManual);

  if (isBlocked) {
      return (
          <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 text-center animate-in fade-in duration-300 min-h-[70vh] flex flex-col items-center justify-center">
              <div className="bg-[#111] p-10 md:p-16 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden w-full">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/5 blur-[100px] rounded-full pointer-events-none"></div>
                  <Lock size={56} className="text-gray-500 mb-6 relative z-10" />
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Enterprise Feature</h3>
                  <p className="text-sm md:text-base font-medium text-gray-400 mb-8 max-w-lg mx-auto relative z-10 leading-relaxed">
                      Access Control integrations allow creators to bypass standard site commissions. Therefore, these tools are exclusively available to our Enterprise subscribers.
                  </p>
                  <a 
                      href="https://www.selloutcrowds.com/plans" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#9df01c] text-black font-black py-4 px-10 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors shadow-lg shadow-[#9df01c]/20 relative z-10"
                  >
                      Learn More About Enterprise
                  </a>
              </div>
          </div>
      );
  }

  return (
    <>
      {isLoadingOAuth && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <Loader2 className="w-12 h-12 animate-spin text-[#9df01c] mb-4" />
              <p className="text-white font-bold tracking-widest uppercase text-xs">Connecting to Auth Provider...</p>
          </div>
      )}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-[#050505]">
          <MonitorSmartphone size={48} className="text-gray-600 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Desktop Required</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs">
              Access Control requires mapping configurations and CSV uploads that are best handled on a desktop computer.
          </p>
      </div>

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
              <div className="mb-8 p-5 bg-[#1a1a1a] border border-[#9df01c]/30 rounded-2xl text-[#9df01c] text-left flex items-start gap-3 shadow-lg shadow-[#9df01c]/5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9df01c]" />
                <div>
                  <p className="font-black uppercase text-[10px] tracking-widest mb-1 text-white">System Notice</p>
                  <p className="text-xs font-medium opacity-90">{error}</p>
                </div>
              </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              
              {activeTab === 'aliases' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                    <Repeat size={18} className="text-[#9df01c]" />
                    Create Email Alias
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6 text-left">
                    Link a subscriber's payment email to their preferred account email on Sellout Crowds.
                  </p>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                        Original Payment Email
                      </label>
                      <input 
                        list="subscriber-emails" 
                        value={aliasOriginal}
                        onChange={e => setAliasOriginal(e.target.value)}
                        placeholder="Select or type original email..."
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                      />
                      <datalist id="subscriber-emails">
                          {Array.from(new Set(audienceStats.flatMap(s => s.users.map(u => u.email)))).sort().map(email => (
                              <option key={email} value={email} />
                          ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                        Alias Email (Sellout Crowds)
                      </label>
                      <input 
                        type="email" 
                        value={aliasTarget} 
                        onChange={(e) => setAliasTarget(e.target.value)} 
                        placeholder="community@example.com" 
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                      />
                    </div>
                    <button 
                      onClick={handleAddAlias}
                      disabled={isAliasSaving || !aliasOriginal || !aliasTarget}
                      className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${!aliasOriginal || !aliasTarget ? 'opacity-50 cursor-not-allowed bg-white/5 text-white' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                      {isAliasSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      {isAliasSaving ? 'Saving...' : 'Link Emails'}
                    </button>
                    <p className="text-[9px] text-gray-600 mt-3 text-center px-2 font-medium leading-relaxed italic">
                        After saving, click "Sync Existing Users" on your Integration tab to instantly apply it.
                    </p>
                  </div>
                </div>
              ) : activeTab === 'manual' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                    <UserPlus size={18} className="text-[#9df01c]" />
                    Grant Access
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6 text-left">
                    Add your partners or VIPs to your community for free without requiring a payment plan.
                  </p>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                        Email Address
                      </label>
                      <input 
                        type="email" 
                        value={manualEmail} 
                        onChange={(e) => setManualEmail(e.target.value)} 
                        placeholder="vip@example.com" 
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#9df01c] transition-colors text-white" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                        Grant Access To (Select Multiple)
                      </label>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-1 bg-black border border-white/10 rounded-xl p-3">
                          {(!unaData?.crowds || unaData.crowds.length === 0) && (!unaData?.spaces || unaData.spaces.length === 0) ? (
                              <p className="text-xs text-gray-500 italic p-3 text-center border border-dashed border-white/10 rounded-xl">No communities found. Click "Sync Communities" on the left.</p>
                          ) : (
                              <>
                                  {unaData.crowds?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-2 mb-1 px-1 text-left">Crowds</div>}
                                  {unaData.crowds?.map(c => {
                                      const combinedId = `bx_spaces_${c.id}`;
                                      const isSelected = manualSelectedComms.includes(combinedId);
                                      return (
                                          <label key={combinedId} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#9df01c]/10 border-[#9df01c]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#9df01c] border-[#9df01c]' : 'border-gray-500'}`}>
                                                      {isSelected && <CheckCircle2 size={12} className="text-black" />}
                                                  </div>
                                                  <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-gray-300'}`}>{c.title}</span>
                                              </div>
                                              <span className="text-[9px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 px-2 py-0.5 rounded">Crowd</span>
                                          </label>
                                      );
                                  })}

                                  {unaData.spaces?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-3 mb-1 px-1 text-left">Spaces</div>}
                                  {unaData.spaces?.map(s => {
                                      const combinedId = `bx_groups_${s.id}`;
                                      const isSelected = manualSelectedComms.includes(combinedId);
                                      return (
                                          <label key={combinedId} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-[#38bdf8]/10 border-[#38bdf8]/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-gray-500'}`}>
                                                      {isSelected && <CheckCircle2 size={12} className="text-black" />}
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
                    </div>

                    <button 
                      onClick={handleAddManualUser}
                      disabled={isAddingManual || !manualEmail || manualSelectedComms.length === 0}
                      className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${(!manualEmail || manualSelectedComms.length === 0) ? 'opacity-50 cursor-not-allowed bg-white/5 text-white' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                      {isAddingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {isAddingManual ? 'Granting...' : 'Grant Access'}
                    </button>
                  </div>
                </div>
              ) : activeTab === 'patreon' ? (
                <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2 text-white">
                    <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                    Upload CSV
                  </h3>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1">
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

                    <div className="text-[10px] text-gray-500 font-medium leading-relaxed text-left">
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
                    {activeTab === 'stripe' ? (
                        stripeAccountId ? (
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-center">
                                <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
                                <p className="text-sm font-bold text-white mb-1">Stripe Connected!</p>
                                <p className="text-xs text-gray-500 mb-4 break-all">ID: {stripeAccountId}</p>
                                <button onClick={handleDisconnectStripe} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 w-full bg-red-500/10 py-2.5 rounded-lg">
                                    <LogOut size={12} /> Disconnect
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6 text-left">
                                    Connect your Stripe account to automatically map your active products to Sellout Crowds communities.
                                </p>
                                <button 
                                    onClick={startStripeOAuth}
                                    className="w-full font-black py-4 rounded-xl uppercase text-[11px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 bg-[#635BFF] hover:bg-[#7A73FF] text-white shadow-lg shadow-[#635BFF]/20">
                                    Connect with Stripe
                                </button>
                            </div>
                        )
                    ) : (
                        paypalAccountId ? (
                            <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-center">
                                <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
                                <p className="text-sm font-bold text-white mb-1">PayPal API Connected!</p>
                                <p className="text-[10px] text-gray-500 mb-4 truncate" title={paypalAccountId}>{paypalAccountId}</p>
                                <button onClick={handleDisconnectPaypal} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 w-full bg-red-500/10 py-2.5 rounded-lg">
                                    <LogOut size={12} /> Disconnect
                                </button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                        PayPal Client ID
                                    </label>
                                    <input 
                                        type="text" 
                                        value={paypalClientId} 
                                        onChange={(e) => setPaypalClientId(e.target.value)} 
                                        placeholder="Enter Client ID..." 
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-[#9df01c] transition-colors text-white" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                                        PayPal Secret Key
                                    </label>
                                    <input 
                                        type="password" 
                                        value={paypalSecretKey} 
                                        onChange={(e) => setPaypalSecretKey(e.target.value)} 
                                        placeholder="Enter Secret Key..." 
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-[#9df01c] transition-colors text-white" 
                                    />
                                </div>
                                <button 
                                  onClick={handleSavePaypalKeys}
                                  disabled={isValidatingKey || (!paypalClientId || !paypalSecretKey)}
                                  className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 ${keySuccess ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                                  {isValidatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : (keySuccess ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />)}
                                  {keySuccess ? 'Connected' : 'Save & Sync Products'}
                                </button>
                            </>
                        )
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'paypal' && (
                <div className="bg-[#111] rounded-[2rem] border border-[#9df01c]/20 p-8 shadow-2xl shadow-[#9df01c]/5 mt-6 text-left">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-white relative z-10 flex items-center gap-2">
                    <img src={paypalIcon} alt="PayPal" className="w-5 h-5 object-contain" />
                    Bridge Webhook URL
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6">
                    Paste this URL into your PayPal Webhooks settings so we know when someone pays.
                  </p>
                  
                  <div 
                    onClick={copyWebhook} 
                    className="bg-black border border-[#9df01c]/30 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-[#9df01c] transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-300 truncate mr-4">
                      https://bridge.selloutcrowds.com/api/paypal-webhook
                    </span>
                    {webhookCopied ? (
                      <span className="text-[#9df01c] text-[10px] font-black uppercase tracking-widest shrink-0">Copied!</span>
                    ) : (
                      <Link2 className="w-4 h-4 text-[#9df01c] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </div>
              )}

              {['stripe', 'paypal', 'patreon'].includes(activeTab) && (
                  <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 relative overflow-hidden mt-6 text-left">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-2 relative z-10 flex items-center gap-2 text-white">
                      {activeTab === 'patreon' ? (
                         <img src={patreonIcon} alt="Patreon" className="w-5 h-5 object-contain" />
                      ) : activeTab === 'paypal' ? (
                         <img src={paypalIcon} alt="PayPal" className="w-5 h-5 object-contain" />
                      ) : (
                         <img src={stripeIcon} alt="Stripe" className="w-5 h-5 object-contain" />
                      )}
                      {['patreon', 'paypal'].includes(activeTab) ? 'Import CSV Data' : 'Sync Subscribers'}
                    </h3>
                    <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-6 text-left">
                      {activeTab === 'patreon' 
                        ? 'Process your uploaded Patreon CSV. Our Smart Engine will automatically grant access to new patrons and revoke access for canceled ones.'
                        : activeTab === 'paypal'
                        ? 'PayPal does not support automatic bulk syncing. Upload your active PayPal subscriptions CSV to bridge your historic users. Going forward, the Webhook will handle new signups!'
                        : 'Pull in your existing Stripe subscribers and automatically grant them access.'}
                    </p>
                    
                    {['patreon', 'paypal'].includes(activeTab) && (
                      <div className="mb-6">
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">
                          {activeTab === 'patreon' ? 'Patreon Audience CSV' : 'PayPal Subscriptions CSV'}
                        </label>
                        <input 
                          type="file" 
                          accept=".csv"
                          onChange={activeTab === 'patreon' ? handlePatreonUpload : handlePaypalUpload}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#9df01c] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-[#9df01c]/10 file:text-[#9df01c] hover:file:bg-[#9df01c]/20 file:transition-colors cursor-pointer" 
                        />
                      </div>
                    )}

                    {activeTab === 'stripe' && (
                        <button 
                          onClick={syncExistingSubscribers}
                          disabled={isSyncingSubs || !stripeAccountId}
                          className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 
                            ${syncSubsResult?.success ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-[#9df01c] hover:text-black text-white'}
                            ${(!stripeAccountId) ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-white' : ''}`}>
                          {isSyncingSubs ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncSubsResult?.success ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />)}
                          {syncSubsResult?.success ? syncSubsResult.text : 'Sync Existing Users'}
                        </button>
                    )}

                    {['patreon', 'paypal'].includes(activeTab) && (
                        <button 
                          onClick={activeTab === 'patreon' ? runPatreonImport : runPaypalImport}
                          disabled={isSyncingSubs || (activeTab === 'patreon' && patreonUsers.length === 0) || (activeTab === 'paypal' && paypalUsers.length === 0)}
                          className={`w-full font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 mt-2 
                            ${syncSubsResult?.success ? 'bg-green-500 text-black' : 'bg-white/5 hover:bg-[#9df01c] hover:text-black text-white'}
                            ${((activeTab === 'patreon' && patreonUsers.length === 0) || (activeTab === 'paypal' && paypalUsers.length === 0)) ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-white' : ''}`}>
                          {isSyncingSubs ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncSubsResult?.success ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />)}
                          {syncSubsResult?.success ? syncSubsResult.text : 'Run Smart Import'}
                        </button>
                    )}

                    {activeTab === 'stripe' && audienceStats.filter(stat => stat.isMapped).length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-3 flex items-center justify-between px-1">
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
                                  <span className="bg-[#9df01c]/10 text-[#9df01c] px-2 py-1 rounded-md text-[10px] font-black">{stat.bridgedCount} Active on SC</span>
                                  <span className="text-[9px] text-gray-500 font-medium mt-1">{stat.totalCount} Total Stripe Subs</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-600 mt-3 text-center italic">Click a product to view subscribers</p>
                      </div>
                    )}
                  </div>
              )}

            </div>

            <div className="lg:col-span-8">
              <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 min-h-full flex flex-col text-left">
                
                {activeTab === 'aliases' ? (
                  <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                        <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                            <Repeat className="w-6 h-6 text-[#9df01c]" />
                            Active Email Aliases
                          </h3>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                            Mapped emails for active subscriptions
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        {aliases.length === 0 ? (
                          <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                            <Repeat className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Aliases Set</p>
                            <p className="text-gray-600 text-[10px] mt-2 font-medium">Use the form to link a subscriber's payment email to their account email.</p>
                          </div>
                        ) : (
                            aliases.map((alias) => (
                                <div key={alias.id} className="bg-black border border-white/5 p-5 rounded-[1.5rem] flex items-center justify-between group hover:border-[#9df01c]/30 transition-all">
                                  <div className="flex items-center gap-4 flex-1">
                                      <div className="flex-1">
                                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><CreditCard size={10}/> Paying</p>
                                          <p className="font-mono text-sm text-gray-300 truncate">{alias.original_email}</p>
                                      </div>
                                      <ArrowRight size={16} className="text-[#9df01c] mx-2 flex-shrink-0" />
                                      <div className="flex-1">
                                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10}/> Accessing</p>
                                          <p className="font-mono text-sm text-[#9df01c] truncate">{alias.alias_email}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => removeAlias(alias.id)} className="ml-4 text-gray-600 hover:text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-colors">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
                  </>
                ) : activeTab === 'manual' ? (
                  <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                        <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                            <Users className="w-6 h-6 text-[#9df01c]" />
                            Active Manual Members
                          </h3>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                            People who have been manually granted access to your communities.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        {manualUsers.length === 0 ? (
                          <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center h-full flex flex-col justify-center">
                            <UserPlus className="w-8 h-8 text-gray-600 mx-auto mb-4 opacity-50" />
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Manual Users</p>
                            <p className="text-gray-600 text-[10px] mt-2 font-medium">Use the form to grant access to a partner or VIP.</p>
                          </div>
                        ) : (
                            manualUsers.map((user, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setManualModalData(user)} 
                                    className="bg-black border border-white/5 hover:border-[#9df01c]/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 group cursor-pointer transition-colors"
                                >
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <p className="text-sm font-bold text-white group-hover:text-[#9df01c] transition-colors">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="bg-[#9df01c]/10 text-[#9df01c] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#9df01c]/20">
                                            {user.communities?.length || 0} {(user.communities?.length === 1) ? 'Community' : 'Communities'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                      </div>
                  </>
                ) : (
                  <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
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
                            Rule: If they buy [{activeTab === 'patreon' ? 'Tier' : 'Product'}], grant access to [Communities]
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
                            <p className="text-gray-600 text-[10px] mt-2 font-medium">Click "Add Bridge" to connect a {activeTab === 'patreon' ? 'Tier' : 'Product'} to a Crowd or Space.</p>
                          </div>
                        ) : (
                          currentTabMappings.map((mapping) => (
                            <div key={mapping.id} className="bg-black border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                              
                              <div className="flex-1 w-full md:mt-1">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block px-1 text-left">
                                  Payment Product
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
                                          {activeTab === 'patreon' || activeTab === 'paypal' ? 'Upload a CSV or create plans in PayPal first.' : 'No products found. Sync Credentials first.'}
                                      </option>
                                  )}
                                </select>
                              </div>

                              <div className="md:pt-9 hidden md:block">
                                <Zap className="w-5 h-5 text-[#9df01c]" />
                              </div>

                              <div className="flex-[2] w-full bg-[#111] border border-white/10 rounded-xl p-3">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1 text-left">Grant Access To (Select Multiple)</label>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                    
                                    {(!unaData?.crowds || unaData.crowds.length === 0) && (!unaData?.spaces || unaData.spaces.length === 0) ? (
                                        <p className="text-xs text-gray-500 italic p-3 text-center border border-dashed border-white/10 rounded-lg">No communities found. Click "Sync Communities" on the left.</p>
                                    ) : (
                                        <>
                                            {unaData.crowds?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-2 mb-1 px-1 text-left">Crowds</div>}
                                            {unaData.crowds?.map(c => {
                                                const combinedId = `bx_spaces_${c.id}`;
                                                const isChecked = (mapping.communities || []).includes(combinedId);
                                                return (
                                                    <label key={combinedId} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-[#9df01c]/10 border-[#9df01c]/50' : 'bg-black border-transparent hover:bg-white/5'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-[#9df01c] border-[#9df01c]' : 'border-gray-500'}`}>
                                                                {isChecked && <CheckCircle2 size={12} className="text-black" />}
                                                            </div>
                                                            <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-400'}`}>{c.title}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#9df01c] bg-[#9df01c]/10 px-2 py-0.5 rounded">Crowd</span>
                                                    </label>
                                                );
                                            })}

                                            {unaData.spaces?.length > 0 && <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-3 mb-1 px-1 text-left">Spaces</div>}
                                            {unaData.spaces?.map(s => {
                                                const combinedId = `bx_groups_${s.id}`;
                                                const isChecked = (mapping.communities || []).includes(combinedId);
                                                return (
                                                    <label key={combinedId} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-[#38bdf8]/10 border-[#38bdf8]/50' : 'bg-black border-transparent hover:bg-white/5'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-gray-500'}`}>
                                                                {isChecked && <CheckCircle2 size={12} className="text-black" />}
                                                            </div>
                                                            <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-400'}`}>{s.title}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">Space</span>
                                                    </label>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                              </div>

                              <div className="md:pt-8 w-full md:w-auto">
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
                          onClick={handleSave}
                          disabled={isSaving}
                          className={`flex items-center gap-2 font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all ${saveSuccess ? 'bg-green-500 text-black' : 'bg-[#9df01c] text-black hover:bg-[#8ce015]'}`}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {saveSuccess ? 'Saved!' : 'Save Configuration'}
                        </button>
                      </div>
                  </>
                )}

              </div>
            </div>
          </div>

        {/* --- MANUAL USERS MODAL --- */}
        {manualModalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden text-left">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
                <div>
                  <h3 className="text-xl font-black uppercase text-white">{manualModalData.email}</h3>
                  <p className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mt-1">Manual Access Granted</p>
                </div>
                <button onClick={() => setManualModalData(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {manualModalData.communities?.map((comm, i) => {
                    const isCrowd = comm.module === 'bx_spaces';
                    const sourceList = isCrowd ? (unaData.crowds || []) : (unaData.spaces || []);
                    const commData = sourceList.find(c => c.id === comm.contentId.toString() || c.id === parseInt(comm.contentId));
                    const title = commData ? commData.title : `Unknown ID: ${comm.contentId}`;

                    return (
                        <div key={i} className="border border-white/5 rounded-xl p-4 flex justify-between items-center bg-black hover:border-white/10 transition-colors">
                            <div className="flex-1 flex flex-col">
                                <p className="text-sm font-bold text-white flex items-center gap-2 mb-0.5">
                                    <span className="truncate max-w-[200px]">{title}</span>
                                    <UserCheck className="w-4 h-4 text-[#9df01c] shrink-0" />
                                </p>
                                <span className={`text-[8px] font-black uppercase tracking-widest w-fit ${isCrowd ? 'text-[#9df01c]' : 'text-[#38bdf8]'}`}>{isCrowd ? 'Crowd' : 'Space'}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    handleRemoveManualUser(comm.id, manualModalData.email, comm.module, comm.contentId);
                                    const updatedComms = manualModalData.communities.filter(c => c.id !== comm.id);
                                    if (updatedComms.length === 0) setManualModalData(null);
                                    else setManualModalData({...manualModalData, communities: updatedComms});
                                }} 
                                className="p-2 bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 rounded-lg transition-colors" title="Revoke Access"
                            >
                                <UserX className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
            </div>
          </div>
        )}

        {/* --- AUDIENCE MODAL --- */}
        {modalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
              
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
                {(!modalData.users || modalData.users.length === 0) ? (
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
                                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{user.displayEmail || user.email}</p>
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
                                                    onClick={() => toggleUserAccess(user.email, stat.productId, 'restore')}
                                                    disabled={processingUser === user.email}
                                                    className="p-1.5 bg-white/5 hover:bg-[#9df01c] hover:text-black text-gray-400 rounded-lg transition-colors group relative"
                                                    title="Restore Access">
                                                    {processingUser === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => toggleUserAccess(user.email, stat.productId, 'revoke')}
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