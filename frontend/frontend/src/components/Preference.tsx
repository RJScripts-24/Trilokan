import { motion } from 'motion/react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Preference() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [emailNotification, setEmailNotification] = useState(true);
  const [smsNotification, setSmsNotification] = useState(true);
  const [systemAlert, setSystemAlert] = useState(true);
  const [showCommChannels, setShowCommChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('Email');

  const commChannels = ['Email', 'SMS', 'In-app'];

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-14 h-8 rounded-full transition-all duration-300"
      style={{
        background: checked 
          ? 'linear-gradient(135deg, #FFCF2F 0%, #A98303 100%)'
          : 'rgba(255,255,255,0.1)'
      }}
    >
      <motion.div
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-6 h-6 rounded-full"
        style={{ backgroundColor: '#FFCF2F' }}
      />
    </button>
  );

  return (
    <div>
      <h2 className="text-3xl text-white mb-6">Preference</h2>
      
      {/* Theme Selection */}
      <div className="mb-8">
        <h3 className="text-2xl text-white mb-4">Theme</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setTheme('dark')}
            className={`px-6 py-2 rounded-xl text-lg transition-all ${
              theme === 'dark'
                ? 'text-black'
                : 'text-white border-2 border-[#FFCF2F]'
            }`}
            style={theme === 'dark' ? { 
              background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)' 
            } : {}}
          >
            Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-6 py-2 rounded-xl text-lg transition-all ${
              theme === 'light'
                ? 'text-black'
                : 'text-white border-2 border-[#FFCF2F]'
            }`}
            style={theme === 'light' ? { 
              background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)' 
            } : {}}
          >
            Light
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="mb-6">
        <button className="flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-[#FFCF2F] text-white text-lg hover:bg-[#FFCF2F]/10 transition-all">
          <span>Change Password</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFCF2F' }}>
            <ChevronRight className="w-4 h-4 text-black" />
          </div>
        </button>
      </div>

      {/* Security Question */}
      <div className="mb-8 pb-6 border-b border-zinc-800/50">
        <label className="block text-white text-lg mb-3">Security Question:</label>
        <input
          type="text"
          className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white placeholder-zinc-600 focus:outline-none transition-all"
          placeholder="Enter your security question"
        />
      </div>

      {/* Notification Toggles */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <span className="text-white text-lg">2FA/OTP Authentication</span>
          <ToggleSwitch checked={twoFactorAuth} onChange={setTwoFactorAuth} />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white text-lg">Email Notification</span>
          <ToggleSwitch checked={emailNotification} onChange={setEmailNotification} />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white text-lg">SMS Notification</span>
          <ToggleSwitch checked={smsNotification} onChange={setSmsNotification} />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white text-lg">System Alert</span>
          <ToggleSwitch checked={systemAlert} onChange={setSystemAlert} />
        </div>
      </div>

      {/* Preferred Communication Channels */}
      <div className="mb-8 pb-8 border-b border-zinc-800/50">
        <label className="block text-white text-lg mb-3">Preferred Communication Channels:</label>
        <div className="relative">
          <button
            onClick={() => setShowCommChannels(!showCommChannels)}
            className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white text-left flex items-center justify-between focus:outline-none transition-all"
          >
            <span>{selectedChannel}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showCommChannels ? 'rotate-180' : ''}`} />
          </button>

          {showCommChannels && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full mt-2 w-full bg-zinc-200 rounded-xl overflow-hidden shadow-xl z-50"
            >
              {commChannels.map((channel, index) => (
                <button
                  key={channel}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setShowCommChannels(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all ${
                    index !== commChannels.length - 1 ? 'border-b border-black' : ''
                  }`}
                >
                  {channel}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Account Section */}
      <div>
        <h3 className="text-2xl text-white mb-4">Delete your Account:</h3>
        <button className="px-8 py-3 rounded-xl text-white text-lg transition-all hover:scale-105" style={{ backgroundColor: '#FF4444' }}>
          Delete
        </button>
      </div>
    </div>
  );
}
