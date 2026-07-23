import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, LayoutDashboard, Menu, X, QrCode, UserPlus } from 'lucide-react';

import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import DashboardApp from './components/apps/DashboardApp';
import BridgeApp from './components/apps/BridgeApp';
import BusinessCardApp, { PublicCardView } from './components/apps/BusinessCardApp';
import BioPageApp, { PublicBioView } from './components/apps/BioPageApp';
import AddressBookApp from './components/apps/AddressBookApp';
import AssetsApp from './components/apps/AssetsApp';
import GuidesApp from './components/apps/GuidesApp';
import TeammatesApp from './components/apps/TeammatesApp';
import OnboardingApp from './components/apps/OnboardingApp';
import PlaceholderApp from './components/apps/PlaceholderApp';
import CommunityLinkApp from './components/apps/CommunityLinkApp';
import ContentApp from './components/apps/ContentApp';
import NewsletterApp from './components/apps/NewsletterApp';
import AffiliateApp from './components/apps/AffiliateApp';
import YoutubeSyncApp from './components/apps/YoutubeSyncApp';

// Extracted Auth Components
import LoginScreen from './components/auth/LoginScreen';
import OAuthScreen from './components/auth/OAuthScreen';
import UpgradeScreen from './components/auth/UpgradeScreen';
import SessionExpiredModal from './components/auth/SessionExpiredModal';

