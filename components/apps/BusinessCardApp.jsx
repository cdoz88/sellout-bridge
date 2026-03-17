import React, { useState, useEffect } from 'react';
import { Camera, Save, Loader2, Share2, QrCode, Download, Link2, MonitorSmartphone, UploadCloud, X, Palette, Image as ImageIcon, Phone, Mail, Globe, Linkedin, Facebook, Youtube, Instagram, ArrowRight, User, FileText, MessageSquare, ShoppingBag, GripVertical, Trash2, Plus } from 'lucide-react';

const TiktokIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
);

const XIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const WhatsappIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
);

const BlueskyIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566 1.054 0 2.228 0 5.462c0 3.018.508 5.014 1.125 5.922 1.258 1.85 4.542 2.502 6.275 2.197-2.888.751-6.155 1.512-6.155 4.161 0 3.23 4.227 4.887 7.025 2.197C10.875 17.414 12 14.536 12 14.536s1.125 2.878 3.73 5.403c2.798 2.69 7.025 1.033 7.025-2.197 0-2.649-3.267-3.41-6.155-4.161 1.733.305 5.017-.347 6.275-2.197.617-.908 1.125-2.904 1.125-5.922 0-3.234-2.566-4.408-5.202-2.343-2.752 1.942-5.711 5.881-6.798 7.995z"/>
    </svg>
);

const TwitchIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
    </svg>
);

const SelloutIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 362.85 305.65" fill="currentColor" className={className}>
        <g>
            <path d="m321.31,285.9l-17.52-1.66c-2.92-.25-5.84-.61-8.76-.77l-8.77-.55-8.77-.55c-2.92-.19-5.85-.39-8.77-.46l-17.54-.63c-2.92-.13-5.85-.17-8.77-.2l-8.77-.11-8.77-.11c-2.92-.05-5.84.03-8.77.03l-17.53.15-17.52.46c-23.35.76-46.66,2.03-69.94,3.85-5.82.49-11.64.93-17.45,1.46-5.81.56-11.63,1.04-17.43,1.67l-8.71.9-8.71.97c-5.82.66-11.59,1.36-17.46,2.15l1.83,13.13c5.64-.75,11.41-1.46,17.15-2.11l8.62-.96,8.63-.89c5.75-.62,11.52-1.1,17.28-1.65,5.76-.52,11.53-.96,17.3-1.45,23.08-1.8,46.2-3.06,69.32-3.82l17.34-.46,17.34-.15c2.89,0,5.78-.08,8.67-.03l8.66.11,8.66.11c2.89.03,5.78.06,8.66.19l17.31.62c2.89.07,5.76.27,8.64.45l8.63.54,8.63.54c2.88.16,5.74.51,8.61.76l17.2,1.62,1.48-13.17Z" strokeWidth={0} />
            <path d="m99.19,298.5c-.15.06-.42.09-.72.12.07-.08.47-.17.72-.12Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m87.32,290.56c-.22.06-.91.2-.85.04.4-.05.56-.03.85-.04Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m86.1,290.47c-.05.08-.6.06-.85.11,0-.09.69-.14.85-.11Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m82.83,292.15c-.17.07-.63.15-.85.11.05-.08.6-.06.85-.11Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m81.14,290.86c-.28.11-.78.19-1.45.23.23-.12.93-.17,1.45-.23Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m77.63,298.32c-.74.08-2.23.36-2.77.27.91,0,1.93-.26,2.77-.27Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m75.33,295.45c-.9.28-2.58.24-3.74.49-.18-.14,1.73-.2,2.05-.36.28-.02.5,0,.72,0,.33-.05.62-.18.97-.13Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m63.97,296.18c.03.08-.04.14-.36.17-.09-.02-.13-.06-.12-.12l.48-.05Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m59.4,297.8c-.73.23-2.43.42-3.38.43-.12.04-.12.09-.36.11-.56.09-1.82.18-.6.04,1.49-.29,2.69-.32,4.34-.57Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m58.65,296.25c-.17.07-.47.12-.84.15.08-.09.7-.17.84-.15Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m58,300.59c-.13.09-.76.09-1.08.15.23-.07.81-.19,1.08-.15Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m57.82,296.9c-.29.12-.96.17-1.33.27-.34-.09.87-.21,1.33-.27Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m57.21,296.5c-.23.12-.93.18-1.45.26.3-.11.98-.18,1.45-.26Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m56.93,301.49c-.03.11-.5.16-.84.23.06-.11.55-.15.84-.23Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m56.31,300.78c-.38.14-1.73.27-2.4.34.84-.18,1.48-.25,2.4-.34Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m55.52,296.79c-.6.22-1.53.22-2.05.26.56-.15,1.41-.1,2.05-.26Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m54.1,298.48c-.23.08-.63.14-.96.21-.08-.13.56-.15.96-.21Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m53.01,298.28c-.28.11-.54.11-.96.14.09-.08.68-.09.96-.14Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m51.92,298.01c-.12.1-1.03.23-.85.03.26-.04.23.02.24.07.29-.02.26-.09.6-.1Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m49.68,300.78c.58-.2,1.62-.13,0,0h0Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m48.51,302.12c-.49.13-.97.17-1.56.22.36-.09,1.31-.22,1.56-.22Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m48.16,302.36c.19.08-.78.19-.6.07l.6-.07Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m47.25,304.2c-.16.09-.54.15-.83.17.08-.09.69-.18.83-.17Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m43.91,304.48c-.96.28-1.33.17,0,0h0Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m70.89,301.38c-.2.06-.47.11-.6.19-.39-.09-1.05.09-1.56.09.6-.21,1.28-.09,2.17-.27Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m57.14,300.1c-.29.05-.26-.03-.6.04-.04-.05.11-.07.12-.11-.6.05-.93.14-1.44.2.06-.03.12-.07.12-.11-.66.25-1.48.08-2.89.33,1.33-.34,4.35-.58,5.53-.75-.16.14-1.21.15-1.32.31-.02.1.67-.06.48.11Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m55.53,297.21c-.14.02-.07.04,0,.03-.03.08-.53.08-.6.07.14-.11,1.74-.25.6-.1Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m46.61,298.67v-.13c-.77.11-2,.29-2.54.24.9-.21,2.86-.23,3.49-.52.16.01.45-.02.6,0,2.1-.47,4.44-.52,6.63-.92-.95.46-3.25.26-4.34.75-.19,0,0-.03.12-.05-.98.12-2.74.26-3.97.63Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m47.93,302.65c-.18.08-.51.14-.71.22-.11,0,.46-.27.71-.22Z" fillRule="evenodd" strokeWidth={0} />
            <path d="m289.44,296.4c.54.04,1.14-.05,1.7-.01,1.32.08,2.5.28,3.84.3,1.18,0,2.3-.03,3.53.04.91.06,1.21.04,1.82.05,1.78.05,3.23.25,4.03-.01,1.26-.1,2.84-.08,3.95-.18.17-.02.54.04.61.03,2.82-.25,4.61-.93,7.92-.99.31-.16.53-.42,1.11-.6.26-.08.83-.1,1.02-.19.71-.34.18-.9,1.46-1.09.08-.09-.14-.14-.2-.22.13-.8-.3-1.52.08-2.11-.82-.45-.58-.85-1.21-1.26-.39-.25-1.18-.53-1.69-.79-.58-.29-1.2-.54-1.69-.82.03-.24-.74-.36-.87-.58-.93-.24-1.63-.51-2.57-.75-.08-.09-.31-.16-.32-.26-1.98-.6-3.97-1.31-6.73-1.73-.25-.04-.78-.12-1.09-.14-2.06-.19-5.22-.57-6.27-.99-.37-.06-.37.02-.74-.04-.22-.19-1.29-.53-2.24-.59-.33-.02-.91.15-1.63.15-1.07-.01-2.06-.36-3.02-.37-.44,0-.92.15-1.39.16-1.21.04-3.63-.2-4.63-.33-.79-.1-1.08-.27-1.68-.28-.55,0-.97.14-.93.39-1.59.45-5.58-.23-7.99-.14-1.75-.33-3.45-.02-5.14-.13-.34-.02-.74-.1-1.09-.11-.58-.02-1.35.06-2.1.07-1.27.02-2.39-.03-3.43.01-1.6-.38-2.8-.05-4.16-.11-.51-.02-1-.15-1.57-.16-.48-.02-.95.06-1.47.03-.52-.03-1.07-.15-1.57-.16-.38-.01-.68.04-.98.02-.4-.02-.66-.11-1.09-.11-.45,0-.91.11-1.36.1-1.66-.02-3.45-.18-5.02.05-2.83-.24-5.3.06-8.65-.2-.84.05-1.45.09-2.32.02-.19.02-.19.1-.5.09-1.74-.12-3.58.13-5.37,0-.06.04-.14.07-.25.09-2.48-.2-5.62-.24-7.56-.02-1.51-.15-3.27.05-5.12.07-.88,0-1.74-.07-2.56-.03-1.6.08-3.7.02-5.25.07-.46.02-.91.11-1.35.13-.81.03-1.69-.05-2.56,0-3.35.18-7.19.18-10.12.25-.91.02-1.68.15-2.69.21-1.68.11-3.43-.02-5.11.07-.42.02-.83.1-1.22.12-1.01.06-1.98.02-3.04.06-2.61.08-5.22.32-7.68.29-3.12.35-7.69.47-11.33.66-.81.21-1.59.09-2.44.15-2.6.18-5.92.51-8.65.55-5.72.48-11.56.86-17.38,1.25-5.82.45-11.63.92-17.27,1.49-.9-.07-2.26.1-3.03.27-.17-.07-.69-.02-1.09-.02-1.4.33-3.19.3-4.98.5-.44.25-1.53.18-2.19.39-.3-.09.38-.13-.12-.15-1.13.48-5.05.62-6.8.87.12,0,.15.05,0,.07-.43-.06-.62.15-1.09.18-3.18.33-5.42.92-8.12,1.31-.35-.02-1.27-.1-1.57.07.49-.02,1.11-.09,1.09.07-.82.02-1.89.2-2.42.37-1.01.11-1.53.07-2.42.27-.22.02.23.14-.24.18-1.42.05-2.12.25-3.39.3-.35.19-1.83.38-2.3.35-.41.11.47.08.12.15-1.14.17-2.2.34-3.27.35-.25.1-.42.21-.85.28-.29.04.07-.15-.36-.06-.4.13.33.12.24.24-.57.11-.45.18-.72.3-.81,0-1.34.23-2.06.36-.74.13-1.58.16-2.3.29-.62.1-.87.24-1.57.32-.57.06-1.06,0-1.69.08-.33.06.24.09-.24.16-2.21.29-4.42.57-6.04.96,2.48-.53,4.34-.47,6.52-.95.35.11.98-.2,1.33-.04.14-.1-.38-.1.12-.14.16,0,.23.02.48-.02-.29.21.17.16.37.25,1.87-.23,3.34-.41,4.95-.61.3-.07-.22-.08.12-.14.61-.09,1.09-.12,1.81-.24.23.11.73.12.48.31-2.19.22-5.13.77-7.73,1.07-.79.1-1.62.06-2.05.31,1.16-.19,2.12-.08,3.14-.16,1.32-.11,2.7-.46,3.99-.55.36-.02.52.02.84-.02.26-.03.68-.17.97-.19.31-.03.34.04.6,0,.55-.07.96-.22,1.57-.28,1.02-.1,2.03-.08,3.14-.24.21.04.13.19-.12.24-1.32.14-1.55.17-2.9.31.15,0,.25.02.24.07-.42.03-.57,0-.85.11,1-.11.94.15.61.3-2.5.21-5.55.64-7.61.76-.22.09-.35.2-.72.26-2.3.34-4.89.55-7.36.9,2.84-.12,5.78-.59,9.05-1,.13.02.04.12.36.06,1.39-.24,3.02-.38,4.1-.52.5.09.98.18,1.45.28,3.43-.47,6-.17,9.29-.46,0,.1.25.1.36.16-.26.1-.42.23-.72.32-.54.06-1.09.16-1.57.14-2.75.54-6.7.77-10.13,1.28-.4.2-.06.29.24.4,1.67-.08,3.16-.46,4.94-.44.67.32.03.65-1.32.81-2.25.27-6.13.63-7.59.73-6.57.94-13.12,1.59-19.84,2.6,3.76-.37,7.19-1.02,10.57-1.24-.02-.07.1-.11.36-.14,3.31-.32,6.98-.77,9.87-1.18,1.24.11,3.56-.41,4.82-.3-.27.4-1.26.67-2.53.89,1.3-.16,2.52-.16,3.61-.25.9-.07,2.43-.34,2.89-.31.11,0-.09.1.12.09-.37.03.65-.09.72-.1.48-.09.39-.11.96-.16.74-.06.73-.06,1.2-.01,2.56-.18,5.04-.53,7.59-.69.27-.02.8-.07.84-.07.24,0,.04.08.36.07.18,0,.09-.08.36-.1,1-.06,2.14-.14,3.13-.24,2.49-.27,5.45-.41,7.48-.59.46-.01-.13.15.48.09,3.51-.21,7.22-.45,10.97-.73.28-.01.07.15.48.09.52-.02.38-.17.85-.19.29.02.56.05.72.12,4.31-.18,8.73-.63,13.16-1,4.13-.36,8.28-.6,12.2-.84,3.09-.2,6.05-.51,8.82-.57,1.85-.16,3.58-.29,5.29-.39,1.7-.08,3.38-.16,5.11-.24,2.51-.12,5.27-.16,7.38-.33.36-.03.79-.12,1.22-.14.64-.03,1.29.05,1.93.03,1.73-.07,3.49-.28,5.21-.35,1.93-.07,3.79-.08,5.68-.12,1.07-.02,2.09-.15,3.15-.19.7-.02,1.44.04,2.17.02,2.04-.06,4.12-.26,6.06-.28,2.59-.02,5.24.02,7.86-.16,2.9.06,6.42.04,9.19-.04,2.25.24,4.59-.05,7.13,0,.27,0,.45.05.72.06,1.92.08,3.96.02,5.9-.03,1.94-.02,3.79-.04,5.35.07,1.17-.15,2.17.04,3.26.1,1.17.06,2.26-.04,3.39-.03.37,0,.71.07,1.08.09,1.14.04,2.26-.05,3.52-.06,1.88,0,3.88.3,6.03.15,1.66.12,4.12.39,6.03.3,3.21.36,6.47.19,9.77.42,1.11.08,2.12.29,3.25.17,1.16.22,2.55.16,3.97.24,1.4.07,2.86.22,4.32.36,2.08.19,4.68.21,6.22.66.67.78,2.11-.21,3.76.04.87.2.74.4,1.1.69.78.16,1.52.14,2.29.13.89.13,1.51.5,2.7.58Zm-211.94-2.69s-.03-.06-.12-.05c.24-.18.84-.01.12.05Zm-.24.09c-1,.12-2.4.41-3.14.37-.2.02.19.17-.12.24-.44-.04-.95-.04-1.69.03-.08-.26,1.41-.25,1.45-.5.57-.04.85-.05,1.09-.2,1.17-.03,1.41-.22,2.3-.22-.22.18.17.1.12.28Z" fillRule="evenodd" strokeWidth={0} />
        </g>
    </svg>
);

