import React from 'react';

export const Footer = () => {
  return (
    <footer id="contact" className="py-12 border-t border-white/5 bg-black">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            <span className="text-lg font-bold tracking-wider text-white">MAKECHAT</span>
        </div>
        
        <div className="flex items-center gap-8">
            <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">PRIVACY POLICY</a>
            <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">TERMS OF SERVICE</a>
            <span className="text-xs text-white/20">© 2026 MAKECHAT</span>
        </div>
      </div>
    </footer>
  );
};
