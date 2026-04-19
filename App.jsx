import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, LayoutDashboard, Link2, Image as ImageIcon, FileText, Menu, X, QrCode, UserPlus, CheckCircle2, ListChecks } from 'lucide-react';

import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import BridgeApp from './components/apps/BridgeApp';
import BusinessCardApp, { PublicCardView } from './components/apps/BusinessCardApp';
import BioPageApp, { PublicBioView } from './components/apps/BioPageApp';
import AddressBookApp from './components/apps/AddressBookApp';
import AssetsApp from './components/apps/AssetsApp';
import GuidesApp from './components/apps/GuidesApp';
import TeammatesApp from './components/apps/TeammatesApp';
import OnboardingApp from './components/apps/OnboardingApp';
import PlaceholderApp from './components/apps/PlaceholderApp';

const WordPressIcon = ({ className }) => (
    <svg viewBox="0 0 447.674 447.674" className={className}>
        <g>
            <path d="M134.289,138.16h-24.722l67.399,190.521l37.732-107.825l-29.254-82.696H159.36v-18.154h115.508v18.154h-27.049l67.398,190.521l24.227-69.234c31.781-88.702-26.048-116.333-26.048-136.129s16.048-35.843,35.843-35.843c1.071,0,2.111,0.058,3.13,0.153c-33.541-31.663-78.768-51.08-128.534-51.08c-65.027,0-122.306,33.146-155.884,83.458h66.336v18.154L134.289,138.16L134.289,138.16z" fill="currentColor"/>
            <path d="M36.548,223.837c0,71.704,40.302,133.986,99.483,165.458l-84.52-238.919C41.883,172.932,36.548,197.761,36.548,223.837z" fill="currentColor"/>
            <path d="M386.833,131.547c2.679,15.774,1.868,33.503-2.243,51.301h0.745l-2.832,8.092l0,0c-1.678,5.843-3.791,11.82-6.191,17.693l-64.444,180.541c59.057-31.51,99.256-93.725,99.256-165.338C411.124,190.279,402.29,158.788,386.833,131.547z" fill="currentColor"/>
            <path d="M166.075,402.033c18.195,5.894,37.603,9.091,57.762,9.091c19.228,0,37.777-2.902,55.239-8.285l-54.784-154.862L166.075,402.033z" fill="currentColor"/>
            <path d="M382.113,65.56C339.836,23.283,283.625,0,223.836,0S107.837,23.283,65.56,65.56S0,164.047,0,223.837c0,59.789,23.283,115.999,65.56,158.276s98.488,65.56,158.277,65.56s115.999-23.283,158.277-65.56c42.277-42.277,65.56-98.488,65.56-158.276C447.673,164.047,424.39,107.837,382.113,65.56z M223.836,431.883c-114.717,0-208.046-93.329-208.046-208.046S109.119,15.79,223.836,15.79s208.046,93.33,208.046,208.047S338.554,431.883,223.836,431.883z" fill="currentColor"/>
        </g>
    </svg>
);

