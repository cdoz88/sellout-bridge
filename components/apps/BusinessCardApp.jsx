import React, { useState, useEffect } from 'react';
import { Camera, Save, Loader2, Share2, QrCode, Download, MonitorSmartphone, Settings, UploadCloud, X, Palette, Image as ImageIcon, Phone, Mail, Globe, Linkedin, Facebook, Youtube, Instagram, ArrowRight, User } from 'lucide-react';

// Custom SVG for TikTok (Fixed clipping issue)
const TiktokIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.24-.71 4.46-1.92 6.25-1.2 1.81-2.92 3.15-4.96 3.79-2.14.65-4.52.54-6.52-.3-2.02-.85-3.66-2.45-4.56-4.45-.9-2.01-1.02-4.43-.33-6.51.68-2.08 2.2-3.79 4.16-4.7 1.95-.92 4.29-1.14 6.36-.61V14.8c-1.02-.38-2.19-.34-3.13.18-.95.52-1.61 1.48-1.74 2.57-.15 1.09.17 2.22.87 3.03.7.81 1.78 1.22 2.87 1.13 1.09-.09 2.08-.66 2.65-1.54.58-.89.81-2 .76-3.05V0h4.22z"/>
    </svg>
);

// Custom SVG for X
const XIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

// Custom SVG for Sellout Crowds
const SelloutIcon = ({ size=20, className="" }) => (
    <svg width={size} height={size} viewBox="0 0 362.85 305.65" fill="currentColor" className={className}>
        <path d="m321.31,285.9l-17.52-1.66c-2.92-.25-5.84-.61-8.76-.77l-8.77-.55-8.77-.55c-2.92-.19-5.85-.39-8.77-.46l-17.54-.63c-2.92-.13-5.85-.17-8.77-.2l-8.77-.11-8.77-.11c-2.92-.05-5.84.03-8.77.03l-17.53.15-17.52.46c-23.35.76-46.66,2.03-69.94,3.85-5.82.49-11.64.93-17.45,1.46-5.81.56-11.63,1.04-17.43,1.67l-8.71.9-8.71.97c-5.82.66-11.59,1.36-17.46,2.15l1.83,13.13c5.64-.75,11.41-1.46,17.15-2.11l8.62-.96,8.63-.89c5.75-.62,11.52-1.1,17.28-1.65,5.76-.52,11.53-.96,17.3-1.45,23.08-1.8,46.2-3.06,69.32-3.82l17.34-.46,17.34-.15c2.89,0,5.78-.08,8.67-.03l8.66.11,8.66.11c2.89.03,5.78.06,8.66.19l17.31.62c2.89.07,5.76.27,8.64.45l8.63.54,8.63.54c2.88.16,5.74.51,8.61.76l17.2,1.62,1.48-13.17Z" />
        <path d="m99.19,298.5c-.15.06-.42.09-.72.12.07-.08.47-.17.72-.12Z" />
        <path d="m87.32,290.56c-.22.06-.91.2-.85.04.4-.05.56-.03.85-.04Z" />
        <path d="m86.1,290.47c-.05.08-.6.06-.85.11,0-.09.69-.14.85-.11Z" />
        <path d="m82.83,292.15c-.17.07-.63.15-.85.11.05-.08.6-.06.85-.11Z" />
        <path d="m81.14,290.86c-.28.11-.78.19-1.45.23.23-.12.93-.17,1.45-.23Z" />
        <path d="m77.63,298.32c-.74.08-2.23.36-2.77.27.91,0,1.93-.26,2.77-.27Z" />
        <path d="m75.33,295.45c-.9.28-2.58.24-3.74.49-.18-.14,1.73-.2,2.05-.36.28-.02.5,0,.72,0,.33-.05.62-.18.97-.13Z" />
        <path d="m63.97,296.18c.03.08-.04.14-.36.17-.09-.02-.13-.06-.12-.12l.48-.05Z" />
        <path d="m59.4,297.8c-.73.23-2.43.42-3.38.43-.12.04-.12.09-.36.11-.56.09-1.82.18-.6.04,1.49-.29,2.69-.32,4.34-.57Z" />
        <path d="m58.65,296.25c-.17.07-.47.12-.84.15.08-.09.7-.17.84-.15Z" />
        <path d="m58,300.59c-.13.09-.76.09-1.08.15.23-.07.81-.19,1.08-.15Z" />
        <path d="m57.82,296.9c-.29.12-.96.17-1.33.27-.34-.09.87-.21,1.33-.27Z" />
        <path d="m57.21,296.5c-.23.12-.93.18-1.45.26.3-.11.98-.18,1.45-.26Z" />
        <path d="m56.93,301.49c-.03.11-.5.16-.84.23.06-.11.55-.15.84-.23Z" />
        <path d="m56.31,300.78c-.38.14-1.73.27-2.4.34.84-.18,1.48-.25,2.4-.34Z" />
        <path d="m55.52,296.79c-.6.22-1.53.22-2.05.26.56-.15,1.41-.1,2.05-.26Z" />
        <path d="m54.1,298.48c-.23.08-.63.14-.96.21-.08-.13.56-.15.96-.21Z" />
        <path d="m53.01,298.28c-.28.11-.54.11-.96.14.09-.08.68-.09.96-.14Z" />
        <path d="m51.92,298.01c-.12.1-1.03.23-.85.03.26-.04.23.02.24.07.29-.02.26-.09.6-.1Z" />
        <path d="m49.68,300.78c.58-.2,1.62-.13,0,0h0Z" />
        <path d="m48.51,302.12c-.49.13-.97.17-1.56.22.36-.09,1.31-.22,1.56-.22Z" />
        <path d="m48.16,302.36c.19.08-.78.19-.6.07l.6-.07Z" />
        <path d="m47.25,304.2c-.16.09-.54.15-.83.17.08-.09.69-.18.83-.17Z" />
        <path d="m43.91,304.48c-.96.28-1.33.17,0,0h0Z" />
        <path d="m70.89,301.38c-.2.06-.47.11-.6.19-.39-.09-1.05.09-1.56.09.6-.21,1.28-.09,2.17-.27Z" />
        <path d="m57.14,300.1c-.29.05-.26-.03-.6.04-.04-.05.11-.07.12-.11-.6.05-.93.14-1.44.2.06-.03.12-.07.12-.11-.66.25-1.48.08-2.89.33,1.33-.34,4.35-.58,5.53-.75-.16.14-1.21.15-1.32.31-.02.1.67-.06.48.11Z" />
        <path d="m55.53,297.21c-.14.02-.07.04,0,.03-.03.08-.53.08-.6.07.14-.11,1.74-.25.6-.1Z" />
        <path d="m46.61,298.67v-.13c-.77.11-2,.29-2.54.24.9-.21,2.86-.23,3.49-.52.16.01.45-.02.6,0,2.1-.47,4.44-.52,6.63-.92-.95.46-3.25.26-4.34.75-.19,0,0-.03.12-.05-.98.12-2.74.26-3.97.63Z" />
        <path d="m47.93,302.65c-.18.08-.51.14-.71.22-.11,0,.46-.27.71-.22Z" />
        <path d="m289.44,296.4c.54.04,1.14-.05,1.7-.01,1.32.08,2.5.28,3.84.3,1.18,0,2.3-.03,3.53.04.91.06,1.21.04,1.82.05,1.78.05,3.23.25,4.03-.01,1.26-.1,2.84-.08,3.95-.18.17-.02.54.04.61.03,2.82-.25,4.61-.93,7.92-.99.31-.16.53-.42,1.11-.6.26-.08.83-.1,1.02-.19.71-.34.18-.9,1.46-1.09.08-.09-.14-.14-.2-.22.13-.8-.3-1.52.08-2.11-.82-.45-.58-.85-1.21-1.26-.39-.25-1.18-.53-1.69-.79-.58-.29-1.2-.54-1.69-.82.03-.24-.74-.36-.87-.58-.93-.24-1.63-.51-2.57-.75-.08-.09-.31-.16-.32-.26-1.98-.6-3.97-1.31-6.73-1.73-.25-.04-.78-.12-1.09-.14-2.06-.19-5.22-.57-6.27-.99-.37-.06-.37.02-.74-.04-.22-.19-1.29-.53-2.24-.59-.33-.02-.91.15-1.63.15-1.07-.01-2.06-.36-3.02-.37-.44,0-.92.15-1.39.16-1.21.04-3.63-.2-4.63-.33-.79-.1-1.08-.27-1.68-.28-.55,0-.97.14-.93.39-1.59.45-5.58-.23-7.99-.14-1.75-.33-3.45-.02-5.14-.13-.34-.02-.74-.1-1.09-.11-.58-.02-1.35.06-2.1.07-1.27.02-2.39-.03-3.43.01-1.6-.38-2.8-.05-4.16-.11-.51-.02-1-.15-1.57-.16-.48-.02-.95.06-1.47.03-.52-.03-1.07-.15-1.57-.16-.38-.01-.68.04-.98.02-.4-.02-.66-.11-1.09-.11-.45,0-.91.11-1.36.1-1.66-.02-3.45-.18-5.02.05-2.83-.24-5.3.06-8.65-.2-.84.05-1.45.09-2.32.02-.19.02-.19.1-.5.09-1.74-.12-3.58.13-5.37,0-.06.04-.14.07-.25.09-2.48-.2-5.62-.24-7.56-.02-1.51-.15-3.27.05-5.12.07-.88,0-1.74-.07-2.56-.03-1.6.08-3.7.02-5.25.07-.46.02-.91.11-1.35.13-.81.03-1.69-.05-2.56,0-3.35.18-7.19.18-10.12.25-.91.02-1.68.15-2.69.21-1.68.11-3.43-.02-5.11.07-.42.02-.83.1-1.22.12-1.01.06-1.98.02-3.04.06-2.61.08-5.22.32-7.68.29-3.12.35-7.69.47-11.33.66-.81.21-1.59.09-2.44.15-2.6.18-5.92.51-8.65.55-5.72.48-11.56.86-17.38,1.25-5.82.45-11.63.92-17.27,1.49-.9-.07-2.26.1-3.03.27-.17-.07-.69-.02-1.09-.02-1.4.33-3.19.3-4.98.5-.44.25-1.53.18-2.19.39-.3-.09.38-.13-.12-.15-1.13.48-5.05.62-6.8.87.12,0,.15.05,0,.07-.43-.06-.62.15-1.09.18-3.18.33-5.42.92-8.12,1.31-.35-.02-1.27-.1-1.57.07.49-.02,1.11-.09,1.09.07-.82.02-1.89.2-2.42.37-1.01.11-1.53.07-2.42.27-.22.02.23.14-.24.18-1.42.05-2.12.25-3.39.3-.35.19-1.83.38-2.3.35-.41.11.47.08.12.15-1.14.17-2.2.34-3.27.35-.25.1-.42.21-.85.28-.29.04.07-.15-.36-.06-.4.13.33.12.24.24-.57.11-.45.18-.72.3-.81,0-1.34.23-2.06.36-.74.13-1.58.16-2.3.29-.62.1-.87.24-1.57.32-.57.06-1.06,0-1.69.08-.33.06.24.09-.24.16-2.21.29-4.42.57-6.04.96,2.48-.53,4.34-.47,6.52-.95.35.11.98-.2,1.33-.04.14-.1-.38-.1.12-.14.16,0,.23.02.48-.02-.29.21.17.16.37.25,1.87-.23,3.34-.41,4.95-.61.3-.07-.22-.08.12-.14.61-.09,1.09-.12,1.81-.24.23.11.73.12.48.31-2.19.22-5.13.77-7.73,1.07-.79.1-1.62.06-2.05.31,1.16-.19,2.12-.08,3.14-.16,1.32-.11,2.7-.46,3.99-.55.36-.02.52.02.84-.02.26-.03.68-.17.97-.19.31-.03.34.04.6,0,.55-.07.96-.22,1.57-.28,1.02-.1,2.03-.08,3.14-.24.21.04.13.19-.12.24-1.32.14-1.55.17-2.9.31.15,0,.25.02.24.07-.42.03-.57,0-.85.11,1-.11.94.15.61.3-2.5.21-5.55.64-7.61.76-.22.09-.35.2-.72.26-2.3.34-4.89.55-7.36.9,2.84-.12,5.78-.59,9.05-1,.13.02.04.12.36.06,1.39-.24,3.02-.38,4.1-.52.5.09.98.18,1.45.28,3.43-.47,6-.17,9.29-.46,0,.1.25.1.36.16-.26.1-.42.23-.72.32-.54.06-1.09.16-1.57.14-2.75.54-6.7.77-10.13,1.28-.4.2-.06.29.24.4,1.67-.08,3.16-.46,4.94-.44.67.32.03.65-1.32.81-2.25.27-6.13.63-7.59.73-6.57.94-13.12,1.59-19.84,2.6,3.76-.37,7.19-1.02,10.57-1.24-.02-.07.1-.11.36-.14,3.31-.32,6.98-.77,9.87-1.18,1.24.11,3.56-.41,4.82-.3-.27.4-1.26.67-2.53.89,1.3-.16,2.52-.16,3.61-.25.9-.07,2.43-.34,2.89-.31.11,0-.09.1.12.09-.37.03.65-.09.72-.1.48-.09.39-.11.96-.16.74-.06.73-.06,1.2-.01,2.56-.18,5.04-.53,7.59-.69.27-.02.8-.07.84-.07.24,0,.04.08.36.07.18,0,.09-.08.36-.1,1-.06,2.14-.14,3.13-.24,2.49-.27,5.45-.41,7.48-.59.46-.01-.13.15.48.09,3.51-.21,7.22-.45,10.97-.73.28-.01.07.15.48.09.52-.02.38-.17.85-.19.29.02.56.05.72.12,4.31-.18,8.73-.63,13.16-1,4.13-.36,8.28-.6,12.2-.84,3.09-.2,6.05-.51,8.82-.57,1.85-.16,3.58-.29,5.29-.39,1.7-.08,3.38-.16,5.11-.24,2.51-.12,5.27-.16,7.38-.33.36-.03.79-.12,1.22-.14.64-.03,1.29.05,1.93.03,1.73-.07,3.49-.28,5.21-.35,1.93-.07,3.79-.08,5.68-.12,1.07-.02,2.09-.15,3.15-.19.7-.02,1.44.04,2.17.02,2.04-.06,4.12-.26,6.06-.28,2.59-.02,5.24.02,7.86-.16,2.9.06,6.42.04,9.19-.04,2.25.24,4.59-.05,7.13,0,.27,0,.45.05.72.06,1.92.08,3.96.02,5.9-.03,1.94-.02,3.79-.04,5.35.07,1.17-.15,2.17.04,3.26.1,1.17.06,2.26-.04,3.39-.03.37,0,.71.07,1.08.09,1.14.04,2.26-.05,3.52-.06,1.88,0,3.88.3,6.03.15,1.66.12,4.12.39,6.03.3,3.21.36,6.47.19,9.77.42,1.11.08,2.12.29,3.25.17,1.16.22,2.55.16,3.97.24,1.4.07,2.86.22,4.32.36,2.08.19,4.68.21,6.22.66.67.78,2.11-.21,3.76.04.87.2.74.4,1.1.69.78.16,1.52.14,2.29.13.89.13,1.51.5,2.7.58Zm-211.94-2.69s-.03-.06-.12-.05c.24-.18.84-.01.12.05Zm-.24.09c-1,.12-2.4.41-3.14.37-.2.02.19.17-.12.24-.44-.04-.95-.04-1.69.03-.08-.26,1.41-.25,1.45-.5.57-.04.85-.05,1.09-.2,1.17-.03,1.41-.22,2.3-.22-.22.18.17.1.12.28Z" />
        <path d="m148.83,143.24c-9.14-8.94-14.98-21.48-17.42-34.23-2.71-12.63-3.99-25.75-3.66-38.65-1.16-30.21,23.88-54.66,54.06-53.06,22.34-1.51,46.43,14.47,52.05,39.42,1.57,7.33,1.33,14.78,1.23,22.28-1.11,21.91-4.06,46.24-19.83,62.79,3.23-5.34,5.74-11.05,7.47-17.01,4.63-17.88,4.25-36.6,2.76-54.91-.23-2.78-.55-5.83-1.29-8.51-4.26-19.24-23.49-33.41-43.08-31.71-18.12-1.21-35.99,10.94-41.4,28.36-1.43,3.93-1.93,8.62-2.32,12.81-.63,6.25-.82,12.37-.86,18.6.04,18.58,1.52,37.98,12.3,53.83h0Z" />
        <path d="m100.25,272.48L2.2,43.53c-2.95-6.9-2.94-14.8.04-21.68,2.98-6.89,8.73-12.31,15.78-14.88l14.49-5.29c13.79-5.03,29.02,1.64,34.68,15.17l43.74,100.47c.82,1.89,1.25,3.93,1.25,5.99l-8.6,12.94L52.51,22.98c-2.37-5.67-8.76-8.47-14.54-6.36l-14.49,5.29c-3,1.09-5.36,3.31-6.62,6.25-1.27,2.93-1.27,6.16-.02,9.1l82.74,198.35c.79,1.9,1.19,3.95,1.15,6.01l-.48,30.86Z" />
        <path d="m262.6,272.48l98.05-228.95c2.95-6.9,2.94-14.8-.04-21.68-2.98-6.89-8.73-12.31-15.78-14.88l-14.49-5.29c-13.79-5.03-29.02,1.64-34.68,15.17l-43.74,100.47c-.82,1.89-1.25,3.93-1.25,5.99l8.6,12.94,51.07-113.26c2.37-5.67,8.76-8.47,14.54-6.36l14.49,5.29c3,1.09,5.36,3.31,6.62,6.25,1.27,2.93,1.27,6.16.02,9.1l-82.74,198.35c-.79,1.9-1.19,3.95-1.15,6.01l.48,30.86Z" />
        <path d="m155.38,190.44h-18.92v15.88c0,4.32,3.15,6.49,9.46,6.49,8.25,0,15.13,2.2,20.64,6.6,5.87,4.68,8.81,10.87,8.81,18.56v20.76c0,3.81-1.47,7.06-4.4,9.76-2.9,2.66-6.35,3.99-10.35,3.99h-29.39c-4.01,0-7.46-1.33-10.35-3.99-2.94-2.7-4.4-5.95-4.4-9.76v-20.29h19.99v15.41h18.92v-15.88c0-4.32-3.15-6.48-9.46-6.48-8.25,0-15.13-2.2-20.64-6.6-5.87-4.68-8.81-10.87-8.81-18.56v-20.76c0-3.81,1.47-7.06,4.4-9.76,2.89-2.66,6.35-3.99,10.35-3.99h29.39c4.01,0,7.46,1.33,10.35,3.99,2.93,2.7,4.4,5.95,4.4,9.76v20.23h-19.99v-15.35Z" />
        <path d="m226.39,190.44h-18.92v63.42h18.92v-15.41h19.99v20.29c0,3.81-1.47,7.06-4.4,9.76-2.9,2.66-6.35,3.99-10.35,3.99h-29.39c-4.01,0-7.46-1.33-10.35-3.99-2.94-2.7-4.4-5.95-4.4-9.76v-73.18c0-3.81,1.47-7.06,4.4-9.76,2.89-2.66,6.35-3.99,10.35-3.99h29.39c4.01,0,7.46,1.33,10.35,3.99,2.93,2.7,4.4,5.95,4.4,9.76v20.23h-19.99v-15.35Z" />
    </svg>
);

