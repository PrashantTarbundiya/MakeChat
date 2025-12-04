import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const GoogleCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This page is just a placeholder for the redirect URI
    // The actual authentication happens in Login/Signup pages
    navigate('/login');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-white">Processing...</div>
    </div>
  );
};
