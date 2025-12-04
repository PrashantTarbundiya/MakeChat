import { useState } from 'react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export const Signup = ({ onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.remove();
        toast.success('Account created successfully!');
        onSignup(data.user);
      } else {
        setError(data.error || 'Signup failed');
        toast.remove();
        toast.error(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Server error. Make sure backend is running.');
      toast.remove();
      toast.error('Server error');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-[#1F2023] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="https://res.cloudinary.com/durcxd0dn/image/upload/v1736683562/cropped_circle_image_no7c6p.png" alt="MakeChat" className="w-10 h-10" />
          <span className="text-2xl font-bold text-white">MakeChat</span>
        </div>
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Create Account</h2>
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Sign Up
          </button>
        </form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1F2023] text-gray-400">Or continue with</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full flex justify-center">
            <GoogleLogin
              width="384"
              onSuccess={async (credentialResponse) => {
                try {
                  const decoded = jwtDecode(credentialResponse.credential);
                  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: decoded.email,
                      name: decoded.name,
                      avatar: decoded.picture,
                      googleId: decoded.sub
                    })
                  });
                  const data = await response.json();
                  if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    toast.remove();
                    toast.success('Account created successfully!');
                    onSignup(data.user);
                  }
                } catch (err) {
                  toast.remove();
                  toast.error('Google signup failed');
                }
              }}
              onError={() => {
                toast.remove();
                toast.error('Google signup failed');
              }}
            />
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <button onClick={() => window.location.href = '/login'} className="text-blue-400 hover:text-blue-300 font-medium">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};
