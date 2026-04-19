import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, Bell, Search, Settings, ArrowRightLeft, Trophy } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Layout() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdminPage = location.pathname === '/admin';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <nav className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={currentUser ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                  G
                </div>
                <span className="font-bold text-xl tracking-tight text-white">
                  Allyssea <span className="text-neutral-500">Database</span>
                </span>
              </Link>
            </div>

            {currentUser && (
              <div className="flex-1 flex items-center justify-center px-8">
                <div className="max-w-md w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-800 rounded-xl leading-5 bg-black placeholder-neutral-500 text-white focus:outline-none focus:bg-neutral-950 focus:ring-1 focus:ring-neutral-700 sm:text-sm transition-all"
                    placeholder="Search records..."
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              {currentUser ? (
                <>
                  <Link to="/leaderboard" className="p-2 text-neutral-400 hover:text-white transition-colors" title="Leaderboard">
                    <Trophy className="h-5 w-5" />
                  </Link>
                  <Link to="/transactions" className="p-2 text-neutral-400 hover:text-white transition-colors" title="Transactions">
                    <ArrowRightLeft className="h-5 w-5" />
                  </Link>
                  <button className="p-2 text-neutral-400 hover:text-white relative">
                    <Bell className="h-6 w-6" />
                  </button>
                  
                  {userProfile?.role === 'admin' && (
                    <Link to={isAdminPage ? "/dashboard" : "/admin"} className="p-2 text-white hover:bg-neutral-800 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-2 transition-colors">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-medium hidden sm:block">{isAdminPage ? 'Dashboard' : 'Admin'}</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-3 pl-4 border-l border-neutral-800">
                    <div className="flex flex-col items-end hidden sm:flex">
                      <span className="text-sm font-medium text-white">{userProfile?.username}</span>
                      <span className="text-xs text-neutral-500 capitalize">{userProfile?.role}</span>
                    </div>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-neutral-400 hover:text-white transition-colors" title="Settings">
                      <Settings className="h-5 w-5" />
                    </button>
                    <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-400 transition-colors" title="Logout">
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/" className="text-neutral-400 hover:text-white font-medium">Login</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
