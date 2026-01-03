import { Link } from 'react-router-dom';

export const Header = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[50px] bg-[#1F2023] border-b border-gray-700 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="https://res.cloudinary.com/durcxd0dn/image/upload/v1764748775/cropped_circle_image_no7c6p.png" alt="MakeChat" className="w-6 h-6 rounded-full" />
          <span className="text-white font-semibold text-sm sm:text-base">MakeChat</span>
        </Link>
      </div>
      <button className="p-1 hover:bg-white/10 rounded transition-colors text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
    </div>
  );
};
