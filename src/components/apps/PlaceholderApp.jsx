import React from 'react';

export default function PlaceholderApp({ title, description, icon }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
       <div className="text-[#9df01c] opacity-20 mb-6">
           {icon}
       </div>
       <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">{title}</h2>
       <p className="text-gray-500 font-medium max-w-md mx-auto">{description}</p>
       
       <button className="mt-8 bg-white/5 border border-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl cursor-not-allowed">
           Module Under Construction
       </button>
    </div>
  );
}