const DEFAULT_LINKS = [
    { id: 'phone', type: 'phone', title: 'Phone Number', defaultSubtitle: 'Call or Text', url: '' },
    { id: 'email', type: 'email', title: 'Email Address', defaultSubtitle: 'Email me', url: '' },
    { id: 'website', type: 'website', title: 'Official Website', defaultSubtitle: 'Visit my site', url: '' },
    { id: 'shop', type: 'shop', title: 'Official Shop', defaultSubtitle: 'Browse my store', url: '' },
    { id: 'sellout', type: 'sellout', title: 'Sellout Crowds', defaultSubtitle: 'Join my community', url: '' },
    { id: 'instagram', type: 'instagram', title: 'Instagram', defaultSubtitle: 'Follow me', url: '' },
    { id: 'tiktok', type: 'tiktok', title: 'TikTok', defaultSubtitle: 'Watch my videos', url: '' },
    { id: 'youtube', type: 'youtube', title: 'YouTube', defaultSubtitle: 'Subscribe to my channel', url: '' },
    { id: 'facebook', type: 'facebook', title: 'Facebook', defaultSubtitle: 'Connect on Facebook', url: '' },
    { id: 'twitter', type: 'twitter', title: 'X', defaultSubtitle: 'Follow for updates', url: '' },
    { id: 'linkedin', type: 'linkedin', title: 'LinkedIn', defaultSubtitle: 'Professional network', url: '' },
    { id: 'whatsapp', type: 'whatsapp', title: 'WhatsApp', defaultSubtitle: 'Chat with me', url: '' },
    { id: 'bluesky', type: 'bluesky', title: 'Bluesky', defaultSubtitle: 'Follow me', url: '' },
    { id: 'twitch', type: 'twitch', title: 'Twitch', defaultSubtitle: 'Watch my stream', url: '' }
];

const DEFAULT_CARD = {
    name: "Your Name",
    title: "Your Title",
    company: "Your Company",
    links: DEFAULT_LINKS, 
    avatarUrl: "",
    logoUrl: "", 
    logoSize: 56, 
    logoOffsetX: 0, 
    themePreset: "default", 
    theme: "#9df01c",
    textColor: "#000000",
    iconColor: "#9df01c",
    cardBgColor: "#111111", 
    cardBgType: "dark",
    qrLogoEnabled: false, 
    qrLogoUrl: "", 
    qrLogoBg: "#ffffff"
};

