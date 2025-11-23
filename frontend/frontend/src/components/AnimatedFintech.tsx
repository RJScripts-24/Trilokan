import { motion } from 'motion/react';
import { TrendingUp, DollarSign, CreditCard, PieChart, Wallet, ArrowUpRight, IndianRupee, Zap, BarChart3 } from 'lucide-react';

export function AnimatedFintech() {
  const floatingAnimation = {
    y: [0, -25, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const rotateAnimation = {
    rotate: [0, 360],
    transition: {
      duration: 25,
      repeat: Infinity,
      ease: "linear"
    }
  };

  return (
    <div className="relative w-full max-w-2xl h-[700px]">
      {/* Central glowing orb - Enhanced */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl"
        style={{ backgroundColor: '#D3AF37' }}
      />

      {/* Secondary glow layer */}
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
        style={{ backgroundColor: '#B8941F' }}
      />

      {/* Orbiting cards - Larger orbit */}
      <motion.div
        animate={rotateAnimation}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]"
      >
        {/* Card 1 - Top */}
        <motion.div
          animate={floatingAnimation}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            whileHover={{ scale: 1.15, rotate: 5 }}
            className="w-28 h-28 rounded-3xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-lg border-2 cursor-pointer group relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)',
              boxShadow: '0 25px 50px -12px rgba(211, 175, 55, 0.6)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <TrendingUp className="w-14 h-14 text-black mb-1 relative z-10" />
            <span className="text-black text-xs opacity-80 relative z-10">Growth</span>
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.2 }}
            />
          </motion.div>
        </motion.div>

        {/* Card 2 - Right */}
        <motion.div
          animate={floatingAnimation}
          transition={{ ...floatingAnimation.transition, delay: 0.5 }}
          className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            whileHover={{ scale: 1.15, rotate: -5 }}
            className="w-28 h-28 rounded-3xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-lg border-2 cursor-pointer group relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #C9A532 0%, #D3AF37 100%)',
              boxShadow: '0 25px 50px -12px rgba(201, 165, 50, 0.6)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <BarChart3 className="w-14 h-14 text-black mb-1 relative z-10" />
            <span className="text-black text-xs opacity-80 relative z-10">Analytics</span>
            
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 0.5 }}
              style={{ opacity: 0.2 }}
            />
          </motion.div>
        </motion.div>

        {/* Card 3 - Bottom */}
        <motion.div
          animate={floatingAnimation}
          transition={{ ...floatingAnimation.transition, delay: 1 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
        >
          <motion.div
            whileHover={{ scale: 1.15, rotate: 5 }}
            className="w-28 h-28 rounded-3xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-lg border-2 cursor-pointer group relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #D3AF37 0%, #A8891A 100%)',
              boxShadow: '0 25px 50px -12px rgba(211, 175, 55, 0.6)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <CreditCard className="w-14 h-14 text-black mb-1 relative z-10" />
            <span className="text-black text-xs opacity-80 relative z-10">Payments</span>
            
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
              style={{ opacity: 0.2 }}
            />
          </motion.div>
        </motion.div>

        {/* Card 4 - Left */}
        <motion.div
          animate={floatingAnimation}
          transition={{ ...floatingAnimation.transition, delay: 1.5 }}
          className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            whileHover={{ scale: 1.15, rotate: -5 }}
            className="w-28 h-28 rounded-3xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-lg border-2 cursor-pointer group relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #C2A030 0%, #D3AF37 100%)',
              boxShadow: '0 25px 50px -12px rgba(194, 160, 48, 0.6)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <PieChart className="w-14 h-14 text-black mb-1 relative z-10" />
            <span className="text-black text-xs opacity-80 relative z-10">Portfolio</span>
            
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5 }}
              style={{ opacity: 0.2 }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Center wallet icon - Enhanced */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.15 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center border-4 cursor-pointer group relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #D3AF37 0%, #C9A532 50%, #D3AF37 100%)',
          boxShadow: '0 30px 60px -15px rgba(211, 175, 55, 0.7)',
          borderColor: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <Wallet className="w-20 h-20 text-black mb-2 relative z-10" />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10"
        >
          <Zap className="w-6 h-6 text-black" />
        </motion.div>
        
        {/* Animated shine */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent"
          animate={{ 
            rotate: [0, 360],
            opacity: [0.3, 0.1, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Enhanced floating particles with trails */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -120, 0],
            x: [0, (i % 2 === 0 ? 60 : -60), 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 4 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-180px)`
          }}
        >
          <div 
            className="w-3 h-3 rounded-full shadow-lg" 
            style={{ 
              backgroundColor: '#D3AF37',
              boxShadow: '0 0 20px rgba(211, 175, 55, 0.8)'
            }} 
          />
        </motion.div>
      ))}

      {/* Enhanced data streams with better styling */}
      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
          y: [0, -5, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[15%] right-[20%]"
      >
        <div 
          className="flex items-center gap-2 backdrop-blur-xl px-5 py-3 rounded-2xl border-2 shadow-xl"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(211, 175, 55, 0.4)',
            boxShadow: '0 8px 32px rgba(211, 175, 55, 0.3)'
          }}
        >
          <ArrowUpRight className="w-5 h-5 text-green-400" />
          <span style={{ color: '#D3AF37' }} className="text-lg">+24.5%</span>
        </div>
      </motion.div>

      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
          y: [0, 5, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.7
        }}
        className="absolute bottom-[20%] left-[15%]"
      >
        <div 
          className="flex items-center gap-2 backdrop-blur-xl px-5 py-3 rounded-2xl border-2 shadow-xl"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(211, 175, 55, 0.4)',
            boxShadow: '0 8px 32px rgba(211, 175, 55, 0.3)'
          }}
        >
          <IndianRupee className="w-5 h-5" style={{ color: '#D3AF37' }} />
          <span className="text-white text-lg">1,24,458</span>
        </div>
      </motion.div>

      {/* Additional floating stats */}
      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scale: [0.95, 1.05, 0.95]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.2
        }}
        className="absolute top-[60%] right-[10%]"
      >
        <div 
          className="flex items-center gap-2 backdrop-blur-xl px-5 py-3 rounded-2xl border-2 shadow-xl"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(211, 175, 55, 0.4)',
            boxShadow: '0 8px 32px rgba(211, 175, 55, 0.3)'
          }}
        >
          <Zap className="w-5 h-5" style={{ color: '#D3AF37' }} />
          <span className="text-white text-lg">Fast</span>
        </div>
      </motion.div>

      {/* Enhanced connecting lines with gradient */}
      <svg className="absolute inset-0 w-full h-full" style={{ filter: 'blur(0.5px)' }}>
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#D3AF37', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#B8941F', stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        <motion.circle
          cx="50%"
          cy="50%"
          r="150"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="2"
          strokeDasharray="15 10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="220"
          fill="none"
          stroke="rgba(211, 175, 55, 0.1)"
          strokeWidth="1"
          strokeDasharray="8 12"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="280"
          fill="none"
          stroke="rgba(211, 175, 55, 0.05)"
          strokeWidth="1"
          strokeDasharray="5 15"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
}
