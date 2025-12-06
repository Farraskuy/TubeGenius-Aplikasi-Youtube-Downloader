import React from 'react';
import { Youtube } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="w-full h-16 border-b border-white/10 glass-panel sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Youtube className="w-8 h-8 text-brand-500 fill-current" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Tube<span className="text-brand-500">Genius</span>
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;