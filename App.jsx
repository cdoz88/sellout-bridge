import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, LayoutDashboard, Link2, Image as ImageIcon, FileText, Menu, X, QrCode, UserPlus, CheckCircle2 } from 'lucide-react';

import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import BridgeApp from './components/apps/BridgeApp';
import BusinessCardApp, { PublicCardView } from './components/apps/BusinessCardApp';
import AddressBookApp from './components/apps/AddressBookApp';
import PlaceholderApp from './components/apps/PlaceholderApp';

// --- CUSTOM WORDPRESS SVG COMPONENT ---
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
      if (isPublicBio && publicCardData?.name) {
          document.title = `${publicCardData.name} | Contact`;
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
          const pathSlug = pathname.substring(1); 
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
        if (code && !hasAttemptedLogin.current) {
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
      } else {
        setError(data.error_description || data.error || "Authentication failed. Sellout Crowds rejected the login code.");
      }
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
      if (res.status === 401) { handleLogout(); return; }
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
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setUnaData(prev => ({ ...prev, crowds: data.crowds || [], spaces: data.spaces || [] }));
    } catch (err) { 
        console.error("Failed to sync communities from Sellout Crowds."); 
    } finally {
        setIsSyncingCommunities(false);
    }
  };

  const startLogin = () => {
    if (isOAuthFlow) {
        localStorage.setItem('hub_pending_oauth', window.location.pathname + window.location.search);
    }
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(origin.endsWith('/') ? origin : `${origin}/`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
  };

  const handleAppSwitch = (appId, defaultTab) => {
      setCurrentApp(appId);
      setActiveTab(defaultTab);
      setIsAppSwitcherOpen(false);
      setIsMobileMenuOpen(false);
  };

  const triggerMobileQRCode = () => {
      handleAppSwitch('business-card', 'builder');
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
              <PublicCardView data={publicCardData} isFullScreen={true} />
              <a href="https://selloutcrowds.com" className={`mt-12 text-[10px] font-bold uppercase tracking-widest transition-colors ${isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                  Powered by Sellout Crowds
              </a>
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
                          {/* --- IMPLEMENTED WORDPRESS SVG ICON --- */}
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
                                  // FIX: Safely parse the URL to append the parameters without corrupting WP core requests
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
            {isOAuthFlow 
                ? "Please log in to authorize the connection to your WordPress site."
                : "Login with your Sellout Crowds credentials to access your business tools and integrations."}
          </p>
          <button onClick={startLogin} style={{ backgroundColor: brandColor }} className="w-full text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#9df01c]/10 relative z-10">
            Login to Hub
          </button>
        </div>
      </div>
    );
  }

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
                    ['builder', 'design', 'url'].includes(activeTab) ? (
                        <BusinessCardApp session={session} activeTab={activeTab} />
                    ) : (
                        <PlaceholderApp title="Card Settings" icon={<LayoutDashboard size={64}/>} description="Analytics and custom domain settings coming soon." />
                    )
                )}

                {currentApp === 'address-book' && <AddressBookApp />}
                
                {currentApp === 'linktree' && <PlaceholderApp title="Bio Page Tool" icon={<Link2 size={64}/>} description="Create your custom link tree for your social media bios to drive traffic to your community." />}
                {currentApp === 'assets' && <PlaceholderApp title="Brand Assets" icon={<ImageIcon size={64}/>} description="Download official logos, graphics, and promotional materials to market your space." />}
                {currentApp === 'guides' && <PlaceholderApp title="Creator Guides" icon={<FileText size={64}/>} description="Learn how to grow your community, maximize your revenue, and optimize your funnels." />}
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