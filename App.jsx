import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, LayoutDashboard, Link2, Image, FileText, Menu, X, LogOut } from 'lucide-react';

// Import our new Component Architecture
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import BridgeApp from './components/apps/BridgeApp';
import BusinessCardApp, { PublicCardView } from './components/apps/BusinessCardApp';
import PlaceholderApp from './components/apps/PlaceholderApp';

export default function App() {
  // Public View State
  const [publicCardData, setPublicCardData] = useState(null);
  const [isPublicBio, setIsPublicBio] = useState(false);
  const [publicBioError, setPublicBioError] = useState(false);

  // Authenticated State
  const [session, setSession] = useState(() => localStorage.getItem('bridge_session') || null);
  const [unaData, setUnaData] = useState(() => {
    const saved = localStorage.getItem('bridge_unadata');
    return saved ? JSON.parse(saved) : { user: null, crowds: [], spaces: [], debug: null };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingCommunities, setIsSyncingCommunities] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW: URL-AWARE STATE INITIALIZATION ---
  // Instead of defaulting to 'bridge', we check if the URL has an ?app= parameter!
  const [currentApp, setCurrentApp] = useState(() => {
      if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          return params.get('app') || 'bridge';
      }
      return 'bridge';
  });
  
  // Instead of defaulting to 'stripe', we check if the URL has a ?tab= parameter!
  const [activeTab, setActiveTab] = useState(() => {
      if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          return params.get('tab') || 'stripe';
      }
      return 'stripe';
  }); 

  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  const hasAttemptedLogin = useRef(false);

  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  const UNA_STUDIO_URL = "https://studio.selloutcrowds.com";
  const UNA_AUTH_URL = `${UNA_STUDIO_URL}/modules/?r=oauth2/auth`;
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  // --- NEW: SYNC STATE TO URL ---
  // Whenever currentApp or activeTab changes, we instantly update the URL bar so they can bookmark it!
  useEffect(() => {
      if (!isPublicBio && session) {
          const url = new URL(window.location);
          url.searchParams.set('app', currentApp);
          url.searchParams.set('tab', activeTab);
          window.history.replaceState({}, '', url);
      }
  }, [currentApp, activeTab, isPublicBio, session]);


  // --- 0. SET DYNAMIC PAGE TITLE ---
  useEffect(() => {
      if (isPublicBio && publicCardData?.name) {
          document.title = `${publicCardData.name} | Contact`;
      } else {
          document.title = "Sellout Crowds Hub";
      }
  }, [isPublicBio, publicCardData]);

  // --- 1. MULTI-DOMAIN ROUTER: CHECK FOR CROWDS.BIO ---
  useEffect(() => {
      const hostname = window.location.hostname;
      
      if (hostname.includes('crowds.bio') || (hostname.includes('localhost') && window.location.pathname.length > 1)) {
          const pathSlug = window.location.pathname.substring(1); 
          
          if (pathSlug && pathSlug !== '') {
              setIsPublicBio(true);
              setIsLoading(true);
              
              fetch(`/api/public-card/${pathSlug}`)
                  .then(res => res.json())
                  .then(data => {
                      if (data.success && data.card) {
                          setPublicCardData(data.card);
                      } else {
                          setPublicBioError(true);
                      }
                      setIsLoading(false);
                  })
                  .catch(() => {
                      setPublicBioError(true);
                      setIsLoading(false);
                  });
          }
      }
  }, []);

  // --- 2. OAUTH LOGIN LOGIC ---
  useEffect(() => {
    if (session) localStorage.setItem('bridge_session', session);
    else {
      localStorage.removeItem('bridge_session');
      localStorage.removeItem('bridge_unadata'); 
    }
  }, [session]);

  useEffect(() => { localStorage.setItem('bridge_unadata', JSON.stringify(unaData)); }, [unaData]);

  useEffect(() => {
    if (isPublicBio) return; 
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && !hasAttemptedLogin.current) {
      hasAttemptedLogin.current = true;
      handleCallback(code);
    }
  }, [isPublicBio]);

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
        syncCommunities(data.access_token);
      } else {
        setError(data.error_description || data.error || "Authentication failed. Sellout Crowds rejected the login code.");
      }
      // When OAuth finishes, we clear the code from the URL and let our Sync hook handle the rest
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError("The server is not responding. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async (token) => {
    try {
      const res = await fetch('/api/get-user', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setUnaData(prev => ({ ...prev, user: data.user }));
    } catch (err) { console.error("Could not load user data"); }
  };

  const syncCommunities = async (overrideToken) => {
    const activeToken = overrideToken || session;
    if (!activeToken) return;
    setIsSyncingCommunities(true);
    try {
      const res = await fetch('/api/get-communities', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setUnaData(prev => ({ ...prev, crowds: data.crowds || [], spaces: data.spaces || [] }));
    } catch (err) { 
        console.error("Failed to sync communities from Sellout Crowds."); 
    } finally {
        setIsSyncingCommunities(false);
    }
  };

  const startLogin = () => {
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(origin.endsWith('/') ? origin : `${origin}/`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
  };

  const handleLogout = () => {
    setSession(null);
    setUnaData({ user: null, crowds: [], spaces: [], debug: null });
    setCurrentApp('bridge');
    setActiveTab('stripe');
  };

  const handleAppSwitch = (appId, defaultTab) => {
      setCurrentApp(appId);
      setActiveTab(defaultTab);
      setIsAppSwitcherOpen(false);
      setIsMobileMenuOpen(false);
  };

  // --- RENDER 1: THE PUBLIC CARD VIEWER (crowds.bio) ---
  if (isPublicBio) {
      if (isLoading) {
          return (
             <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <span className="font-black uppercase tracking-[0.3em] text-[10px]">Loading Profile...</span>
             </div>
          );
      }

      if (publicBioError || !publicCardData) {
          return (
              <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans p-4 text-center">
                  <AlertCircle size={48} className="text-red-500 mb-4" />
                  <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Profile Not Found</h1>
                  <p className="text-gray-500 font-medium">This crowds.bio link doesn't exist or has been changed.</p>
                  <a href="https://selloutcrowds.com" className="mt-8 text-[#9df01c] font-black uppercase tracking-widest text-[10px] hover:underline">Go to Sellout Crowds</a>
              </div>
          );
      }

      const bgType = publicCardData.cardBgType || publicCardData.cardMode || 'dark';
      const isLight = bgType === 'light';
      const fullScreenBgColor = publicCardData.cardBgColor || (isLight ? '#f9fafb' : '#050505');

      return (
          <div className={`min-h-screen flex flex-col items-center pt-8 pb-12 px-4 transition-colors duration-300`} style={{ backgroundColor: fullScreenBgColor }}>
              <PublicCardView data={publicCardData} isFullScreen={true} />
              <a href="https://selloutcrowds.com" className={`mt-12 text-[10px] font-bold uppercase tracking-widest transition-colors ${isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                  Powered by Sellout Crowds
              </a>
          </div>
      );
  }

  // --- RENDER 2: LOADING ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Processing...</span>
      </div>
    );
  }

  // --- RENDER 3: THE LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/10 blur-[100px] rounded-full"></div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-start gap-3 relative z-10 text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="mb-1">Authentication Error</p>
                <p className="text-xs font-medium opacity-80 normal-case tracking-normal">{error}</p>
              </div>
            </div>
          )}

          <img src={logoUrl} alt="Sellout Crowds" className="max-w-[200px] mx-auto mb-10 relative z-10" />
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10">Creator Hub</h1>
          <p className="text-gray-500 mb-10 text-sm font-medium leading-relaxed relative z-10">
            Login with your Sellout Crowds credentials to access your business tools and integrations.
          </p>
          <button onClick={startLogin} style={{ backgroundColor: brandColor }} className="w-full text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#9df01c]/10 relative z-10">
            Login to Hub
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 4: THE CREATOR HUB SHELL ---
  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden flex-col lg:flex-row pb-16 lg:pb-0">
        {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
            <Sidebar 
                currentApp={currentApp} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                unaData={unaData} 
                syncCommunities={syncCommunities}
                isSyncingCommunities={isSyncingCommunities}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
            <TopBar 
                currentApp={currentApp}
                handleAppSwitch={handleAppSwitch}
                isAppSwitcherOpen={isAppSwitcherOpen}
                setIsAppSwitcherOpen={setIsAppSwitcherOpen}
                handleLogout={handleLogout}
            />

            <main className="flex-1 overflow-auto relative custom-scrollbar">
                {currentApp === 'bridge' && <BridgeApp session={session} unaData={unaData} activeTab={activeTab} />}
                
                {currentApp === 'business-card' && (
                    ['builder', 'design', 'address-book', 'url'].includes(activeTab) ? (
                        <BusinessCardApp session={session} activeTab={activeTab} />
                    ) : (
                        <PlaceholderApp title="Card Settings" icon={<LayoutDashboard size={64}/>} description="Analytics and custom domain settings coming soon." />
                    )
                )}
                
                {currentApp === 'linktree' && <PlaceholderApp title="Link-in-Bio Tool" icon={<Link2 size={64}/>} description="Create your custom link tree for your social media bios to drive traffic to your community." />}
                {currentApp === 'assets' && <PlaceholderApp title="Brand Assets" icon={<Image size={64}/>} description="Download official logos, graphics, and promotional materials to market your space." />}
                {currentApp === 'guides' && <PlaceholderApp title="Creator Guides" icon={<FileText size={64}/>} description="Learn how to grow your community, maximize your revenue, and optimize your funnels." />}
            </main>
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-6 z-50">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 -ml-2 transition-colors flex flex-col items-center gap-1 ${isMobileMenuOpen ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                <span className="text-[9px] font-bold uppercase tracking-widest">{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
            </button>
            <button onClick={handleLogout} className="p-2 -mr-2 text-gray-500 hover:text-red-500 transition-colors flex flex-col items-center gap-1">
                <LogOut size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Log Out</span>
            </button>
        </div>
    </div>
  );
}