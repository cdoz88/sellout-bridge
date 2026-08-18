import React from 'react';

export default function WordPressIcon({ size = 20, className = "" }) {
    return (
        <svg 
            viewBox="0 0 32 32" 
            width={size} 
            height={size} 
            fill="currentColor" 
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M16 2.5C8.5 2.5 2.5 8.5 2.5 16S8.5 29.5 16 29.5 29.5 23.5 29.5 16 23.5 2.5 16 2.5zm11.2 13.5c0 1.9-.5 3.7-1.3 5.3l-5.6-15.5c3.8 2.2 6.9 7 6.9 10.2zm-11.2 11.2c-2.2 0-4.3-.6-6.1-1.6l4.2-12 4.2 12c-1.8 1-3.9 1.6-6.1 1.6zm-7.6-3.2c-2-2.1-3.2-5-3.2-8 0-1.6.3-3.1 1-4.5L13.1 24c-1.7-1.1-3.2-2.5-4.5-4zM16 4.9c2 0 3.9.5 5.5 1.4L18 16.4l-2.4-7c-.1-.3-.4-.5-.7-.5h-1.5c-.3 0-.5.2-.5.5s.2.5.5.5h.3l3.6 10.6-2.5 7.1C9.6 25 5.2 19 5.2 13.5c0-4.7 3.8-8.6 10.8-8.6z"/>
        </svg>
    );
}