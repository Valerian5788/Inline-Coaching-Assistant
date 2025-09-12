import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Play, Trophy, BarChart3, Target, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { addToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      if (addToast) addToast('Successfully logged out', 'success');
    } catch (error: any) {
      if (addToast) addToast(error.message || 'Failed to logout', 'error');
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/teams', icon: Users, label: 'Teams' },
    { path: '/seasons', icon: Trophy, label: 'Seasons' },
    { path: '/games', icon: Calendar, label: 'Games' },
    { path: '/live', icon: Play, label: 'Live Tracking' },
    { path: '/training', icon: Target, label: 'Training' },
    { path: '/analysis', icon: BarChart3, label: 'Analysis' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Play className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Hockey Coach</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {currentUser?.displayName || currentUser?.email || 'User'}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{currentUser?.displayName || 'User'}</div>
                      <div className="text-gray-500">{currentUser?.email}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t bg-white">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-2 px-3 text-xs ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;