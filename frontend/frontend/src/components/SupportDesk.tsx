import { motion } from 'motion/react';
import { HelpCircle, MessageSquare, Send, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface SupportDeskProps {
  onBack?: () => void;
}

export function SupportDesk({ onBack }: SupportDeskProps = {}) {
  const [selectedTab, setSelectedTab] = useState('tickets');
  const [message, setMessage] = useState('');

  const tabs = [
    { id: 'tickets', label: 'My Tickets' },
    { id: 'new', label: 'New Ticket' },
    { id: 'faq', label: 'FAQ' },
  ];

  const tickets = [
    {
      id: 'TKT-001',
      subject: 'Identity Verification Issue',
      status: 'open',
      priority: 'high',
      created: '2 hours ago',
      lastUpdate: '30 mins ago',
    },
    {
      id: 'TKT-002',
      subject: 'App Checker Not Working',
      status: 'in-progress',
      priority: 'medium',
      created: '1 day ago',
      lastUpdate: '5 hours ago',
    },
    {
      id: 'TKT-003',
      subject: 'Payment Processing Delay',
      status: 'resolved',
      priority: 'high',
      created: '3 days ago',
      lastUpdate: '1 day ago',
    },
  ];

  const faqs = [
    {
      question: 'How do I verify my identity?',
      answer: 'Navigate to the Explore section and select Identity Verification. Follow the on-screen instructions to complete the verification process.',
    },
    {
      question: 'What file types are supported for App Checker?',
      answer: 'App Checker supports APK files up to 100MB in size. Make sure your file is a valid Android application package.',
    },
    {
      question: 'How long does complaint processing take?',
      answer: 'Most complaints are reviewed within 24-48 hours. You will receive email notifications about the status of your complaint.',
    },
    {
      question: 'How do I update my account information?',
      answer: 'Go to Settings and select the Profile section. You can update your personal information, contact details, and preferences there.',
    },
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
            <HelpCircle className="w-8 h-8" style={{ color: '#D3AF37' }} />
            <h1 className="text-4xl font-light text-white">Support Desk</h1>
          </div>
          <p className="text-zinc-400 text-lg">Get help and manage your support tickets</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
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

        {/* My Tickets View */}
        {selectedTab === 'tickets' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-light text-white mb-4">Your Support Tickets</h2>
            <div className="space-y-4">
              {tickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="rounded-2xl p-6 border cursor-pointer group"
                  style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[#D3AF37] font-medium">{ticket.id}</span>
                        <span 
                          className="px-3 py-1 rounded-full text-xs"
                          style={{
                            background: ticket.status === 'resolved' ? 'rgba(74, 222, 128, 0.2)' :
                                      ticket.status === 'in-progress' ? 'rgba(59, 130, 246, 0.2)' :
                                      'rgba(245, 158, 11, 0.2)',
                            color: ticket.status === 'resolved' ? '#4ADE80' :
                                   ticket.status === 'in-progress' ? '#3B82F6' :
                                   '#F59E0B'
                          }}
                        >
                          {ticket.status}
                        </span>
                        <span 
                          className="px-3 py-1 rounded-full text-xs"
                          style={{
                            background: ticket.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                                      'rgba(156, 163, 175, 0.2)',
                            color: ticket.priority === 'high' ? '#EF4444' : '#9CA3AF'
                          }}
                        >
                          {ticket.priority} priority
                        </span>
                      </div>
                      <h3 className="text-xl text-white mb-2 group-hover:text-[#D3AF37] transition-colors">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-zinc-400 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Created {ticket.created}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>Updated {ticket.lastUpdate}</span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-lg text-white"
                      style={{ background: 'rgba(211, 175, 55, 0.2)', borderColor: '#D3AF37', borderWidth: '1px' }}
                    >
                      View Details
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* New Ticket View */}
        {selectedTab === 'new' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-8 border"
            style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
          >
            <h2 className="text-2xl font-light text-white mb-6">Create New Support Ticket</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 rounded-xl bg-black border text-white placeholder-zinc-600 focus:outline-none focus:border-[#D3AF37] transition-all"
                  style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
                />
              </div>
              <div>
                <label className="block text-white mb-2">Category</label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-black border text-white focus:outline-none focus:border-[#D3AF37] transition-all"
                  style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
                >
                  <option>Select a category</option>
                  <option>Identity Verification</option>
                  <option>App Checker</option>
                  <option>Compliant Portal</option>
                  <option>Wallet</option>
                  <option>Technical Issue</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-white mb-2">Priority</label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-black border text-white focus:outline-none focus:border-[#D3AF37] transition-all"
                  style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
                >
                  <option>Select priority</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-white mb-2">Description</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-black border text-white placeholder-zinc-600 focus:outline-none focus:border-[#D3AF37] transition-all resize-none"
                  style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl text-black font-medium flex items-center justify-center gap-2"
                style={{ background: '#D3AF37' }}
              >
                <Send className="w-5 h-5" />
                Submit Ticket
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* FAQ View */}
        {selectedTab === 'faq' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-light text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="rounded-2xl p-6 border"
                  style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(211, 175, 55, 0.2)' }}>
                      <HelpCircle className="w-5 h-5" style={{ color: '#D3AF37' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg text-white mb-2">{faq.question}</h3>
                      <p className="text-zinc-400">{faq.answer}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