export default function App() {
  const [publicCardData, setPublicCardData] = useState(null);
  const [isPublicBio, setIsPublicBio] = useState(false);
  const [publicPageType, setPublicPageType] = useState(null); 
  const [publicBioError, setPublicBioError] = useState(false);

  const [isOAuthFlow, setIsOAuthFlow] = useState(false);
  const [oauthParams, setOauthParams] = useState(null);
  const [oauthApproving, setOauthApproving] = useState(false);
  const [oauthError, setOauthError] = useState(null);

  const [session, setSession] = useState(() => localStorage.getItem('bridge_session') || null);
  const [unaData, setUnaData] = useState(() => {
    const saved = localStorage.getItem('bridge_unadata');
    return saved ? JSON.parse(saved) : { user: null, crowds: [], spaces: [], debug: null };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingCommunities, setIsSyncingCommunities] = useState(false);
  const [error, setError] = useState(null);

  const [currentApp, setCurrentApp] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              return params.get('app') || 'business-card';
          }
      } catch(e) {}
      return 'business-card';
  });
  
  const [activeTab, setActiveTab] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              return params.get('tab') || 'builder';
          }
      } catch(e) {}
      return 'builder';
  }); 

  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  const hasAttemptedLogin = useRef(false);

  const brandColor = '#9df01c';
  const logoUrl = "https://beasellout.com/wp-content/uploads/2025/04/Logo.png";
  const UNA_STUDIO_URL = "https://studio.selloutcrowds.com";
  const UNA_AUTH_URL = `${UNA_STUDIO_URL}/modules/?r=oauth2/auth`;
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  useEffect(() => {
      const handleUnauthorized = () => {
          handleLogout();
      };
      window.addEventListener('unauthorized', handleUnauthorized);
      return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
      const pathname = window.location.pathname;
      if (pathname === '/oauth/authorize') {
          setIsOAuthFlow(true);
          const params = new URLSearchParams(window.location.search);
          setOauthParams({
              client_id: params.get('client_id'),
              redirect_uri: params.get('redirect_uri'),
              response_type: params.get('response_type'),
              state: params.get('state')
          });
      }
  }, []);

  useEffect(() => {
      if (!isPublicBio && !isOAuthFlow && session) {
          try {
              const url = new URL(window.location);
              url.searchParams.set('app', currentApp);
              url.searchParams.set('tab', activeTab);
              window.history.replaceState({}, '', url);
          } catch(e) {}
      }
  }, [currentApp, activeTab, isPublicBio, isOAuthFlow, session]);

  useEffect(() => {
      if (isPublicBio && publicCardData) {
          document.title = `${publicCardData.pageTitle || publicCardData.name} | Contact`;
      } else if (isOAuthFlow) {
          document.title = "Authorize Connection | SC Hub";
      } else {
          document.title = "Sellout Crowds Hub";
      }
  }, [isPublicBio, publicCardData, isOAuthFlow]);

  useEffect(() => {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      if (pathname === '/oauth/authorize' || pathname === '/oauth/token') return;

      if (hostname.includes('crowds.bio') || (hostname.includes('localhost') && pathname.length > 1 && !pathname.startsWith('/oauth'))) {
          
          if (pathname.startsWith('/page/')) {
              const pathSlug = pathname.replace('/page/', '');
              if (pathSlug && pathSlug !== '') {
                  setIsPublicBio(true);
                  setPublicPageType('bio');
                  setIsLoading(true);
                  fetch(`/api/public-bio-page/${pathSlug}`)
                      .then(res => res.json())
                      .then(data => {
                          if (data.success && data.page) setPublicCardData(data.page);
                          else setPublicBioError(true);
                          setIsLoading(false);
                      })
                      .catch(() => {
                          setPublicBioError(true);
                          setIsLoading(false);
                      });
              }
          } else {
              const pathSlug = pathname.substring(1); 
              if (pathSlug && pathSlug !== '') {
                  setIsPublicBio(true);
                  setPublicPageType('card');
                  setIsLoading(true);
                  fetch(`/api/public-card/${pathSlug}`)
                      .then(res => res.json())
                      .then(data => {
                          if (data.success && data.card) setPublicCardData(data.card);
                          else setPublicBioError(true);
                          setIsLoading(false);
                      })
                      .catch(() => {
                          setPublicBioError(true);
                          setIsLoading(false);
                      });
              }
          }
      }
  }, []);

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
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state !== 'stripe' && state !== 'paypal' && !hasAttemptedLogin.current) {
            hasAttemptedLogin.current = true;
            handleCallback(code);
        } else if (session && !unaData.user) {
            fetchUser(session);
        }
    } catch(e) {}
  }, [isPublicBio, session]);

  const handleLogout = () => {
    setSession(null);
    setUnaData({ user: null, crowds: [], spaces: [], debug: null });
    setCurrentApp('business-card');
    setActiveTab('builder');
    try {
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);
    } catch(e) {}
  };

  const startLogin = () => {
    // 1. Remember their intended destination before sending them to login!
    localStorage.setItem('hub_login_redirect_app', currentApp);
    localStorage.setItem('hub_login_redirect_tab', activeTab);

    if (isOAuthFlow) {
        localStorage.setItem('hub_pending_oauth', window.location.pathname + window.location.search);
    }
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(origin.endsWith('/') ? origin : `${origin}/`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
  };

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

        const pendingOAuth = localStorage.getItem('hub_pending_oauth');
        if (pendingOAuth) {
            localStorage.removeItem('hub_pending_oauth');
            window.location.href = pendingOAuth; 
            return;
        }

        // 2. Restore their original destination if we saved one!
        const savedApp = localStorage.getItem('hub_login_redirect_app');
        const savedTab = localStorage.getItem('hub_login_redirect_tab');
        
        let newUrl = new URL(window.location);
        newUrl.searchParams.delete('code');
        newUrl.searchParams.delete('state');
        
        if (savedApp) {
            setCurrentApp(savedApp);
            newUrl.searchParams.set('app', savedApp);
            localStorage.removeItem('hub_login_redirect_app');
        }
        if (savedTab) {
            setActiveTab(savedTab);
            newUrl.searchParams.set('tab', savedTab);
            localStorage.removeItem('hub_login_redirect_tab');
        }
        
        window.history.replaceState({}, document.title, newUrl);
        setIsLoading(false);
        return;

      } else {
        setError(data.error_description || data.error || "Authentication failed. Sellout Crowds rejected the login code.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      setError("The server is not responding. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async (token) => {
      try {
          const res = await fetch('/api/get-user', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (data.user) {
              setUnaData(prev => ({ ...prev, user: data.user }));
              if (currentApp === 'bridge') {
                  syncCommunities(token); 
              }
          }
      } catch (err) {}
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
      if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
      const data = await res.json();
      if (data.crowds || data.spaces) {
          setUnaData(prev => ({ ...prev, crowds: data.crowds || [], spaces: data.spaces || [], debug: data.debug }));
      }
    } catch (err) { 
        console.error("Failed to sync communities from Sellout Crowds."); 
    } finally {
        setIsSyncingCommunities(false);
    }
  };

  const handleAppSwitch = (appId, defaultTab) => {
      setCurrentApp(appId);
      setActiveTab(defaultTab);
      setIsAppSwitcherOpen(false);
      setIsMobileMenuOpen(false);
  };

  const triggerMobileQRCode = () => {
      if (currentApp === 'linktree') {
          handleAppSwitch('linktree', 'links');
      } else {
          handleAppSwitch('business-card', 'builder');
      }
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-qr-modal')), 100);
  };

  const triggerMobileAddContact = () => {
      handleAppSwitch('address-book', 'contacts');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-add-contact')), 100);
  };

  const handleApproveOAuth = async () => {
      setOauthApproving(true);
      setOauthError(null);
      try {
          const res = await fetch('/api/oauth/approve', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  client_id: oauthParams.client_id, 
                  redirect_uri: oauthParams.redirect_uri 
              })
          });
          if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
          const data = await res.json();
          if (data.success) {
              const redirectUrl = new URL(oauthParams.redirect_uri);
              redirectUrl.searchParams.set('code', data.code);
              if (oauthParams.state) redirectUrl.searchParams.set('state', oauthParams.state);
              window.location.href = redirectUrl.toString();
          } else {
              setOauthError(data.error || "Failed to generate authorization code.");
              setOauthApproving(false);
          }
      } catch (err) {
          setOauthError("Server error during approval. Please try again.");
          setOauthApproving(false);
      }
  };

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
              {publicPageType === 'bio' ? (
                  <PublicBioView data={publicCardData} isFullScreen={true} />
              ) : (
                  <PublicCardView data={publicCardData} isFullScreen={true} />
              )}
              <a href="https://selloutcrowds.com" className={`mt-12 text-[10px] font-bold uppercase tracking-widest transition-colors ${isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                  Powered by Sellout Crowds
              </a>
          </div>
      );
  }

  // --- RESTORED CLASSIC LOGIN PAGE DESIGN WITH LARGE LOGO ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center px-4 font-sans text-white">
        <img src={logoUrl} alt="Sellout Crowds" className="max-w-[300px] w-full mb-10 relative z-10" />
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none text-white">Creator Hub</h1>
        <p className="text-gray-400 max-w-md mx-auto mb-10 text-sm font-medium leading-relaxed">
            Login with your Sellout Crowds credentials to access your business tools, integrations, and guides.
        </p>
        
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center gap-2 text-xs font-bold justify-center">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button 
          onClick={startLogin}
          disabled={isLoading}
          className="bg-[#9df01c] hover:bg-[#8ce015] text-black font-black uppercase text-[11px] tracking-widest py-3.5 px-8 rounded-xl transition-all flex items-center justify-center min-w-[200px] shadow-lg shadow-[#9df01c]/10"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login to Hub"}
        </button>
      </div>
    );
  }

  if (isOAuthFlow && session) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
              <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9df01c]/10 blur-[100px] rounded-full"></div>
                  
                  <div className="flex justify-center mb-6 relative z-10">
                      <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                          <img src={logoUrl} alt="SC" className="w-10 h-10 object-contain" />
                      </div>
                      <div className="w-8 h-0.5 bg-white/10 self-center -mx-2 z-0"></div>
                      <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                          <WordPressIcon className="w-8 h-8 text-[#00769d]" />
                      </div>
                  </div>

                  <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Connect WordPress</h2>
                  <p className="text-gray-400 mb-8 text-sm font-medium leading-relaxed relative z-10">
                      Do you want to allow this WordPress site to view your communities and publish posts on your behalf?
                  </p>

                  {oauthError && (
                      <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold relative z-10">
                          {oauthError}
                      </div>
                  )}

                  <div className="space-y-3 relative z-10">
                      <button 
                          onClick={handleApproveOAuth}
                          disabled={oauthApproving}
                          className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2">
                          {oauthApproving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                          {oauthApproving ? 'Approving...' : 'Approve Connection'}
                      </button>
                      
                      <button 
                          onClick={() => {
                              if (oauthParams?.redirect_uri) {
                                  const redirectUrl = new URL(oauthParams.redirect_uri);
                                  redirectUrl.searchParams.set('soc_error', 'access_denied');
                                  window.location.href = redirectUrl.toString();
                              }
                          }}
                          className="w-full bg-white/5 text-white hover:bg-white/10 font-bold py-4 rounded-xl text-xs transition-colors">
                          Cancel & Return
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Processing...</span>
      </div>
    );
  }

  if (unaData.user && (unaData.user.role === 1 || unaData.user.role === 2)) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
              <div className="max-w-md w-full bg-[#111] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full"></div>
                  
                  <div className="flex justify-center mb-6 relative z-10">
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                  </div>

                  <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Creators Only</h2>
                  <p className="text-gray-400 mb-8 text-sm font-medium leading-relaxed relative z-10">
                      The Creator Hub is exclusively for premium Sellout Crowds members. Upgrade your plan to access these business tools!
                  </p>

                  <div className="space-y-3 relative z-10">
                      <a 
                          href="https://www.selloutcrowds.com/plans" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#9df01c] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-[#8ce015] transition-colors flex items-center justify-center gap-2">
                          Upgrade Account
                      </a>
                      
                      <button 
                          onClick={handleLogout}
                          className="w-full bg-white/5 text-white hover:bg-white/10 font-bold py-4 rounded-xl text-xs transition-colors">
                          Log Out
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const renderApp = () => {
      switch (currentApp) {
          case 'business-card':
              return <BusinessCardApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'address-book':
              return <AddressBookApp session={session} unaData={unaData} />;
          case 'bridge':
              return <BridgeApp session={session} unaData={unaData} activeTab={activeTab} />;
          case 'teammates':
              return <TeammatesApp session={session} unaData={unaData} />;
          case 'linktree':
              return <BioPageApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'assets':
              return <AssetsApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'guides':
              return <GuidesApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'onboarding':
              return <OnboardingApp session={session} unaData={unaData} />;
          default:
              return <PlaceholderApp currentApp={currentApp} />;
      }
  };

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
                session={session}
                handleAppSwitch={handleAppSwitch}
            />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
            <TopBar 
                currentApp={currentApp} 
                handleAppSwitch={handleAppSwitch}
                isAppSwitcherOpen={isAppSwitcherOpen}
                setIsAppSwitcherOpen={setIsAppSwitcherOpen}
                handleLogout={handleLogout}
                unaData={unaData}
            />
            
            <main className="flex-1 overflow-auto relative custom-scrollbar">
                <div className="lg:hidden absolute top-4 left-4 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-[#111] border border-white/10 rounded-xl text-white shadow-lg">
                        <Menu size={20} />
                    </button>
                </div>

                {renderApp()}
            </main>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-6 z-50">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 -ml-2 transition-colors flex flex-col items-center gap-1 ${isMobileMenuOpen ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                <span className="text-[9px] font-bold uppercase tracking-widest">{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
            </button>
            <button onClick={triggerMobileQRCode} className="p-2 text-gray-500 hover:text-[#9df01c] transition-colors flex flex-col items-center gap-1">
                <QrCode size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">QR Code</span>
            </button>
            <button onClick={triggerMobileAddContact} className="p-2 -mr-2 text-gray-500 hover:text-[#9df01c] transition-colors flex flex-col items-center gap-1">
                <UserPlus size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Add Contact</span>
            </button>
        </div>
    </div>
  );
}