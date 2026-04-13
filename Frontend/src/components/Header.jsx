import { Link } from 'react-router-dom';
import { Menu, Share2 } from 'lucide-react';

export const Header = ({ sidebarOpen, setSidebarOpen, currentChatId, onShare }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[50px] bg-black border-b border-white/10 flex items-center justify-between px-4 z-[44]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="https://res.cloudinary.com/durcxd0dn/image/upload/v1764748775/cropped_circle_image_no7c6p.png" alt="MakeChat" className="w-6 h-6 rounded-full" />
          <span className="text-white font-semibold text-sm sm:text-base">MakeChat</span>
        </Link>
      </div>
      
      {currentChatId && (
        <button 
          onClick={onShare}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white flex items-center gap-2 text-sm font-medium"
          title="Share Chat"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      )}
    </div>
  );
};
