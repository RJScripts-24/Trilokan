import { motion } from 'motion/react';
import { Wallet, Send, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, Plus, RefreshCw, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface WalletConsoleProps {
  onBack?: () => void;
}

export function WalletConsole({ onBack }: WalletConsoleProps = {}) {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'cards', label: 'Cards' },
  ];

  const recentTransactions = [
    {
      id: 1,
      type: 'received',
      title: 'Payment Received',
      description: 'From John Doe',
      amount: '+$2,450.00',
      time: '2 hours ago',
      status: 'completed',
    },
    {
      id: 2,
      type: 'sent',
      title: 'Transfer to Savings',
      description: 'Monthly savings',
      amount: '-$1,000.00',
      time: '5 hours ago',
      status: 'completed',
    },
    {
      id: 3,
      type: 'received',
      title: 'Salary Deposit',
      description: 'From Acme Corp',
      amount: '+$5,200.00',
      time: '1 day ago',
      status: 'completed',
    },
    {
      id: 4,
      type: 'sent',
      title: 'Bill Payment',
      description: 'Electricity',
      amount: '-$145.50',
      time: '2 days ago',
      status: 'completed',
    },
    {
      id: 5,
      type: 'sent',
      title: 'Online Purchase',
      description: 'Amazon.com',
      amount: '-$89.99',
      time: '3 days ago',
      status: 'completed',
    },
  ];

  const quickActions = [
    { icon: Send, label: 'Send Money', color: '#D3AF37' },
    { icon: ArrowDownLeft, label: 'Request', color: '#D3AF37' },
    { icon: Plus, label: 'Add Funds', color: '#D3AF37' },
    { icon: RefreshCw, label: 'Exchange', color: '#D3AF37' },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 p-8">
        {/* Back Button */}
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 flex items-center gap-2 px-6 py-3 rounded-xl border text-white hover:bg-[#D3AF37]/10 transition-all"
            style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </motion.button>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8" style={{ color: '#D3AF37' }} />
            <h1 className="text-4xl font-light text-white">Wallet Console</h1>
          </div>
          <p className="text-zinc-400 text-lg">Manage your digital assets and transactions</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-8 rounded-3xl border relative overflow-hidden"
          style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-zinc-400 mb-2">Total Balance</p>
                <div className="flex items-center gap-4">
                  {showBalance ? (
                    <h2 className="text-5xl font-light text-white">$24,567.89</h2>
                  ) : (
                    <h2 className="text-5xl font-light text-white">••••••</h2>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {showBalance ? (
                      <Eye className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-zinc-400" />
                    )}
                  </motion.button>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  <span className="text-[#4ADE80] text-lg">+12.5%</span>
                </div>
                <p className="text-zinc-400 text-sm">vs last month</p>
              </div>
            </div>

            {/* Account Info */}
            <div className="flex items-center gap-8 pt-6 border-t" style={{ borderColor: 'rgba(211, 175, 55, 0.2)' }}>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Account Number</p>
                <p className="text-white">•••• •••• •••• 4567</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Account Type</p>
                <p className="text-white">Premium Checking</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">Currency</p>
                <p className="text-white">USD</p>
              </div>
            </div>
          </div>

          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: '#D3AF37' }} />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-light text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-6 rounded-2xl border text-center group"
                style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
              >
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(211, 175, 55, 0.2)' }}>
                  <action.icon className="w-6 h-6" style={{ color: action.color }} />
                </div>
                <p className="text-white group-hover:text-[#D3AF37] transition-colors">{action.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-lg transition-all"
                style={{
                  background: selectedTab === tab.id ? '#D3AF37' : 'transparent',
                  color: selectedTab === tab.id ? '#000' : '#fff',
                }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        {selectedTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-light text-white mb-4">Recent Transactions</h2>
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}>
              {recentTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="p-6 flex items-center justify-between hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  style={{ borderBottom: index < recentTransactions.length - 1 ? '1px solid rgba(211, 175, 55, 0.1)' : 'none' }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: transaction.type === 'received' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)' }}
                    >
                      {transaction.type === 'received' ? (
                        <ArrowDownLeft className="w-6 h-6 text-[#4ADE80]" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6 text-[#F87171]" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{transaction.title}</p>
                      <p className="text-zinc-400 text-sm">{transaction.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className="text-lg font-medium"
                      style={{ color: transaction.type === 'received' ? '#4ADE80' : '#F87171' }}
                    >
                      {transaction.amount}
                    </p>
                    <div className="flex items-center gap-1 text-zinc-400 text-sm justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{transaction.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {selectedTab === 'transactions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(211, 175, 55, 0.2)' }}>
              <Clock className="w-10 h-10" style={{ color: '#D3AF37' }} />
            </div>
            <h3 className="text-2xl text-white mb-2">Full Transaction History</h3>
            <p className="text-zinc-400">Detailed transaction view coming soon</p>
          </motion.div>
        )}

        {selectedTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(211, 175, 55, 0.2)' }}>
              <Wallet className="w-10 h-10" style={{ color: '#D3AF37' }} />
            </div>
            <h3 className="text-2xl text-white mb-2">Manage Your Cards</h3>
            <p className="text-zinc-400">Card management features coming soon</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