const PRESETS = [
    { id: 'default', name: 'SC Dark', bg: '#111111', accent: '#9df01c', data: { cardBgColor: '#111111', cardBgType: 'dark', theme: '#9df01c', textColor: '#000000', iconColor: '#9df01c' } },
    { id: 'midnight', name: 'Midnight', bg: '#020617', accent: '#38bdf8', data: { cardBgColor: '#020617', cardBgType: 'dark', theme: '#38bdf8', textColor: '#020617', iconColor: '#38bdf8' } },
    { id: 'forest', name: 'Forest', bg: '#064e3b', accent: '#34d399', data: { cardBgColor: '#064e3b', cardBgType: 'dark', theme: '#34d399', textColor: '#064e3b', iconColor: '#34d399' } },
    { id: 'rose', name: 'Rose', bg: '#4c0519', accent: '#fb7185', data: { cardBgColor: '#4c0519', cardBgType: 'dark', theme: '#fb7185', textColor: '#4c0519', iconColor: '#fb7185' } },
    { id: 'clean', name: 'Clean Light', bg: '#f9fafb', accent: '#000000', data: { cardBgColor: '#f9fafb', cardBgType: 'light', theme: '#000000', textColor: '#ffffff', iconColor: '#000000' } },
    { id: 'custom', name: 'Custom', bg: 'linear-gradient(45deg, #333, #111)', accent: 'transparent' }
];

const getIconForType = (type) => {
    switch(type) {
        case 'phone': return Phone;
        case 'email': return Mail;
        case 'website': return Globe;
        case 'shop': return ShoppingBag;
        case 'sellout': return SelloutIcon;
        case 'instagram': return Instagram;
        case 'tiktok': return TiktokIcon;
        case 'youtube': return Youtube;
        case 'facebook': return Facebook;
        case 'twitter': return XIcon;
        case 'linkedin': return Linkedin;
        case 'whatsapp': return WhatsappIcon;
        case 'bluesky': return BlueskyIcon;
        case 'twitch': return TwitchIcon;
        case 'custom': return Link2; 
        default: return Link2;
    }
};

