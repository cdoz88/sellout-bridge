import React, { useState, useEffect } from 'react';
import { Loader2, MonitorSmartphone } from 'lucide-react';
import BridgeOptIn from './bridge/BridgeOptIn';
import BridgeAliases from './bridge/BridgeAliases';
import BridgeManual from './bridge/BridgeManual';
import BridgeMappings from './bridge/BridgeMappings';
import BridgeProviderSetup from './bridge/BridgeProviderSetup';
import HelpDrawer from '../layout/HelpDrawer';

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
  const [manualSelectedMappingId, setManualSelectedMappingId] = useState('');
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualModalData, setManualModalData] = useState(null);

  const [aliases, setAliases] = useState([]);
  const [aliasOriginal, setAliasOriginal] = useState('');
  const [aliasTarget, setAliasTarget] = useState('');
  const [isAliasSaving, setIsAliasSaving] = useState(false);

  const [hasOptedIn, setHasOptedIn] = useState(false);

  const stripeIcon = "https://admin.beasellout.com/wp-content/uploads/2026/03/Stripe-logo.webp";
  const paypalIcon = "https://admin.beasellout.com/wp-content/uploads/2026/03/paypal-icon.webp";
  const patreonIcon = "https://static.vecteezy.com/system/resources/previews/065/386/613/non_2x/patreon-white-logo-icon-app-transparent-background-premium-social-media-design-for-digital-download-free-png.png";

  const STRIPE_CLIENT_ID = 'ca_UAUckMTFQOG8rW8CajO6ZOB2mTzVXo42';
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);

  const totalStripeBridged = audienceStats.reduce((sum, stat) => sum + (stat.bridgedCount || 0), 0);
  const stripeEstimatedCost = (totalStripeBridged * 0.50).toFixed(2);
  const totalPaypalBridged = 0; 
  const paypalEstimatedCost = (totalPaypalBridged * 0.50).toFixed(2);

  useEffect(() => {
    if (session) {
      fetchDatabaseMappings(session);
      fetchDatabaseSettings(session);
      fetchManualUsers(session);
      fetchAliases(session);
    }
  }, [session, activeTab]);

  useEffect(() => {
      if (stripeAccountId || paypalAccountId || mappings.length > 0 || manualUsers.length > 0) {
          setHasOptedIn(true);
      }
  }, [stripeAccountId, paypalAccountId, mappings, manualUsers]);

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
                  setHasOptedIn(true); 
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
        if (data.settings.platform_customer_id) {
            setHasOptedIn(true);
        }
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
    if (!activeToken || ['manual', 'aliases', 'patreon', 'team', 'mappings'].includes(provider)) return;

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
              setHasOptedIn(true);
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
              
              if (email && plan) {
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
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Server rejected the save.");
      
      setSaveSuccess(true);
      setHasOptedIn(true); 
      setTimeout(() => setSaveSuccess(false), 3000);
      if (activeTab === 'stripe') fetchAudienceStats(); 
    } catch (err) {
      setError(err.message || "Failed to save mappings.");
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
          setError(`Sync complete! Some Stripe subscribers haven't created an account on your site yet, so their access is pending.`);
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

  const getProductName = (provider, productId) => {
      if (!provider || !productId) return 'Unknown Product';
      const products = providerProducts[provider] || [];
      const product = products.find(p => String(p.id) === String(productId) || p.name === productId);
      return product ? product.name : productId;
  };

  const handleAddManualUser = async () => {
      const selectedMapping = mappings.find(m => m.id === manualSelectedMappingId);
      
      if (!manualEmail || !selectedMapping || selectedMapping.communities.length === 0) {
          setError("Please enter an email address and select a valid Access Rule.");
          return;
      }
      setIsManualSaving(true);
      setError(null);
      try {
          const res = await fetch('/api/add-manual-user', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: manualEmail, communities: selectedMapping.communities })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          
          const textRaw = await res.text();
          let data = {};
          try { data = textRaw ? JSON.parse(textRaw) : {}; } catch(e) {}
          
          if (res.ok && data.success) {
              setManualEmail('');
              setManualSelectedMappingId('');
              setHasOptedIn(true);
              fetchManualUsers(); 
              
              if (data.notice) {
                  setError(`Access saved successfully! Note: This user hasn't registered an account on your site yet.`);
              } else {
                  setError(null);
              }
          } else {
              throw new Error(data.error || `Server Error`);
          }
      } catch (err) {
          setError(err.message);
      } finally {
          setIsManualSaving(false);
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
              throw new Error(data.error || `Server Error`);
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

  const addMapping = () => setMappings(prev => [...prev, { id: `temp_${Date.now()}`, provider: '', productId: '', communities: [] }]);
  
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

  if (!hasOptedIn) {
      return <BridgeOptIn setHasOptedIn={setHasOptedIn} canUseBridge={true} />;
  }

  return (
    <>
      {isLoadingOAuth && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <Loader2 className="w-12 h-12 animate-spin text-[#9df01c] mb-4" />
              <p className="text-white font-bold tracking-widest uppercase text-xs">Connecting...</p>
          </div>
      )}
      
      {/* Mobile restriction notice */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-[#050505]">
          <MonitorSmartphone size={48} className="text-gray-600 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Desktop Required</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs">
              Subscription Bridge requires mapping configurations and CSV uploads that are best handled on a desktop computer.
          </p>
      </div>

      <div className="hidden lg:block max-w-7xl mx-auto py-12 px-8 relative">
          {activeTab === 'aliases' && (
              <BridgeAliases 
                  aliases={aliases} 
                  aliasOriginal={aliasOriginal} 
                  setAliasOriginal={setAliasOriginal} 
                  aliasTarget={aliasTarget} 
                  setAliasTarget={setAliasTarget} 
                  isAliasSaving={isAliasSaving} 
                  handleAddAlias={handleAddAlias} 
                  handleRemoveAlias={handleRemoveAlias} 
                  audienceStats={audienceStats} 
              />
          )}

          {activeTab === 'manual' && (
              <BridgeManual 
                  manualUsers={manualUsers}
                  manualEmail={manualEmail}
                  setManualEmail={setManualEmail}
                  manualSelectedMappingId={manualSelectedMappingId}
                  setManualSelectedMappingId={setManualSelectedMappingId}
                  isManualSaving={isManualSaving}
                  handleAddManualUser={handleAddManualUser}
                  handleRemoveManualUser={handleRemoveManualUser}
                  mappings={mappings}
                  getProductName={getProductName}
                  manualModalData={manualModalData}
                  setManualModalData={setManualModalData}
                  unaData={unaData}
                  error={error}
              />
          )}

          {activeTab === 'mappings' && (
              <BridgeMappings 
                  mappings={mappings}
                  providerProducts={providerProducts}
                  unaData={unaData}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  addMapping={addMapping}
                  updateMapping={updateMapping}
                  toggleCommunity={toggleCommunity}
                  removeMapping={removeMapping}
                  saveMappingsToDatabase={saveMappingsToDatabase}
              />
          )}

          {['stripe', 'paypal', 'patreon'].includes(activeTab) && (
              <BridgeProviderSetup 
                  activeTab={activeTab}
                  stripeAccountId={stripeAccountId}
                  paypalClientId={paypalClientId}
                  setPaypalClientId={setPaypalClientId}
                  paypalSecretKey={paypalSecretKey}
                  setPaypalSecretKey={setPaypalSecretKey}
                  paypalAccountId={paypalAccountId}
                  providerProducts={providerProducts}
                  isValidatingKey={isValidatingKey}
                  keySuccess={keySuccess}
                  isSyncingSubs={isSyncingSubs}
                  syncSubsResult={syncSubsResult}
                  audienceStats={audienceStats}
                  isStatsLoading={isStatsLoading}
                  modalData={modalData}
                  setModalData={setModalData}
                  patreonUsers={patreonUsers}
                  paypalUsers={paypalUsers}
                  error={error}
                  isLoadingOAuth={isLoadingOAuth}
                  startStripeOAuth={startStripeOAuth}
                  handleDisconnectStripe={handleDisconnectStripe}
                  handleSavePaypalKeys={handleSavePaypalKeys}
                  handleDisconnectPaypal={handleDisconnectPaypal}
                  handlePatreonUpload={handlePatreonUpload}
                  handlePaypalUpload={handlePaypalUpload}
                  syncExistingSubscribers={syncExistingSubscribers}
                  runPatreonImport={runPatreonImport}
                  runPaypalImport={runPaypalImport}
                  toggleUserAccess={toggleUserAccess}
                  copyWebhook={copyWebhook}
                  webhookCopied={webhookCopied}
                  processingUser={processingUser}
                  totalStripeBridged={totalStripeBridged}
                  stripeEstimatedCost={stripeEstimatedCost}
                  totalPaypalBridged={totalPaypalBridged}
                  paypalEstimatedCost={paypalEstimatedCost}
                  stripeIcon={stripeIcon}
                  paypalIcon={paypalIcon}
                  patreonIcon={patreonIcon}
              />
          )}

          {/* Contextual Help Drawer mapping */}
          <HelpDrawer pageName={activeTab === 'stripe' ? 'stripe_payments' : 'bridge'} session={session} unaData={unaData} />
      </div>
    </>
  );
}