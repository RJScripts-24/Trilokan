import { motion } from 'motion/react';
import { 
  Home, 
  Compass, 
  Newspaper, 
  Wallet, 
  Settings, 
  HelpCircle, 
  LogOut,
  Shield,
  FileCheck,
  Smartphone,
  Bell,
  Moon,
  Search,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { Settings as SettingsPage } from './Settings';
import { IdentityVerification } from './IdentityVerification';
import { AppChecker } from './AppChecker';
import { CompliantPortal } from './CompliantPortal';
import { Newsroom } from './Newsroom';
import { WalletConsole } from './WalletConsole';
import { SupportDesk } from './SupportDesk';
import type { User } from '../types';

interface DashboardProps {
  user: User;
  onLogout?: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [exploreSection, setExploreSection] = useState<'identity' | 'appchecker' | 'compliant' | null>(null);

  // Extract first name from full name
  const userName = user.name.split(' ')[0];

  const navItems = [
    { icon: Home, label: 'Dashboard', active: currentView === 'dashboard', view: 'dashboard' },
    { icon: Compass, label: 'Explore', active: currentView === 'explore', view: 'explore' },
    { icon: Newspaper, label: 'News', active: currentView === 'news', view: 'news' },
    { icon: Wallet, label: 'Wallet', active: currentView === 'wallet', view: 'wallet' },
    { icon: Settings, label: 'Setting', active: currentView === 'settings', view: 'settings' },
    { icon: HelpCircle, label: 'Support', active: currentView === 'support', view: 'support' },
  ];

  const services = [
    { 
      icon: Shield, 
      title: 'Identity Verifier', 
      description: 'Secure identity verification',
      stats: '2.4K verified',
      section: 'identity' as const
    },
    { 
      icon: FileCheck, 
      title: 'Compliant Portal', 
      description: 'Compliance management',
      stats: '99.9% uptime',
      section: 'compliant' as const
    },
    { 
      icon: Smartphone, 
      title: 'App Checker', 
      description: 'Application verification',
      stats: '15K scans',
      section: 'appchecker' as const
    },
  ];

  const activities = [
    { id: '#0912424', description: 'Identified and detected app', date: '22-02-2023 @13:25', status: 'completed' },
    { id: '#0912425', description: 'Identity verification processed', date: '22-02-2023 @14:30', status: 'completed' },
    { id: '#0912426', description: 'Compliance check initiated', date: '22-02-2023 @15:45', status: 'pending' },
    { id: '#0912427', description: 'App security scan completed', date: '22-02-2023 @16:20', status: 'completed' },
    { id: '#0912428', description: 'User verification in progress', date: '22-02-2023 @17:10', status: 'processing' },
  ];

  // If settings view is active, show the Settings page
  if (currentView === 'settings') {
    return <SettingsPage user={user} onBack={() => setCurrentView('dashboard')} />;
  }

  // If news view is active, show the Newsroom
  if (currentView === 'news') {
    return <Newsroom onBack={() => setCurrentView('dashboard')} />;
  }

  // If wallet view is active, show the WalletConsole
  if (currentView === 'wallet') {
    return <WalletConsole onBack={() => setCurrentView('dashboard')} />;
  }

  // If support view is active, show the SupportDesk
  if (currentView === 'support') {
    return <SupportDesk onBack={() => setCurrentView('dashboard')} />;
  }

  // If explore view is active and a section is selected, show that section
  if (currentView === 'explore' && exploreSection) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="relative z-10 p-10">
          {/* Back button */}
          <motion.button
            onClick={() => setExploreSection(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 px-6 py-3 rounded-xl border-2 border-[#FFCF2F] text-white hover:bg-[#FFCF2F]/10 transition-all"
          >
            ← Back to Explore
          </motion.button>

          {exploreSection === 'identity' && <IdentityVerification user={user} />}
          {exploreSection === 'appchecker' && <AppChecker />}
          {exploreSection === 'compliant' && <CompliantPortal user={user} />}
        </div>
      </div>
    );
  }

  // If explore view is active, show explore options
  if (currentView === 'explore') {
    const exploreOptions = [
      { 
        id: 'identity' as const, 
        icon: Shield, 
        title: 'Identity Verification', 
        description: 'Verify your identity securely',
        gradient: 'from-[#D3AF37] to-[#B8941F]'
      },
      { 
        id: 'appchecker' as const, 
        icon: Smartphone, 
        title: 'App Checker', 
        description: 'Check APK files for security',
        gradient: 'from-[#D3AF37] to-[#A8891A]'
      },
      { 
        id: 'compliant' as const, 
        icon: FileCheck, 
        title: 'Compliant Portal', 
        description: 'File complaints and issues',
        gradient: 'from-[#C9A532] to-[#D3AF37]'
      },
    ];

    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="relative z-10 p-10">
          {/* Back button */}
          <motion.button
            onClick={() => setCurrentView('dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-8 px-6 py-3 rounded-xl border-2 border-[#FFCF2F] text-white hover:bg-[#FFCF2F]/10 transition-all"
          >
            ← Back to Dashboard
          </motion.button>

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl text-white mb-4"
          >
            Explore <span style={{ color: '#D3AF37' }}>Services</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-xl mb-12"
          >
            Select a service to get started
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
            {exploreOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setExploreSection(option.id)}
                className="p-8 rounded-3xl backdrop-blur-xl border cursor-pointer group relative overflow-hidden"
                style={{
                  background: '#1A1A1A',
                  borderColor: 'rgba(211, 175, 55, 0.3)',
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(211, 175, 55, 0.1), transparent 70%)'
                  }}
                />

                <div className="relative z-10">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-[#D3AF37] flex items-center justify-center mb-6"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <option.icon className="w-10 h-10 text-black" />
                  </motion.div>
                  <h3 className="text-white text-2xl mb-3">{option.title}</h3>
                  <p className="text-zinc-400 text-lg">{option.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-[#D3AF37] group-hover:gap-4 transition-all">
                    <span>Get Started</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-[280px] min-h-screen p-8 flex flex-col relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRight: '1px solid rgba(211, 175, 55, 0.1)'
          }}
        >
          {/* Logo */}
          <motion.div 
            className="mb-12"
            whileHover={{ scale: 1.05 }}
          >
            <h1 className="text-5xl tracking-tight">
              <span style={{ color: '#FFF86A', fontWeight: 700 }}>Tri</span>
              <span className="text-white" style={{ fontWeight: 300 }}>Løklan</span>
            </h1>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                whileHover={{ scale: 1.05, x: 8 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative group ${
                  item.active ? '' : ''
                }`}
                style={{
                  background: item.active 
                    ? 'linear-gradient(90deg, rgba(211, 175, 55, 0.15) 0%, transparent 100%)'
                    : 'transparent'
                }}
                onClick={() => setCurrentView(item.view)}
              >
                {item.active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                    style={{ backgroundColor: '#D3AF37' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon 
                  className="w-6 h-6 transition-colors" 
                  style={{ color: item.active ? '#D3AF37' : '#9CA3AF' }} 
                />
                <span 
                  className="text-lg transition-colors"
                  style={{ color: item.active ? '#D3AF37' : '#9CA3AF' }}
                >
                  {item.label}
                </span>
                {!item.active && (
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                  />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogout}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border border-transparent hover:border-red-500/30 mt-4"
          >
            <LogOut className="w-6 h-6 text-red-400" />
            <span className="text-red-400 text-lg">Logout</span>
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 p-10 overflow-y-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <motion.h2 
                className="text-5xl text-white mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome back, <span style={{ color: '#D3AF37' }}>{userName}</span>
              </motion.h2>
              <motion.p 
                className="text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Here's what's happening with your account today
              </motion.p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-12 pr-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#D3AF37] transition-all w-[200px]"
                />
              </motion.div>

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#D3AF37]/50 transition-all"
              >
                <Moon className="w-5 h-5 text-zinc-400" />
              </motion.button>

              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#D3AF37]/50 transition-all"
              >
                <Bell className="w-5 h-5 text-zinc-400" />
                <motion.div 
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>

              {/* Profile */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#D3AF37]/50 transition-all"
              >
                <motion.div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D3AF37] to-[#B8941F] flex items-center justify-center relative"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-black text-lg">{userName.charAt(0)}</span>
                </motion.div>
                <span className="text-white">{userName}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Grid */}

          {/* Services and AI Assistant */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Service Cards */}
            <div className="lg:col-span-2 space-y-5">
              <h3 className="text-white text-2xl mb-4">Quick Access</h3>
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="p-6 rounded-2xl backdrop-blur-xl border cursor-pointer group relative overflow-hidden"
                  style={{
                    background: '#1A1A1A',
                    borderColor: 'rgba(211, 175, 55, 0.3)',
                  }}
                  onClick={() => {
                    setCurrentView('explore');
                    setExploreSection(service.section);
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'radial-gradient(circle at 0% 50%, rgba(211, 175, 55, 0.1), transparent 70%)'
                    }}
                  />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-[#D3AF37] flex items-center justify-center"
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <service.icon className="w-8 h-8 text-black" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-white text-xl mb-1">{service.title}</h3>
                      <p className="text-zinc-400 text-sm mb-2">{service.description}</p>
                      <span className="text-zinc-500 text-xs">{service.stats}</span>
                    </div>
                    <ChevronRight 
                      className="w-6 h-6 text-zinc-600 group-hover:text-[#D3AF37] group-hover:translate-x-2 transition-all" 
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Assistant Card - Enhanced */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-8 rounded-2xl backdrop-blur-xl border flex flex-col relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(211, 175, 55, 0.1) 0%, rgba(211, 175, 55, 0.05) 100%)',
                borderColor: 'rgba(211, 175, 55, 0.3)',
              }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 opacity-20"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(211, 175, 55, 0.2), transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(211, 175, 55, 0.2), transparent 50%)',
                    'radial-gradient(circle at 20% 50%, rgba(211, 175, 55, 0.2), transparent 50%)',
                  ]
                }}
                transition={{ duration: 5, repeat: Infinity }}
              />

              <div className="relative z-10">
                <div className="mb-6">
                  <motion.h3 
                    className="text-white text-3xl mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    INTRODUCING <span style={{ color: '#D3AF37' }}>KL</span>AN
                  </motion.h3>
                  <p className="text-white/70 text-lg">Your AI Assistant</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: '#D3AF37' }}
                        animate={{ 
                          opacity: [0.3, 1, 0.3],
                          scale: [0.8, 1.2, 0.8]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                    <span className="text-zinc-400 text-sm ml-2">Listening...</span>
                  </div>
                </div>

                <div className="flex-1 flex items-end">
                  <div className="w-full relative">
                    <input
                      type="text"
                      placeholder="Ask me anything..."
                      className="w-full px-6 py-4 rounded-2xl text-black placeholder-black/60 focus:outline-none transition-all border-2 border-transparent focus:border-black/20"
                      style={{ backgroundColor: '#FFF653' }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                    >
                      <Search className="w-5 h-5 text-black/60" />
                    </motion.button>
                  </div>
                </div>

                {/* Animated emoji */}
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    y: [0, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute bottom-6 right-6 text-5xl"
                >
                  🤖
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Recent Activities */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="p-8 rounded-2xl backdrop-blur-xl border"
            style={{
              background: '#1A1A1A',
              borderColor: 'rgba(211, 175, 55, 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-2xl">Recent Activities</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="text-[#D3AF37] hover:underline"
              >
                View All
              </motion.button>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 mb-4 px-4 pb-3 border-b border-white/5">
              <span className="text-zinc-500 text-sm col-span-2">Service ID</span>
              <span className="text-zinc-500 text-sm col-span-5">Description</span>
              <span className="text-zinc-500 text-sm col-span-3">Date & Time</span>
              <span className="text-zinc-500 text-sm col-span-2 text-right">Status</span>
            </div>

            {/* Activity Rows */}
            <div className="space-y-2">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
                  whileHover={{ 
                    x: 5, 
                    backgroundColor: 'rgba(211, 175, 55, 0.05)',
                    borderColor: 'rgba(211, 175, 55, 0.3)'
                  }}
                  className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl border border-transparent backdrop-blur-sm cursor-pointer transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-[#D3AF37] col-span-2">{activity.id}</span>
                  <span className="text-white/80 col-span-5">{activity.description}</span>
                  <span className="text-zinc-400 col-span-3">{activity.date}</span>
                  <div className="col-span-2 flex justify-end">
                    <span 
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: activity.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' :
                                       activity.status === 'processing' ? 'rgba(59, 130, 246, 0.2)' :
                                       'rgba(245, 158, 11, 0.2)',
                        color: activity.status === 'completed' ? '#10B981' :
                               activity.status === 'processing' ? '#3B82F6' :
                               '#F59E0B'
                      }}
                    >
                      {activity.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}