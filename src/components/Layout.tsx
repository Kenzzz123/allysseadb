import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { LogOut, User, Shield, Bell, Search, Settings, ArrowRightLeft, Trophy, Home, Menu, X } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { currentUser, userProfile, logout } = useAuth();
  const { adminWarnings } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdminPage = location.pathname === '/admin';
  const hasAlerts = userProfile?.role === 'admin' && adminWarnings?.length > 0;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { label: 'Transactions', icon: ArrowRightLeft, path: '/transactions' },
    ...(userProfile?.role === 'admin' ? [{ label: 'Admin', icon: Shield, path: '/admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-primary selection:text-black">
      {/* Search Header - Desktop only */}
      <header className="hidden md:flex h-16 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 items-center justify-between px-8">
        <Link to={currentUser ? "/dashboard" : "/"} className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(250,204,21,0.2)]">
            A
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg tracking-tight">Allyssea</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-medium">Database System</span>
          </div>
        </Link>

        {currentUser && (
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Quick search..."
                className="bg-neutral-900 border border-white/5 rounded-full px-10 py-2 text-sm w-64 focus:w-80 focus:border-white/20 focus:outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            <div className="flex items-center gap-2 pr-6 border-r border-white/10">
              <button 
                onClick={() => userProfile?.role === 'admin' ? navigate('/admin?tab=alerts') : null}
                className={`p-2 transition-all relative rounded-full hover:bg-white/5 ${hasAlerts ? 'text-red-500' : 'text-neutral-400'}`}
              >
                <Bell className="w-5 h-5" />
                {hasAlerts && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050505]" />}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">{userProfile?.username}</span>
                <span className="text-[10px] uppercase font-bold text-brand-primary/80">{userProfile?.role}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-neutral-500 hover:text-red-400 transition-all rounded-full hover:bg-white/5">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Top Header */}
      <header className="md:hidden flex h-16 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 items-center justify-between px-6">
        <Link to={currentUser ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-black font-black">
            A
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Allyssea</span>
        </Link>

        {currentUser && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => userProfile?.role === 'admin' ? navigate('/admin?tab=alerts') : null}
              className={`p-2 relative rounded-full hover:bg-white/5 ${hasAlerts ? 'text-red-500' : 'text-neutral-400'}`}
            >
              <Bell className="w-5 h-5" />
              {hasAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="p-2 text-neutral-500 hover:text-red-400 transition-all rounded-full hover:bg-white/5" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* Desktop Main Navigation Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-16 bottom-0 w-20 xl:w-64 bg-[#050505] border-r border-white/5 p-4 z-40 transition-all">
        <div className="flex flex-col gap-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-brand-primary text-black font-bold shadow-lg shadow-brand-primary/10' 
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-black' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="hidden xl:block text-sm leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 min-h-screen ${currentUser ? 'md:pl-20 xl:pl-64' : ''} pb-24 md:pb-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {currentUser && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-6">
          <div className="bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex items-center justify-around h-20 shadow-2xl">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-full h-full group"
                >
                  <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand-primary text-black scale-110 -translate-y-2' : 'text-neutral-500'}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabMobile"
                      className="absolute bottom-3 w-1 h-1 bg-brand-primary rounded-full"
                    />
                  )}
                  <span className={`text-[10px] font-bold mt-0.5 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