export default function App() {
  const [isRedirecting, setIsRedirecting] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const host = window.location.hostname;
              const path = window.location.pathname;
              
              if (host === 'scout.selloutcrowds.com' && path.length > 1) return true;
              if (host.endsWith('.selloutcrowds.fan') && !host.includes('localhost')) return true;
              
              const isKnownDomain = host.includes('crowds.bio') || host.endsWith('.fan') || host.includes('localhost') || host.includes('hub.selloutcrowds.com') || host.includes('office.selloutcrowds.com');
              if (!isKnownDomain && path.length > 1) return true;
          }
      } catch(e) {}
      return false;
  });

  const [isPublicBio, setIsPublicBio] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const host = window.location.hostname;
              const path = window.location.pathname;
              return host.includes('crowds.bio') || (host.includes('localhost') && path.length > 1 && !path.startsWith('/oauth') && !path.startsWith('/scout/'));
          }
      } catch(e) {}
      return false;
  });

  const [publicCardData, setPublicCardData] = useState(null);
  const [publicPageType, setPublicPageType] = useState(null); 
  const [publicSlug, setPublicSlug] = useState(null); 
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

  const [isLoading, setIsLoading] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const host = window.location.hostname;
              const path = window.location.pathname;
              if (host.includes('crowds.bio') || (host.includes('localhost') && path.length > 1 && !path.startsWith('/oauth') && !path.startsWith('/scout/'))) return true;
          }
      } catch(e) {}
      return false;
  });
  
  const [isSyncingCommunities, setIsSyncingCommunities] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [currentApp, setCurrentApp] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              const savedApp = localStorage.getItem('hub_login_redirect_app');
              if (params.get('code') && savedApp) {
                  return savedApp;
              }
              return params.get('app') || 'dashboard';
          }
      } catch(e) {}
      return 'dashboard';
  });
  
  const [activeTab, setActiveTab] = useState(() => {
      try {
          if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              const savedTab = localStorage.getItem('hub_login_redirect_tab');
              if (params.get('code') && savedTab) {
                  return savedTab;
              }
              return params.get('tab') || 'home';
          }
      } catch(e) {}
      return 'home';
  }); 

  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  const hasAttemptedLogin = useRef(false);
  const hasUser = useRef(false);

  const logoUrl = "https://admin.beasellout.com/wp-content/uploads/2025/04/Logo.webp";
  const UNA_STUDIO_URL = "https://studio.selloutcrowds.com";
  const UNA_AUTH_URL = `${UNA_STUDIO_URL}/modules/?r=oauth2/auth`;
  const UNA_CLIENT_ID = "yxxnxsihu2"; 

  useEffect(() => {
      hasUser.current = !!unaData.user;
  }, [unaData.user]);

  useEffect(() => {
      const handleUnauthorized = async () => {
          const currentRefreshToken = localStorage.getItem('bridge_refresh');
          let refreshed = false;

          if (currentRefreshToken) {
              try {
                  const res = await fetch('/api/auth/refresh', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ refresh_token: currentRefreshToken })
                  });
                  const data = await res.json();
                  
                  if (data.access_token) {
                      setSession(data.access_token);
                      if (data.refresh_token) {
                          localStorage.setItem('bridge_refresh', data.refresh_token);
                      }
                      
                      const userRes = await fetch('/api/get-user', { headers: { 'Authorization': `Bearer ${data.access_token}` } });
                      if (userRes.ok) {
                          const userData = await userRes.json();
                          if (userData.user) {
                              setUnaData(prev => ({ ...prev, user: userData.user }));
                          }
                      }
                      refreshed = true;
                  }
              } catch (e) {
                  console.error("Silent refresh failed", e);
              }
          }

          if (!refreshed) {
              const currentPath = window.location.pathname;
              
              if (currentPath.includes('/oauth')) {
                  localStorage.setItem('hub_pending_oauth', currentPath + window.location.search);
                  const origin = window.location.origin;
                  const redirectUri = encodeURIComponent(origin.endsWith('/') ? origin : `${origin}/`);
                  const state = Math.random().toString(36).substring(7);
                  window.location.href = `${UNA_AUTH_URL}&client_id=${UNA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
              } else if (hasUser.current) {
                  setSessionExpired(true);
              } else {
                  handleLogout();
              }
          }
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
              redirect_uri: params.get('redirect_uri') || params.get('response_type'), 
              state: params.get('state')
          });
      }
  }, []);

  useEffect(() => {
      if (!isPublicBio && !isOAuthFlow && session && !isRedirecting) {
          try {
              const url = new URL(window.location);
              url.searchParams.set('app', currentApp);
              url.searchParams.set('tab', activeTab);
              window.history.replaceState({}, '', url);
          } catch(e) {}
      }
  }, [currentApp, activeTab, isPublicBio, isOAuthFlow, session, isRedirecting]);

  useEffect(() => {
      if (isPublicBio && publicCardData) {
          document.title = `${publicCardData.pageTitle || publicCardData.name} | Contact`;
      } else if (isOAuthFlow) {
          document.title = "Authorize Connection | Front Office";
      } else if (!isRedirecting) {
          document.title = "Sellout Crowds Front Office";
      }
  }, [isPublicBio, publicCardData, isOAuthFlow, isRedirecting]);

  useEffect(() => {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      if (pathname === '/oauth/authorize' || pathname === '/oauth/token') return;

      if (hostname.includes('crowds.bio') || (hostname.includes('localhost') && pathname.length > 1 && !pathname.startsWith('/oauth') && !pathname.startsWith('/scout/'))) {
          if (pathname.startsWith('/c/')) {
              const pathSlug = pathname.replace('/c/', '');
              if (pathSlug && pathSlug !== '') {
                  setPublicPageType('card');
                  setPublicSlug(pathSlug);
                  fetch(`/api/public-card/${pathSlug}`)
                      .then(res => res.json())
                      .then(data => {
                          if (data.success && data.card) setPublicCardData(data.card);
                          else setPublicBioError(true);
                          setIsLoading(false);
                      })
                      .catch(() => { setPublicBioError(true); setIsLoading(false); });
              }
          } else {
              const pathSlug = pathname.substring(1); 
              if (pathSlug && pathSlug !== '') {
                  setPublicPageType('bio');
                  setPublicSlug(pathSlug);
                  fetch(`/api/public-bio-page/${pathSlug}`)
                      .then(res => res.json())
                      .then(data => {
                          if (data.success && data.page) setPublicCardData(data.page);
                          else setPublicBioError(true);
                          setIsLoading(false);
                      })
                      .catch(() => { setPublicBioError(true); setIsLoading(false); });
              }
          }
          return; 
      }

      if (hostname.endsWith('.selloutcrowds.fan') && !hostname.includes('localhost')) {
          const subdomain = hostname.replace('.selloutcrowds.fan', '');
          if (subdomain && subdomain !== '') {
              fetch(`/api/resolve-domain/${subdomain}`)
                  .then(res => res.json())
                  .then(data => {
                      if (data.success && data.url) {
                          if (data.email) {
                              window.location.href = `https://studio.selloutcrowds.com/smart-scout.php?email=${encodeURIComponent(data.email)}&dest=${encodeURIComponent(data.url)}`;
                          } else {
                              window.location.href = data.url; 
                          }
                      } else {
                          window.location.href = 'https://selloutcrowds.com';
                      }
                  })
                  .catch(() => { window.location.href = 'https://selloutcrowds.com'; });
              return; 
          }
      }

      if (hostname === 'scout.selloutcrowds.com') {
          const rawPath = pathname.substring(1); 
          if (rawPath && rawPath !== '') {
              const decodedPath = decodeURIComponent(rawPath); 
              fetch(`/api/resolve-scout/${encodeURIComponent(decodedPath)}`)
                  .then(res => res.json())
                  .then(data => {
                      if (data.success && data.username) {
                          window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(data.username)}`;
                      } else {
                          window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(decodedPath)}`;
                      }
                  })
                  .catch(() => {
                      window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(decodedPath)}`;
                  });
          } else {
              window.location.href = 'https://selloutcrowds.com';
          }
          return;
      }

      const isKnownDomain = hostname.includes('crowds.bio') || hostname.endsWith('.fan') || hostname.includes('localhost') || hostname.includes('hub.selloutcrowds.com') || hostname.includes('office.selloutcrowds.com');
      if (!isKnownDomain && pathname.length > 1) {
          const rawPath = pathname.substring(1);
          if (rawPath && rawPath !== '') {
              const decodedPath = decodeURIComponent(rawPath);
              fetch(`/api/resolve-scout/${encodeURIComponent(decodedPath)}`)
                  .then(res => res.json())
                  .then(data => {
                      if (data.success && data.username) {
                          window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(data.username)}`;
                      } else {
                          window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(decodedPath)}`;
                      }
                  })
                  .catch(() => {
                      window.location.href = `https://studio.selloutcrowds.com/scout.php?u=${encodeURIComponent(decodedPath)}`;
                  });
          } else {
              window.location.href = 'https://selloutcrowds.com';
          }
          return;
      }
  }, []);

  useEffect(() => {
    if (session) {
        localStorage.setItem('bridge_session', session);
    } else {
        localStorage.removeItem('bridge_session');
        localStorage.removeItem('bridge_unadata'); 
        localStorage.removeItem('bridge_refresh'); 
    }
  }, [session]);

  useEffect(() => { localStorage.setItem('bridge_unadata', JSON.stringify(unaData)); }, [unaData]);

  useEffect(() => {
    if (isPublicBio || isRedirecting) return; 
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
  }, [isPublicBio, isRedirecting, session]);

  const handleLogout = () => {
    setSession(null);
    setUnaData({ user: null, crowds: [], spaces: [], debug: null });
    setCurrentApp('dashboard');
    setActiveTab('home');
    localStorage.removeItem('bridge_refresh');
    try {
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);
    } catch(e) {}
  };

  const startLogin = () => {
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
        if (data.refresh_token) {
            localStorage.setItem('bridge_refresh', data.refresh_token);
        }
        fetchUser(data.access_token); 
        syncCommunities(data.access_token);

        const pendingOAuth = localStorage.getItem('hub_pending_oauth');
        if (pendingOAuth) {
            localStorage.removeItem('hub_pending_oauth');
            window.location.href = pendingOAuth; 
            return;
        }

        localStorage.removeItem('hub_login_redirect_app');
        localStorage.removeItem('hub_login_redirect_tab');
        
        let newUrl = new URL(window.location);
        newUrl.searchParams.delete('code');
        newUrl.searchParams.delete('state');
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
      
      const rawRedirect = oauthParams?.redirect_uri || new URLSearchParams(window.location.search).get('redirect_uri');
      
      if (!rawRedirect) {
          setOauthError("Missing WordPress return link. Please start over from your WordPress site.");
          setOauthApproving(false);
          return;
      }

      try {
          const res = await fetch('/api/oauth/approve', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  client_id: oauthParams?.client_id || 'wordpress_global_app', 
                  redirect_uri: rawRedirect 
              })
          });
          
          if (res.status === 401) { 
              setOauthApproving(false);
              window.dispatchEvent(new Event('unauthorized')); 
              return; 
          }
          
          const data = await res.json();
          
          if (data.success) {
              try {
                  const redirectUrl = new URL(decodeURIComponent(rawRedirect));
                  redirectUrl.searchParams.set('code', data.code);
                  if (oauthParams?.state) redirectUrl.searchParams.set('state', oauthParams.state);
                  window.location.href = redirectUrl.toString();
              } catch (urlErr) {
                  const decodedFallback = decodeURIComponent(rawRedirect);
                  const separator = decodedFallback.includes('?') ? '&' : '?';
                  let fallbackUrl = `${decodedFallback}${separator}code=${data.code}`;
                  if (oauthParams?.state) fallbackUrl += `&state=${oauthParams.state}`;
                  window.location.href = fallbackUrl;
              }
          } else {
              setOauthError(data.error || "Failed to generate authorization code.");
              setOauthApproving(false);
          }
      } catch (err) {
          setOauthError("Server error during approval. Please try again.");
          setOauthApproving(false);
      }
  };

  const handleCancelOAuth = () => {
      const rawRedirect = oauthParams?.redirect_uri || new URLSearchParams(window.location.search).get('redirect_uri');
      if (rawRedirect) {
          try {
              const redirectUrl = new URL(decodeURIComponent(rawRedirect));
              redirectUrl.searchParams.set('soc_error', 'access_denied');
              window.location.href = redirectUrl.toString();
          } catch (urlErr) {
              const decodedFallback = decodeURIComponent(rawRedirect);
              const separator = decodedFallback.includes('?') ? '&' : '?';
              window.location.href = `${decodedFallback}${separator}soc_error=access_denied`;
          }
      }
  };

  if (isRedirecting) {
      return (
         <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#9df01c] font-sans">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <span className="font-black uppercase tracking-[0.3em] text-[10px]">Verifying...</span>
         </div>
      );
  }

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
                  <PublicCardView data={publicCardData} isFullScreen={true} slug={publicSlug} />
              )}
              <a href="https://selloutcrowds.com" className={`mt-12 text-[10px] font-bold uppercase tracking-widest transition-colors ${isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                  Powered by Sellout Crowds
              </a>
          </div>
      );
  }

  if (!session) {
      return <LoginScreen logoUrl={logoUrl} error={error} isLoading={isLoading} startLogin={startLogin} />;
  }

  if (isOAuthFlow && session && unaData.user) {
      return (
          <OAuthScreen 
              logoUrl={logoUrl} 
              unaData={unaData} 
              oauthParams={oauthParams} 
              oauthError={oauthError} 
              oauthApproving={oauthApproving} 
              handleApproveOAuth={handleApproveOAuth}
              handleCancelOAuth={handleCancelOAuth} 
          />
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
      return <UpgradeScreen handleLogout={handleLogout} />;
  }

  const renderApp = () => {
      switch (currentApp) {
          case 'dashboard':
              return <DashboardApp session={session} unaData={unaData} handleAppSwitch={handleAppSwitch} />;
          case 'business-card':
              return <BusinessCardApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'address-book':
              return <AddressBookApp session={session} unaData={unaData} />;
          case 'linktree':
              return <BioPageApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'community-link':
              return <CommunityLinkApp session={session} unaData={unaData} />;
          case 'bridge':
              return <BridgeApp session={session} unaData={unaData} activeTab={activeTab} />;
          case 'teammates':
              return <TeammatesApp session={session} unaData={unaData} />;
          case 'assets':
              return <AssetsApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'guides':
              return <GuidesApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'onboarding':
              return <OnboardingApp session={session} unaData={unaData} />;
          case 'content':
              return <ContentApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'newsletter':
              return <NewsletterApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          case 'affiliate':
              return <AffiliateApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} handleAppSwitch={handleAppSwitch} />;
          case 'youtube':
              return <YoutubeSyncApp session={session} unaData={unaData} activeTab={activeTab} setActiveTab={setActiveTab} />;
          default:
              return <PlaceholderApp currentApp={currentApp} />;
      }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden flex-col lg:flex-row pb-16 lg:pb-0 relative">
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

        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative z-0">
            <TopBar 
                currentApp={currentApp} 
                handleAppSwitch={handleAppSwitch}
                isAppSwitcherOpen={isAppSwitcherOpen}
                setIsAppSwitcherOpen={setIsAppSwitcherOpen}
                handleLogout={handleLogout}
                unaData={unaData}
            />
            
            <main className="flex-1 overflow-auto relative custom-scrollbar">
                {renderApp()}
            </main>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-4 sm:px-6 z-50">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 transition-colors flex flex-col items-center gap-1 ${isMobileMenuOpen ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                <span className="text-[9px] font-bold uppercase tracking-widest">{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
            </button>
            <button onClick={() => handleAppSwitch('dashboard', 'home')} className={`p-2 transition-colors flex flex-col items-center gap-1 ${currentApp === 'dashboard' ? 'text-[#9df01c]' : 'text-gray-500 hover:text-white'}`}>
                <LayoutDashboard size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Office</span>
            </button>
            <button onClick={triggerMobileQRCode} className="p-2 text-gray-500 hover:text-[#9df01c] transition-colors flex flex-col items-center gap-1">
                <QrCode size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">QR Code</span>
            </button>
            <button onClick={triggerMobileAddContact} className="p-2 text-gray-500 hover:text-[#9df01c] transition-colors flex flex-col items-center gap-1">
                <UserPlus size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Contact</span>
            </button>
        </div>

        {sessionExpired && (
            <SessionExpiredModal 
                setSessionExpired={setSessionExpired} 
                handleLogout={handleLogout} 
                startLogin={startLogin}
            />
        )}
    </div>
  );
}