const DEFAULT_CARD = {
    name: "Your Name",
    title: "Your Title",
    company: "Your Company",
    phone: "(555) 555-5555",
    email: "email@example.com",
    website: "yourwebsite.com",
    sellout: "",
    twitter: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    avatarUrl: "",
    logoUrl: "", 
    logoSize: 56, 
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

// --- THE PUBLIC CARD COMPONENT (FLOATING DESIGN) ---
export const PublicCardView = ({ data, isFullScreen = false }) => {
    const bgType = data.cardBgType || data.cardMode || 'dark';
    const isLight = bgType === 'light';
    const cardBgColor = data.cardBgColor || (isLight ? '#ffffff' : '#111111');
    
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
        if (data.phone) parts.push(`TEL;TYPE=WORK,VOICE:${data.phone}`);
        if (data.email) parts.push(`EMAIL:${data.email}`);
        if (data.website) parts.push(`URL:https://${data.website.replace(/^https?:\/\//,'')}`);
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
        : "w-full max-w-md mx-auto rounded-3xl shadow-2xl border overflow-hidden font-sans relative";
    
    const containerStyle = isFullScreen 
        ? {} 
        : { backgroundColor: cardBgColor, borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.05)' };

    const textNameClass = isLight ? 'text-gray-900' : 'text-white';
    const textCompanyClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const buttonBgClass = isLight ? 'bg-black/5 hover:bg-black/10 border border-black/5 shadow-sm' : 'bg-white/5 hover:bg-white/10 border border-white/5 shadow-lg';
    const buttonIconBgClass = isLight ? 'bg-white group-hover:bg-gray-50' : 'bg-black/20 group-hover:bg-black/40';
    const buttonTitleClass = isLight ? 'text-gray-900' : 'text-white';
    const buttonSubtitleClass = isLight ? 'text-gray-500' : 'text-gray-400';
    const arrowClass = isLight ? 'text-gray-400' : 'text-gray-500';

    const activeLinks = [
        { id: 'phone', title: 'Phone Number', subtitle: data.phone, url: `tel:${data.phone?.replace(/\D/g, '')}`, icon: Phone, active: !!data.phone },
        { id: 'email', title: 'Email Address', subtitle: data.email, url: `mailto:${data.email}`, icon: Mail, active: !!data.email },
        { id: 'website', title: 'Official Website', subtitle: data.website?.replace(/^https?:\/\//, ''), url: `https://${data.website?.replace(/^https?:\/\//, '')}`, icon: Globe, active: !!data.website },
        { id: 'sellout', title: 'Sellout Crowds', subtitle: 'Join my community', url: `https://${data.sellout?.replace(/^https?:\/\//, '')}`, icon: SelloutIcon, active: !!data.sellout },
        { id: 'instagram', title: 'Instagram', subtitle: 'Follow me', url: `https://${data.instagram?.replace(/^https?:\/\//, '')}`, icon: Instagram, active: !!data.instagram },
        { id: 'tiktok', title: 'TikTok', subtitle: 'Watch my videos', url: `https://${data.tiktok?.replace(/^https?:\/\//, '')}`, icon: TiktokIcon, active: !!data.tiktok },
        { id: 'youtube', title: 'YouTube', subtitle: 'Subscribe to my channel', url: `https://${data.youtube?.replace(/^https?:\/\//, '')}`, icon: Youtube, active: !!data.youtube },
        { id: 'facebook', title: 'Facebook', subtitle: 'Connect on Facebook', url: `https://${data.facebook?.replace(/^https?:\/\//, '')}`, icon: Facebook, active: !!data.facebook },
        { id: 'twitter', title: 'X', subtitle: 'Follow for updates', url: `https://${data.twitter?.replace(/^https?:\/\//, '')}`, icon: XIcon, active: !!data.twitter },
        { id: 'linkedin', title: 'LinkedIn', subtitle: 'Professional network', url: `https://${data.linkedin?.replace(/^https?:\/\//, '')}`, icon: Linkedin, active: !!data.linkedin }
    ].filter(l => l.active);

    return (
        <div className={containerClasses} style={containerStyle}>
            
            {data.logoUrl && (
                <div className="w-full flex justify-center pt-8 relative z-10">
                    <img src={data.logoUrl} alt="Company Logo" className="object-contain" style={{ height: `${data.logoSize || 56}px` }} />
                </div>
            )}

            <div className={`relative ${data.logoUrl ? 'mt-8' : 'mt-16'}`}>
                {data.avatarUrl ? (
                    <img src={data.avatarUrl} className="w-28 h-28 mx-auto rounded-full object-cover border-2 relative z-10" style={{ borderColor: data.theme, boxShadow: `0 0 35px ${data.theme}40` }} alt="Profile" />
                ) : (
                    <div className="w-28 h-28 mx-auto rounded-full border-2 flex items-center justify-center text-4xl font-black relative z-10" style={{ backgroundColor: cardBgColor, borderColor: data.theme, color: data.theme, boxShadow: `0 0 35px ${data.theme}40` }}>
                        {data.name.charAt(0)}
                    </div>
                )}
            </div>
            
            <div className="pt-6 pb-8 px-6 text-center">
                <h1 className={`text-3xl font-black uppercase tracking-tight ${textNameClass}`}>{data.name}</h1>
                <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: data.theme }}>{data.title}</p>
                <p className={`text-sm font-medium mt-1 ${textCompanyClass}`}>{data.company}</p>

                <div className="mt-10 space-y-3 text-left">
                    {activeLinks.map(link => (
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
                    ))}
                </div>

                <button onClick={handleSaveContact} className="mt-8 w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: data.theme, color: data.textColor }}>
                    <Download size={16} /> Save to Contacts
                </button>
            </div>
        </div>
    );
};

// --- THE BUILDER APP ---
export default function BusinessCardApp({ session, activeTab }) {
    const [cardData, setCardData] = useState(DEFAULT_CARD);
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState({ avatar: false, logo: false, qrLogo: false });
    const [showQrModal, setShowQrModal] = useState(false);

    useEffect(() => {
        if (!session) return;
        fetch('/api/get-card', { headers: { 'Authorization': `Bearer ${session}` } })
            .then(res => res.json())
            .then(data => {
                if (data.card) setCardData({ ...DEFAULT_CARD, ...data.card }); 
                if (data.slug) setSlug(data.slug);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [session]);

    const handleSave = async () => {
        if (!slug || slug.trim() === '') {
            alert("Please claim a custom link (e.g. your name) before saving!");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/save-card', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ card: cardData, slug: slug })
            });
            const result = await res.json();
            
            if (result.error) {
                alert(result.error); 
                setIsSaving(false);
                return;
            }
            
            setTimeout(() => setIsSaving(false), 1000);
        } catch (err) {
            alert("Failed to save card.");
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(prev => ({ ...prev, [fieldName]: true }));
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setCardData(prev => ({ ...prev, [fieldName]: result.url }));
            } else {
                alert("Upload failed.");
            }
        } catch (err) {
            alert("Image server unreachable.");
        } finally {
            setIsUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const handlePresetSelect = (preset) => {
        if (preset.id === 'custom') {
            setCardData({ ...cardData, themePreset: 'custom' });
        } else {
            setCardData({ ...cardData, themePreset: preset.id, ...preset.data });
        }
    };

    const getShareUrl = () => {
        if (!slug) return '';
        return `https://crowds.bio/${slug}`;
    };

    const copyShareLink = () => {
        const url = getShareUrl();
        if (!url) {
            alert("Save your custom link first!");
            return;
        }
        navigator.clipboard.writeText(url);
        alert("Public link copied to clipboard!");
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/> Loading Builder...</div>;

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white">
                        {activeTab === 'design' ? 'Design & Theme' : 'Card Builder'}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        {activeTab === 'design' ? 'Customize the look and feel of your card.' : 'Update your contact and social information.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => slug ? setShowQrModal(true) : alert('Save your custom link first!')} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                        <QrCode size={14} /> Get QR Code
                    </button>
                    <button onClick={copyShareLink} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#9df01c] text-black hover:bg-[#8ce015] transition-colors flex items-center gap-2 shadow-lg shadow-[#9df01c]/20">
                        <Share2 size={14} /> Copy Link
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                
                {/* LEFT: THE FORMS */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* TAB 1: BUILDER (CORE DETAILS) */}
                    {activeTab === 'builder' && (
                        <div className="animate-in fade-in duration-300">
                            
                            <div className="mb-6 p-6 bg-[#111] rounded-2xl border border-[#9df01c]/30 shadow-lg shadow-[#9df01c]/5">
                                <label className="text-[10px] text-[#9df01c] font-black uppercase tracking-widest mb-3 block">Claim Your Public Link</label>
                                <div className="flex items-center gap-2 bg-black p-1.5 pl-4 rounded-xl border border-white/10 focus-within:border-[#9df01c] transition-colors overflow-hidden">
                                    <span className="text-gray-500 font-bold whitespace-nowrap">crowds.bio /</span>
                                    <input 
                                        type="text" 
                                        value={slug} 
                                        onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} 
                                        placeholder="your-name" 
                                        className="flex-1 bg-transparent text-white font-bold outline-none min-w-[50px]"
                                    />
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaving} 
                                        className="bg-[#9df01c] text-black hover:bg-[#8ce015] px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-sm flex-shrink-0"
                                    >
                                        {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                                        {isSaving ? '...' : 'Save'}
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-500 mt-2 font-medium">Letters, numbers, and hyphens only. This is what you will share with people!</p>
                            </div>

                            <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8">
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2">
                                    <User size={18} className="text-[#9df01c]"/> Details
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Full Name</label>
                                        <input type="text" value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Title</label>
                                        <input type="text" value={cardData.title} onChange={e => setCardData({...cardData, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Company</label>
                                        <input type="text" value={cardData.company} onChange={e => setCardData({...cardData, company: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Phone Number</label>
                                        <input type="tel" value={cardData.phone} onChange={e => setCardData({...cardData, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Email Address</label>
                                        <input type="email" value={cardData.email} onChange={e => setCardData({...cardData, email: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Website URL</label>
                                        <input type="text" value={cardData.website} onChange={e => setCardData({...cardData, website: e.target.value})} placeholder="e.g. selloutcrowds.com" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Link2 size={18} className="text-[#9df01c]"/> Social Media</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><SelloutIcon size={10}/> Sellout Crowds URL</label>
                                            <input type="text" value={cardData.sellout} onChange={e => setCardData({...cardData, sellout: e.target.value})} placeholder="selloutcrowds.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Instagram size={10}/> Instagram URL</label>
                                            <input type="text" value={cardData.instagram} onChange={e => setCardData({...cardData, instagram: e.target.value})} placeholder="instagram.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><TiktokIcon size={10}/> TikTok URL</label>
                                            <input type="text" value={cardData.tiktok} onChange={e => setCardData({...cardData, tiktok: e.target.value})} placeholder="tiktok.com/@username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Youtube size={10}/> YouTube URL</label>
                                            <input type="text" value={cardData.youtube} onChange={e => setCardData({...cardData, youtube: e.target.value})} placeholder="youtube.com/@channel" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Facebook size={10}/> Facebook URL</label>
                                            <input type="text" value={cardData.facebook} onChange={e => setCardData({...cardData, facebook: e.target.value})} placeholder="facebook.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><XIcon size={10}/> X URL</label>
                                            <input type="text" value={cardData.twitter} onChange={e => setCardData({...cardData, twitter: e.target.value})} placeholder="x.com/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1"><Linkedin size={10}/> LinkedIn URL</label>
                                            <input type="text" value={cardData.linkedin} onChange={e => setCardData({...cardData, linkedin: e.target.value})} placeholder="linkedin.com/in/username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: DESIGN & THEME */}
                    {activeTab === 'design' && (
                        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 animate-in fade-in duration-300">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-white flex items-center gap-2"><Palette size={18} className="text-[#9df01c]"/> Design</h3>
                            
                            <div className="flex flex-col sm:flex-row gap-6 mb-8">
                                {/* Profile Photo Upload */}
                                <div className="flex-1 bg-black p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="mb-4">
                                        {cardData.avatarUrl ? (
                                            <img src={cardData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white/10 bg-[#0a0a0a]" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={24} className="text-gray-500" /></div>
                                        )}
                                    </div>
                                    <label className={`w-full justify-center py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.avatar ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading.avatar ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                        {isUploading.avatar ? 'Uploading...' : 'Profile Photo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatarUrl')} />
                                    </label>
                                </div>

                                {/* Logo Image Upload */}
                                <div className="flex-1 bg-black p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center relative">
                                    <div className="mb-4 w-full flex items-center justify-center h-20">
                                        {cardData.logoUrl ? (
                                            <img src={cardData.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-20 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center"><ImageIcon size={24} className="text-gray-500" /></div>
                                        )}
                                    </div>
                                    <label className={`w-full justify-center py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.logo ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading.logo ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                        {isUploading.logo ? 'Uploading...' : 'Brand Logo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                    </label>
                                    
                                    {cardData.logoUrl && (
                                        <div className="w-full mt-4 bg-white/5 p-2 rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Logo Size</label>
                                                <button onClick={() => setCardData({...cardData, logoUrl: ''})} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest">Remove</button>
                                            </div>
                                            <input type="range" min="30" max="150" value={cardData.logoSize || 56} onChange={e => setCardData({...cardData, logoSize: e.target.value})} className="w-full accent-[#9df01c] cursor-pointer" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Theme Presets</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                                    {PRESETS.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => handlePresetSelect(p)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${cardData.themePreset === p.id ? 'bg-white/10 border-[#9df01c]' : 'bg-black border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden" style={{ background: p.bg }}>
                                                {p.accent !== 'transparent' && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }}></div>}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{p.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {cardData.themePreset === 'custom' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in bg-black p-5 rounded-2xl border border-white/5">
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Background Color</label>
                                            <input type="color" value={cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#ffffff' : '#111111')} onChange={e => setCardData({...cardData, cardBgColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Text & Panel Mode</label>
                                            <div className="flex bg-black p-1 rounded-lg border border-white/10 h-12">
                                                <button onClick={() => setCardData({...cardData, cardBgType: 'dark'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'dark' || !cardData.cardBgType ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`} title="Use white text">Dark</button>
                                                <button onClick={() => setCardData({...cardData, cardBgType: 'light'})} className={`flex-1 rounded-md text-[10px] font-bold transition-colors ${cardData.cardBgType === 'light' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-white'}`} title="Use black text">Light</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Accent Color</label>
                                            <input type="color" value={cardData.theme} onChange={e => setCardData({...cardData, theme: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Icons Color</label>
                                            <input type="color" value={cardData.iconColor} onChange={e => setCardData({...cardData, iconColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-white/5 mt-8">
                                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">QR Code Setting</h4>
                                
                                <div className="flex items-center justify-between bg-black p-5 rounded-2xl border border-white/5 mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-white">Embed Logo in QR Code</p>
                                        <p className="text-[10px] text-gray-500 font-medium mt-1">Place a logo directly in the center of your shareable QR code.</p>
                                    </div>
                                    <button onClick={() => setCardData({...cardData, qrLogoEnabled: !cardData.qrLogoEnabled})} className={`w-12 h-6 rounded-full transition-colors relative ${cardData.qrLogoEnabled ? 'bg-[#9df01c]' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${cardData.qrLogoEnabled ? 'left-7 bg-black' : 'left-1 bg-gray-400'}`}></div>
                                    </button>
                                </div>

                                {cardData.qrLogoEnabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black p-5 rounded-xl border border-white/5 animate-in fade-in">
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Logo Background Block</label>
                                            <input type="color" value={cardData.qrLogoBg || '#ffffff'} onChange={e => setCardData({...cardData, qrLogoBg: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer bg-black border border-white/10 p-1" />
                                            <p className="text-[9px] text-gray-600 mt-2">The color of the square sitting behind the logo.</p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-400 font-bold uppercase block mb-2">Custom QR Logo (Optional)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center p-1">
                                                    {(cardData.qrLogoUrl || cardData.logoUrl) ? (
                                                        <img src={cardData.qrLogoUrl || cardData.logoUrl} className="max-w-full max-h-full object-contain" alt="QR center" />
                                                    ) : (
                                                        <ImageIcon size={16} className="text-gray-500" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-white/10 ${isUploading.qrLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        {isUploading.qrLogo ? <Loader2 size={12} className="animate-spin"/> : <UploadCloud size={12}/>}
                                                        Upload Specific Logo
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'qrLogoUrl')} />
                                                    </label>
                                                    {cardData.qrLogoUrl && (
                                                        <button onClick={() => setCardData({...cardData, qrLogoUrl: ''})} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest text-left pl-1">Use Main Brand Logo</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                    {isSaving ? 'Saving...' : 'Save Design'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: THE LIVE PREVIEW */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <div className="flex items-center justify-center gap-2 mb-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <MonitorSmartphone size={14} /> Live Preview
                        </div>
                        {/* We wrap the preview in a simulated screen background so they can see the full effect! */}
                        <div className={`p-8 rounded-[3rem] border shadow-2xl transition-colors pointer-events-none ${cardData.cardBgType === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/10'}`} style={{ backgroundColor: cardData.cardBgColor || (cardData.cardBgType === 'light' ? '#f9fafb' : '#050505') }}>
                           <PublicCardView data={cardData} />
                        </div>
                    </div>
                </div>
            </div>

            {/* QR CODE MODAL - FEATURING THE EMBEDDED LOGO */}
            {showQrModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative">
                        <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black uppercase italic text-white mb-2">Scan to Connect</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6 text-center">Have them open their camera app</p>
                        
                        <div className="bg-white p-3 rounded-2xl shadow-xl relative inline-flex items-center justify-center">
                            {/* ecc=H enables High Error Correction so covering the center is perfectly safe! */}
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=H&margin=0&data=${encodeURIComponent(getShareUrl())}`} alt="QR Code" className="w-48 h-48" />
                            
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