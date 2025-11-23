import { motion } from 'motion/react';
import { User as UserIcon, Mail, Phone, Calendar, Upload, ChevronDown, FileText, ArrowLeft, Home, Compass, Newspaper, Wallet, Settings as SettingsIcon, HelpCircle, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Preference } from './Preference';
import type { User } from '../types';

interface SettingsProps {
  user: User;
  onBack?: () => void;
}

export function Settings({ user, onBack }: SettingsProps) {
  const [activeCategory, setActiveCategory] = useState('general');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState('Government ID Type');
  const [firstName, setFirstName] = useState(user.name.split(' ')[0] || '');
  const [surname, setSurname] = useState(user.name.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.phoneNumber || '');
  const [username, setUsername] = useState(user.name);
  const [date, setDate] = useState('');

  const categories = [
    { id: 'general', label: 'General Information', icon: 'ⓘ' },
    { id: 'security', label: 'Security' },
    { id: 'preference', label: 'Preference' },
    { id: 'notification', label: 'Notification' },
    { id: 'account', label: 'Account' },
    { id: 'management', label: 'Account Management' },
    { id: 'billing', label: 'Billing' },
  ];

  const idTypes = [
    'Aadhar Card',
    'Passport',
    'Driver License',
    '10th Certificate',
    'PAN'
  ];

  const handleIdTypeSelect = (type: string) => {
    setSelectedIdType(type);
    setShowDropdown(false);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 flex">
        {/* Left sidebar with categories */}
        <div className="w-[440px] p-8 border-r border-zinc-800/50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h2 className="text-4xl text-white mb-8">Settings</h2>
          </motion.div>

          {/* Category list */}
          <div className="space-y-4">
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl transition-all duration-300 flex items-center gap-4 ${
                  activeCategory === category.id
                    ? 'bg-zinc-900 border-2 border-[#FFF86A]'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                {category.icon && (
                  <span className="w-8 h-8 rounded-full border-2 border-[#FFF86A] flex items-center justify-center text-[#FFF86A] text-lg">
                    {category.icon}
                  </span>
                )}
                <span className="text-white text-xl">{category.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 p-9 pb-32">
          {/* Header with Cancel/Submit buttons */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl text-white">Settings</h1>
            <div className="flex gap-4">
              <button className="px-8 py-3 rounded-xl border-2 border-[#FFCF2F] text-white text-xl hover:bg-[#FFCF2F]/10 transition-all">
                Cancel
              </button>
              <button className="px-8 py-3 rounded-xl text-black text-xl transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)' }}>
                Submit
              </button>
            </div>
          </div>

          {/* Main content card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-8 pb-32 rounded-3xl backdrop-blur-xl border min-h-[800px]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              borderColor: 'rgba(211, 175, 55, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(211, 175, 55, 0.1)'
            }}
          >
            {/* Show Preference content when preference is selected */}
            {activeCategory === 'preference' ? (
              <Preference />
            ) : (
              <>
                <h2 className="text-3xl text-white mb-6">General Information</h2>
                
                {/* Profile Picture Upload Section */}
                <div className="mb-8 pb-8 border-b border-zinc-800/50">
                  <h3 className="text-2xl text-white mb-4">Profile Picture upload</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                      <User className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <p className="text-white text-xl mb-1">{userName}</p>
                      <p className="text-zinc-400 text-sm">Role/Title</p>
                      <p className="text-zinc-400 text-sm">Location</p>
                    </div>
                    <button className="ml-auto px-6 py-2 rounded-lg text-white text-sm border border-[#FFCF2F] hover:bg-[#FFCF2F]/10 transition-all flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload New Photo
                    </button>
                  </div>
                </div>

                {/* Personal Information Form */}
                <div>
                  <h3 className="text-xl text-white mb-6">Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label className="block text-white text-sm mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                        placeholder="Enter first name"
                      />
                    </div>

                    {/* Surname */}
                    <div>
                      <label className="block text-white text-sm mb-2">Surname</label>
                      <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                        placeholder="Enter surname"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-white text-sm mb-2">Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                          style={{ borderColor: '#FFCF2F' }}
                          placeholder="Enter email"
                        />
                      </div>
                    </div>

                    {/* Mobile */}
                    <div>
                      <label className="block text-white text-sm mb-2">Mobile</label>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                        placeholder="Enter mobile number"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-white text-sm mb-2">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                        placeholder="Enter username"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-white text-sm mb-2">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                      />
                    </div>
                  </div>

                  {/* Identity Verification - Full Width */}
                  <div className="mt-6">
                    <label className="block text-white text-sm mb-2">Identity Verification</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full px-4 py-3 bg-transparent border-2 rounded-xl text-white text-left flex items-center justify-between focus:outline-none transition-all"
                        style={{ borderColor: '#FFCF2F' }}
                      >
                        <span className={selectedIdType === 'Government ID Type' ? 'text-zinc-600' : ''}>
                          {selectedIdType}
                        </span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full mt-2 w-full bg-zinc-200 rounded-xl overflow-hidden shadow-xl z-50"
                        >
                          {idTypes.map((type, index) => (
                            <button
                              key={type}
                              onClick={() => handleIdTypeSelect(type)}
                              className={`w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all ${
                                index !== idTypes.length - 1 ? 'border-b border-black' : ''
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}