const getSubtitle = (link) => {
    if (link.type === 'phone' || link.type === 'email') return link.url;
    if (link.type === 'custom') return link.url.replace(/^https?:\/\//, '');
    if (link.type === 'website' || link.type === 'shop') return link.url.replace(/^https?:\/\//, '');
    return link.defaultSubtitle;
};

export const PublicCardView = ({ data, isFullScreen = false }) => {
    const bgType = data.cardBgType || data.cardMode || 'dark';
    const isLight = bgType === 'light';
    const cardBgColor = data.cardBgColor || (isLight ? '#ffffff' : '#111111');

    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [showPhoneAction, setShowPhoneAction] = useState(false);
    const [activePhoneString, setActivePhoneString] = useState(''); 

    const activeLinks = data.links || [];
    const emailLink = activeLinks.find(l => l.type === 'email' && l.url.trim());
    const primaryId = emailLink ? emailLink.url : data.name;

    useEffect(() => {
        if (primaryId) {
            const saved = localStorage.getItem(`sc_notes_${btoa(primaryId)}`);
            if (saved) setNotes(saved);
        }
    }, [primaryId]);

    const handleSaveNotes = () => {
        if (primaryId) {
            localStorage.setItem(`sc_notes_${btoa(primaryId)}`, notes);
        }
        setShowNotesModal(false);
    };
    
    const handleSaveContact = () => {
        const escapeVCardValue = (val) => (val || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
        let parts = ['BEGIN:VCARD', 'VERSION:3.0'];
        const nameParts = (data.name || 'Contact').trim().split(/\s+/);
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');

        parts.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)}`);
        parts.push(`FN:${escapeVCardValue(data.name)}`);
        if (data.company) parts.push(`ORG:${escapeVCardValue(data.company)}`);
        if (data.title) parts.push(`TITLE:${escapeVCardValue(data.title)}`);
        
        activeLinks.forEach(link => {
            if (!link.url || link.url.trim() === '') return;
            if (link.type === 'phone') parts.push(`TEL;TYPE=WORK,VOICE:${link.url}`);
            if (link.type === 'email') parts.push(`EMAIL:${link.url}`);
            if (link.type === 'website' || link.type === 'shop' || link.type === 'custom') parts.push(`URL:https://${link.url.replace(/^https?:\/\//,'')}`);
        });
        
        if (notes && notes.trim() !== '') parts.push(`NOTE:${escapeVCardValue(notes.trim())}`);
        parts.push('END:VCARD');

        const blob = new Blob([parts.join('\n')], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${(data.name || 'contact').replace(/\s/g, '_')}.vcf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const containerClasses = isFullScreen 
        ? "w-full max-w-md mx-auto font-sans relative" 
        : "w-full max-w-md mx-auto rounded-3xl shadow-2xl border overflow-hidden font-sans relative pb-8";
    const containerStyle = isFullScreen ? {} : { backgroundColor: cardBgColor, borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.05)' };
    const textNameClass = isLight ? 'text-gray-900' : 'text-white';
    const textCompanyClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const buttonBgClass = isLight ? 'bg-black/5 hover:bg-black/10 border border-black/5 shadow-sm' : 'bg-white/5 hover:bg-white/10 border border-white/5 shadow-lg';
    const buttonIconBgClass = isLight ? 'bg-white group-hover:bg-gray-50' : 'bg-black/20 group-hover:bg-black/40';
    const buttonTitleClass = isLight ? 'text-gray-900' : 'text-white';
    const buttonSubtitleClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const arrowClass = isLight ? 'text-gray-400' : 'text-gray-500';

    const renderLinks = activeLinks.filter(l => l.url && l.url.trim() !== '').map(link => {
        let formattedUrl = link.url.trim();
        if (link.type === 'phone') formattedUrl = `tel:${formattedUrl.replace(/\D/g, '')}`;
        else if (link.type === 'email') formattedUrl = `mailto:${formattedUrl}`;
        else if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

        return { ...link, subtitle: getSubtitle(link), url: formattedUrl, rawUrl: link.url.trim(), icon: getIconForType(link.type) };
    });

    return (
        <div className={containerClasses} style={containerStyle}>
            {data.logoUrl && (
                <div className="w-full flex justify-center pt-2 sm:pt-6 relative z-10">
                    <img 
                        src={data.logoUrl} 
                        alt="Company Logo" 
                        className="object-contain transition-transform" 
                        style={{ height: `${data.logoSize || 56}px`, transform: `translateX(${data.logoOffsetX || 0}px)` }} 
                    />
                </div>
            )}

            <div className={`relative flex justify-center ${data.logoUrl ? 'mt-6' : 'mt-12'}`}>
                {data.avatarUrl ? (
                    <img src={data.avatarUrl} className="w-28 h-28 rounded-full object-cover border-2 relative z-10" style={{ borderColor: data.theme, boxShadow: `0 0 35px ${data.theme}40` }} alt="Profile" />
                ) : (
                    <div className="w-28 h-28 rounded-full border-2 flex items-center justify-center text-4xl font-black relative z-10" style={{ backgroundColor: cardBgColor, borderColor: data.theme, color: data.theme, boxShadow: `0 0 35px ${data.theme}40` }}>
                        {data.name.charAt(0)}
                    </div>
                )}
            </div>
            
            <div className="pt-6 pb-2 px-6 text-center">
                <h1 className={`text-3xl font-black uppercase tracking-tight ${textNameClass}`}>{data.name}</h1>
                <p className="text-sm font-bold uppercase tracking-widest mt-2" style={{ color: data.theme }}>{data.company}</p>
                <p className={`text-xs font-medium mt-1 ${textCompanyClass}`}>{data.title}</p>

                <div className="mt-10 space-y-3 text-left">
                    {renderLinks.map(link => {
                        if (link.type === 'phone') {
                            return (
                                <button key={link.id} onClick={() => { setActivePhoneString(link.rawUrl); setShowPhoneAction(true); }} className={`w-full flex items-center gap-4 p-2 pr-4 rounded-2xl transition-all group text-left ${buttonBgClass}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${buttonIconBgClass}`} style={{ color: data.iconColor }}>
                                        <link.icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <p className={`text-sm font-bold uppercase tracking-wide truncate ${buttonTitleClass}`}>{link.title}</p>
                                        <p className={`text-xs truncate mt-0.5 ${buttonSubtitleClass}`}>{link.subtitle}</p>
                                    </div>
                                    <ArrowRight size={18} className={`flex-shrink-0 transition-transform group-hover:translate-x-1 ${arrowClass}`} />
                                </button>
                            );
                        }

                        return (
                            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className={`flex items-center gap-4 p-2 pr-4 rounded-2xl transition-all group ${buttonBgClass}`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${buttonIconBgClass}`} style={{ color: data.iconColor }}>
                                    <link.icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <p className={`text-sm font-bold uppercase tracking-wide truncate ${buttonTitleClass}`}>{link.title}</p>
                                    <p className={`text-xs truncate mt-0.5 ${buttonSubtitleClass}`}>{link.subtitle}</p>
                                </div>
                                <ArrowRight size={18} className={`flex-shrink-0 transition-transform group-hover:translate-x-1 ${arrowClass}`} />
                            </a>
                        );
                    })}
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={() => setShowNotesModal(true)} className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${isLight ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-[#111] border border-white/10 text-gray-300 hover:bg-white/5'}`}>
                        <FileText size={16} /> Notes
                    </button>
                    <button onClick={handleSaveContact} className="flex-[2] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: data.theme, color: data.textColor }}>
                        <Download size={16} /> Save Contact
                    </button>
                </div>
            </div>

            {showPhoneAction && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPhoneAction(false)}>
                    <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl relative ${isLight ? 'bg-white' : 'bg-[#111] border border-white/10'}`} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPhoneAction(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' : 'bg-white/10 hover:bg-white/20 text-gray-400'}`}><X size={16}/></button>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isLight ? 'bg-gray-100' : 'bg-white/5'}`} style={{ color: data.theme }}><Phone size={24} /></div>
                        <h3 className={`text-xl font-black uppercase tracking-tight mb-4 ${textNameClass}`}>Contact Options</h3>
                        <div className="space-y-3">
                            <a href={`tel:${activePhoneString.replace(/\D/g, '')}`} className={`flex items-center justify-between p-4 rounded-2xl font-bold transition-all border ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900' : 'bg-[#111] border-white/10 hover:bg-white/5 text-white'}`}>
                                <div className="flex items-center gap-3"><Phone size={18} style={{ color: data.theme }} /><span>Call {activePhoneString}</span></div>
                                <ArrowRight size={16} className={arrowClass} />
                            </a>
                            <a href={`sms:${activePhoneString.replace(/\D/g, '')}`} className={`flex items-center justify-between p-4 rounded-2xl font-bold transition-all border ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900' : 'bg-[#111] border-white/10 hover:bg-white/5 text-white'}`}>
                                <div className="flex items-center gap-3"><MessageSquare size={18} style={{ color: data.theme }} /><span>Text (SMS)</span></div>
                                <ArrowRight size={16} className={arrowClass} />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {showNotesModal && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowNotesModal(false)}>
                    <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl relative ${isLight ? 'bg-white' : 'bg-[#111] border border-white/10'}`} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowNotesModal(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' : 'bg-white/10 hover:bg-white/20 text-gray-400'}`}><X size={16}/></button>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isLight ? 'bg-gray-100' : 'bg-white/5'}`} style={{ color: data.theme }}><FileText size={24} /></div>
                        <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${textNameClass}`}>Personal Notes</h3>
                        <p className={`text-xs font-medium mb-6 ${buttonSubtitleClass}`}>Jot down details to remember this person. These save directly to your phone contacts.</p>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="4" placeholder="E.g., Met at the conference..." className={`w-full p-4 rounded-2xl text-sm outline-none border transition-colors mb-6 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400' : 'bg-[#0a0a0a] border-white/10 text-white focus:border-white/30'}`}></textarea>
                        <button onClick={handleSaveNotes} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: data.theme, color: data.textColor }}>Save Notes</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function BusinessCardApp({ session, activeTab }) {
    const [cardData, setCardData] = useState(DEFAULT_CARD);
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState({ avatar: false, logo: false, qrLogo: false });
    const [showQrModal, setShowQrModal] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [mobileView, setMobileView] = useState('edit');

    useEffect(() => {
        const handleOpenQrModal = () => {
            if (slug) setShowQrModal(true);
            else alert("Save your custom link first!");
        };
        window.addEventListener('open-qr-modal', handleOpenQrModal);
        return () => window.removeEventListener('open-qr-modal', handleOpenQrModal);
    }, [slug]);

    useEffect(() => {
        if (!session) return;
        fetch('/api/get-card', { headers: { 'Authorization': `Bearer ${session}` } })
            .then(res => {
                if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); throw new Error('401'); }
                return res.json();
            })
            .then(data => {
                if (data.card) {
                    let fetchedCard = data.card;
                    if (!fetchedCard.links) {
                        fetchedCard.links = DEFAULT_LINKS.map(defaultLink => ({ ...defaultLink, url: fetchedCard[defaultLink.type] || '' }));
                    } else {
                        const existingTypes = new Set(fetchedCard.links.map(l => l.type));
                        const missingLinks = DEFAULT_LINKS.filter(l => !existingTypes.has(l.type));
                        if (missingLinks.length > 0) {
                            fetchedCard.links = [...fetchedCard.links, ...missingLinks];
                        }
                    }
                    fetchedCard.links = fetchedCard.links.map(link => {
                        if (link.type === 'shop' && link.title === 'Shop URL') return { ...link, title: 'Official Shop' };
                        return link;
                    });
                    
                    setCardData({ ...DEFAULT_CARD, ...fetchedCard, logoOffsetX: fetchedCard.logoOffsetX || 0 }); 
                }
                if (data.slug) setSlug(data.slug);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session]);

    const handleSave = async () => {
        if (!slug || slug.trim() === '') { alert("Please claim a custom link on the 'Custom URL' page before saving!"); return; }
        setIsSaving(true);
        try {
            const res = await fetch('/api/save-card', { method: 'POST', headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ card: cardData, slug: slug }) });
            if (res.status === 401) { window.dispatchEvent(new Event('unauthorized')); return; }
            const result = await res.json();
            if (result.error) { alert(result.error); setIsSaving(false); return; }
            setTimeout(() => setIsSaving(false), 1000);
        } catch (err) { alert("Failed to save card."); setIsSaving(false); }
    };

    const handleImageUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(prev => ({ ...prev, [fieldName]: true }));
        const formData = new FormData(); formData.append('file', file);
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setCardData(prev => ({ ...prev, [fieldName]: result.url }));
            } else alert("Upload failed.");
        } catch (err) { alert("Image server unreachable."); } 
        finally { setIsUploading(prev => ({ ...prev, [fieldName]: false })); }
    };

    const handlePresetSelect = (preset) => {
        if (preset.id === 'custom') setCardData({ ...cardData, themePreset: 'custom' });
        else setCardData({ ...cardData, themePreset: preset.id, ...preset.data });
    };

    const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const newLinks = [...cardData.links];
        const draggedItem = newLinks[draggedIndex];
        newLinks.splice(draggedIndex, 1);
        newLinks.splice(index, 0, draggedItem);
        setDraggedIndex(index);
        setCardData({ ...cardData, links: newLinks });
    };
    const handleDragEnd = () => setDraggedIndex(null);

    const updateLink = (id, field, value) => {
        setCardData({ ...cardData, links: cardData.links.map(l => l.id === id ? { ...l, [field]: value } : l) });
    };
    const addCustomLink = () => {
        const newLink = { id: 'custom_' + Date.now(), type: 'custom', title: 'Custom Link', defaultSubtitle: 'Click here', url: '' };
        setCardData({ ...cardData, links: [...cardData.links, newLink] });
    };
    const removeLink = (id) => setCardData({ ...cardData, links: cardData.links.filter(l => l.id !== id) });

    const getShareUrl = () => slug ? `https://crowds.bio/${slug}` : '';
    const copyShareLink = () => {
        const url = getShareUrl();
        if (!url) { alert("Save your custom link first!"); return; }
        navigator.clipboard.writeText(url); alert("Public link copied to clipboard!");
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/> Loading Builder...</div>;

    const showPreviewCols = ['builder', 'design', 'url'].includes(activeTab);

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        {activeTab === 'design' ? 'Design' : activeTab === 'url' ? 'Custom URL' : 'Card Builder'}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        {activeTab === 'design' ? 'Customize the look and feel of your card.' : activeTab === 'url' ? 'Claim your custom public link.' : 'Update your contact and social information.'}
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button onClick={() => slug ? setShowQrModal(true) : alert('Save your custom link first!')} className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                        <QrCode size={14} /> <span className="hidden sm:inline">Get QR Code</span>
                    </button>
                    <button onClick={copyShareLink} className="px-4 py-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                        <Share2 size={14} /> <span className="hidden sm:inline">Copy Link</span>
                    </button>
                </div>
            </div>

            {showPreviewCols && (
                <div className="lg:hidden flex bg-black p-1 rounded-xl border border-white/10 mb-6">
                    <button onClick={() => setMobileView('edit')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mobileView === 'edit' ? 'bg-[#222] text-white shadow' : 'text-gray-500'}`}>Edit Mode</button>
                    <button onClick={() => setMobileView('preview')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${mobileView === 'preview' ? 'bg-[#222] text-white shadow' : 'text-gray-500'}`}>Live Preview</button>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-8">
                <div className={`space-y-6 lg:col-span-7 ${mobileView === 'preview' && showPreviewCols ? 'hidden lg:block' : ''}`}>
                    
                    {activeTab === 'url' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="mb-6 p-4 sm:p-6 bg-[#111] rounded-2xl border border-[#9df01c]/30 shadow-lg shadow-[#9df01c]/5">
                                <label className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3 block">Claim Your Public Link</label>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black p-1.5 sm:pl-4 rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors overflow-hidden">
                                    <div className="flex items-center flex-1 min-w-0 px-3 sm:px-0 py-2 sm:py-0">
                                        <span className="text-gray-500 font-bold whitespace-nowrap">crowds.bio /</span>
                                        <input type="text" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} placeholder="your-name" className="flex-1 bg-transparent text-white font-bold outline-none min-w-[50px] ml-1" />
                                    </div>
                                    <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-[#9df01c] text-black hover:bg-[#8ce015] px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-sm flex-shrink-0">
                                        {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}{isSaving ? '...' : 'Save'}
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-500 mt-2 font-medium">Letters, numbers, and hyphens only. This is what you will share with people!</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'builder' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6 shadow-lg">
                                <div className="relative shrink-0">
                                    {cardData.avatarUrl ? (
                                        <img src={cardData.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/10 bg-[#0a0a0a]" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={28} className="text-gray-500" /></div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-3 items-center sm:items-start text-center sm:text-left w-full">
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tighter text-white">Profile Photo</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Upload your professional headshot</p>
                                    </div>
                                    <label className={`px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center sm:justify-start gap-2 border border-white/10 w-full sm:w-auto ${isUploading.avatar ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading.avatar ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                        {isUploading.avatar ? 'Uploading...' : 'Upload Photo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatarUrl')} />
                                    </label>
                                </div>
                            </div>

                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8">
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><User size={18} className="text-[#9df01c]"/> Details</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Full Name</label><input type="text" value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" /></div>
                                    <div><label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Title</label><input type="text" value={cardData.title} onChange={e => setCardData({...cardData, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" /></div>
                                    <div className="sm:col-span-2"><label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Company</label><input type="text" value={cardData.company} onChange={e => setCardData({...cardData, company: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" /></div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-white flex items-center gap-2"><Link2 size={18} className="text-[#9df01c]"/> Links & Social Media</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Drag to reorder. Leave blank to hide.</p>
                                    
                                    <div className="flex flex-col gap-3">
                                        {cardData.links.map((link, index) => {
                                            const IconComponent = getIconForType(link.type);
                                            return (
                                                <div key={link.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black p-3 sm:p-2.5 rounded-xl border transition-all ${draggedIndex === index ? 'border-[#9df01c] opacity-50' : 'border-white/10 focus-within:border-white/30'}`}>
                                                    <div className="flex items-center w-full sm:w-auto">
                                                        <GripVertical size={16} className="text-gray-600 cursor-grab hover:text-white flex-shrink-0 ml-1 mr-2 sm:mr-0" />
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-gray-400 flex-shrink-0 mx-2"><IconComponent size={16} /></div>
                                                        {link.type === 'custom' ? (
                                                            <input type="text" value={link.title} onChange={(e) => updateLink(link.id, 'title', e.target.value)} className="bg-transparent text-white text-xs font-bold outline-none flex-1 sm:w-1/3 sm:hidden" placeholder="Link Title" />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex-1 sm:hidden">{link.title}</span>
                                                        )}
                                                        {link.type === 'custom' && <button onClick={() => removeLink(link.id)} className="text-gray-600 hover:text-red-500 p-2 sm:hidden flex-shrink-0"><Trash2 size={16} /></button>}
                                                    </div>
                                                    
                                                    <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full items-center pl-8 sm:pl-0 pr-2">
                                                        {link.type === 'custom' ? (
                                                            <input type="text" value={link.title} onChange={(e) => updateLink(link.id, 'title', e.target.value)} className="bg-transparent text-white text-xs font-bold outline-none w-full sm:w-1/3 hidden sm:block" placeholder="Link Title" />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-full sm:w-1/3 hidden sm:flex items-center">{link.title}</span>
                                                        )}
                                                        <input type="text" value={link.url} onChange={(e) => updateLink(link.id, 'url', e.target.value)} placeholder={link.type === 'phone' ? '(555) 555-5555' : link.type === 'email' ? 'email@example.com' : 'URL or username...'} className="bg-transparent text-white text-xs outline-none w-full flex-1 border-t border-white/5 pt-2 sm:border-none sm:pt-0" />
                                                    </div>
                                                    {link.type === 'custom' && <button onClick={() => removeLink(link.id)} className="text-gray-600 hover:text-red-500 p-2 mr-1 flex-shrink-0 rounded-lg hover:bg-red-500/10 transition-colors hidden sm:block"><Trash2 size={16} /></button>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={addCustomLink} className="mt-4 w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/30 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><Plus size={14} /> Add Custom Link</button>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}{isSaving ? 'Saving...' : 'Save Card'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'design' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8">
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Palette size={18} className="text-[#9df01c]"/> Branding</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 bg-black p-5 sm:p-8 rounded-2xl border border-white/5 items-center">
                                    <div className="flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-white/5 pb-8 sm:pb-0 sm:pr-8">
                                        <div className="mb-4 w-full flex items-center justify-center h-24 bg-white/5 rounded-xl border border-white/5">
                                            {cardData.logoUrl ? <img src={cardData.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" /> : <ImageIcon size={28} className="text-gray-600" />}
                                        </div>
                                        <label className={`w-full justify-center py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.logo ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isUploading.logo ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}{isUploading.logo ? 'Uploading...' : 'Brand Logo'}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                        </label>
                                        {cardData.logoUrl && <button onClick={() => setCardData({...cardData, logoUrl: ''})} className="mt-4 text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors">Remove Logo</button>}
                                    </div>

                                    <div className="flex flex-col justify-center space-y-8 sm:pl-4">
                                        <div className="w-full">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Logo Size</label>
                                                <span className="text-[9px] text-[#9df01c] font-bold">{cardData.logoSize || 56}px</span>
                                            </div>
                                            <input type="range" min="30" max="150" value={cardData.logoSize || 56} onChange={e => setCardData({...cardData, logoSize: e.target.value})} className="w-full accent-[#9df01c] cursor-pointer" />
                                        </div>

                                        <div className="w-full">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Horizontal Alignment</label>
                                                <span className="text-[9px] text-[#9df01c] font-bold">{cardData.logoOffsetX || 0}px</span>
                                            </div>
                                            <input type="range" min="-100" max="100" value={cardData.logoOffsetX || 0} onChange={e => setCardData({...cardData, logoOffsetX: e.target.value})} className="w-full accent-[#9df01c] cursor-pointer" />
                                            <div className="flex justify-between mt-2 px-1">
                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Left</span>
                                                <button onClick={() => setCardData({...cardData, logoOffsetX: 0})} className="text-[8px] text-gray-400 hover:text-white uppercase font-bold transition-colors">Center</button>
                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Theme Presets</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                                        {PRESETS.map(p => (
                                            <button key={p.id} onClick={() => handlePresetSelect(p)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${cardData.themePreset === p.id ? 'bg-white/10 border-[#9df01c]' : 'bg-black border-white/5 hover:border-white/20'}`}>
                                                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden" style={{ background: p.bg }}>{p.accent !== 'transparent' && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }}></div>}</div>
                                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {cardData.themePreset === 'custom' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in bg-black p-5 rounded-2xl border border-white/5">
                                            <div><label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Background Color</label><input type="color" value={cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#ffffff' : '#111111')} onChange={e => setCardData({...cardData, cardBgColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" /></div>
                                            <div>
                                                <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Text & Panel Mode</label>
                                                <div className="flex bg-black p-1 rounded-lg border border-white/10 h-12">
                                                    <button onClick={() => setCardData({...cardData, cardBgType: 'dark'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'dark' || !cardData.cardBgType ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>Dark</button>
                                                    <button onClick={() => setCardData({...cardData, cardBgType: 'light'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'light' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`}>Light</button>
                                                </div>
                                            </div>
                                            <div><label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Accent Color</label><input type="color" value={cardData.theme} onChange={e => setCardData({...cardData, theme: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" /></div>
                                            <div><label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Icons Color</label><input type="color" value={cardData.iconColor} onChange={e => setCardData({...cardData, iconColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" /></div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}{isSaving ? 'Saving...' : 'Save Branding'}</button>
                                </div>
                            </div>

                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 mt-6">
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><QrCode size={18} className="text-[#9df01c]"/> QR Code Settings</h3>
                                
                                <div className="flex items-center justify-between bg-black p-5 rounded-2xl border border-white/5 mb-4">
                                    <div><p className="text-sm font-bold text-white">Embed Logo in QR Code</p><p className="text-[10px] text-gray-500 font-medium mt-1">Place a logo directly in the center of your shareable QR code.</p></div>
                                    <button onClick={() => setCardData({...cardData, qrLogoEnabled: !cardData.qrLogoEnabled})} className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${cardData.qrLogoEnabled ? 'bg-[#9df01c]' : 'bg-white/10'}`}><div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${cardData.qrLogoEnabled ? 'left-7 bg-black' : 'left-1 bg-gray-400'}`}></div></button>
                                </div>
                                {cardData.qrLogoEnabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black p-5 rounded-xl border border-white/5 animate-in fade-in">
                                        <div><label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Logo Background Block</label><input type="color" value={cardData.qrLogoBg || '#ffffff'} onChange={e => setCardData({...cardData, qrLogoBg: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" /><p className="text-[9px] text-gray-600 mt-2">The color of the square sitting behind the logo.</p></div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Custom QR Logo (Optional)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center p-1 flex-shrink-0">{(cardData.qrLogoUrl || cardData.logoUrl) ? <img src={cardData.qrLogoUrl || cardData.logoUrl} className="max-w-full max-h-full object-contain" alt="QR center" /> : <ImageIcon size={16} className="text-gray-500" />}</div>
                                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                    <label className={`w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-white/10 ${isUploading.qrLogo ? 'opacity-50 pointer-events-none' : ''}`}>{isUploading.qrLogo ? <Loader2 size={12} className="animate-spin"/> : <UploadCloud size={12}/>}Upload Logo<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'qrLogoUrl')} /></label>
                                                    {cardData.qrLogoUrl && <button onClick={() => setCardData({...cardData, qrLogoUrl: ''})} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest text-center sm:text-left sm:pl-1">Use Main Brand Logo</button>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}{isSaving ? 'Saving...' : 'Save QR Settings'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: THE LIVE PREVIEW */}
                {showPreviewCols && (
                    <div className={`lg:col-span-5 ${mobileView === 'edit' ? 'hidden lg:block' : ''}`}>
                        <div className="lg:sticky lg:top-24 mt-8 lg:mt-0">
                            <div className="flex items-center justify-center gap-2 mb-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <MonitorSmartphone size={14} /> Live Preview
                            </div>
                            <div className={`p-4 sm:p-8 rounded-[3rem] border shadow-2xl transition-colors pointer-events-none ${cardData.cardBgType === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/10'}`} style={{ backgroundColor: cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#f9fafb' : '#050505') }}>
                               <PublicCardView data={cardData} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QR CODE MODAL */}
            {showQrModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative">
                        <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black uppercase italic text-white mb-2">Scan to Connect</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6 text-center">Have them open their camera app</p>
                        
                        <div className="bg-white p-3 rounded-2xl shadow-xl relative inline-flex items-center justify-center max-w-full">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=H&margin=0&data=${encodeURIComponent(getShareUrl())}`} alt="QR Code" className="w-48 h-48 max-w-full" />
                            {cardData.qrLogoEnabled && (cardData.qrLogoUrl || cardData.logoUrl) && (
                                <div className="absolute w-12 h-12 rounded-lg flex items-center justify-center p-1 shadow-md border-[3px] border-white overflow-hidden" style={{ backgroundColor: cardData.qrLogoBg || '#ffffff' }}>
                                    <img src={cardData.qrLogoUrl || cardData.logoUrl} alt="QR Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}