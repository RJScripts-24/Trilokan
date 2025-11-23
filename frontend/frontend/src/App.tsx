import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { AdvancedParticleField } from './components/AdvancedParticleField';
import { Dashboard } from './components/Dashboard';
import { authService } from './api';
import { handleApiError, validatePassword, validateEmail } from './utils/errorHandler';
import type { User as UserType } from './types';

export default function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign up state
  const [name, setName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if user is already logged in on component mount
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && authService.isAuthenticated()) {
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    // Validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });
      
      // Store auth data
      authService.storeAuthData(response);
      
      // Update state
      setCurrentUser(response.user);
      setIsLoggedIn(true);
      setError('');
    } catch (err: any) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    // Validation
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!validateEmail(signUpEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordErrors = validatePassword(signUpPassword);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    if (signUpPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        name: name.trim(),
        email: signUpEmail,
        password: signUpPassword,
      });
      
      // Store auth data
      authService.storeAuthData(response);
      
      // Update state
      setCurrentUser(response.user);
      setIsLoggedIn(true);
      setError('');
      setValidationErrors([]);
    } catch (err: any) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
      if (errorResult.errors) {
        setValidationErrors(errorResult.errors.map(e => e.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setEmail('');
      setPassword('');
      setName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setConfirmPassword('');
      setError('');
      setValidationErrors([]);
    }
  };

  if (isLoggedIn && currentUser) {
    return <Dashboard user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Enhanced ambient effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black via-zinc-950 to-black" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ backgroundColor: '#D3AF37' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: '#D3AF37' }}
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#D3AF37 1px, transparent 1px), linear-gradient(90deg, #D3AF37 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Particle Field Background - spans entire screen */}
      <AdvancedParticleField />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Empty space for particle field visibility */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Decorative elements */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-20 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#D3AF37' }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-20 w-3 h-3 rounded-full"
            style={{ backgroundColor: '#D3AF37', opacity: 0.5 }}
          />
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          {/* Logo with enhanced styling */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-12 left-12"
          >
            <motion.h1 
              className="text-5xl tracking-tight"
              whileHover={{ scale: 1.05 }}
            >
            </motion.h1>
          </motion.div>

          {/* Decorative floating elements */}
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-32 right-32 w-20 h-20 rounded-2xl border-2 opacity-10"
            style={{ borderColor: '#D3AF37' }}
          />

          <AnimatePresence mode="wait">
            {/* Sign In Form */}
            {!isSignUp ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full max-w-md"
              >
                {/* Glass card container */}
                <motion.div
                  className="relative p-10 rounded-3xl backdrop-blur-xl border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    borderColor: 'rgba(211, 175, 55, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(211, 175, 55, 0.1)'
                  }}
                >
                  {/* Glow effect inside card */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(211, 175, 55, 0.1), transparent 70%)'
                    }}
                  />

                  <div className="relative z-10">
                    {/* Logo at top of form */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="text-center mb-8"
                    >
                      <motion.h1 
                        className="text-4xl tracking-tight mb-6"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span style={{ color: '#D3AF37', fontWeight: 700 }}>Tri</span>
                        <span className="text-white" style={{ fontWeight: 300 }}>Løklan</span>
                      </motion.h1>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="text-center mb-8"
                    >
                      <h2 className="text-4xl text-white mb-3">
                        Welcome Back
                      </h2>
                      <p className="text-zinc-400">Sign in to continue to your account</p>
                    </motion.div>

                    <form onSubmit={handleSignIn} className="space-y-6">
                      {/* Error Display */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex items-center justify-between"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: '#D3AF37' }} />
                          <span className="text-zinc-400 text-sm">Remember me</span>
                        </label>
                        <button type="button" className="text-sm hover:underline transition-all" style={{ color: '#D3AF37' }}>
                          Forgot Password?
                        </button>
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(211, 175, 55, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 px-6 py-4 text-black rounded-xl flex items-center justify-center gap-3 group transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)',
                        }}
                      >
                        <span className="relative z-10">{isLoading ? 'Signing In...' : 'Sign In'}</span>
                        {!isLoading && (
                          <motion.div
                            className="relative z-10"
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </motion.div>
                        )}
                        
                        {/* Shine effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.button>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="mt-8 text-center"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        <span className="text-zinc-500 text-sm">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                      </div>
                      
                      <p className="text-zinc-400">
                        Don't have an account?{' '}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsSignUp(true)}
                          className="transition-colors"
                          style={{ color: '#D3AF37' }}
                        >
                          Sign Up
                        </motion.button>
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              /* Sign Up Form */
              <motion.div
                key="signup"
                initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full max-w-md"
              >
                <motion.div
                  className="relative p-10 rounded-3xl backdrop-blur-xl border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    borderColor: 'rgba(211, 175, 55, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(211, 175, 55, 0.1)'
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(211, 175, 55, 0.1), transparent 70%)'
                    }}
                  />

                  <div className="relative z-10">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="text-center mb-8"
                    >
                      <h2 className="text-4xl text-white mb-3">
                        Create Account
                      </h2>
                      <p className="text-zinc-400">Join us and start your journey</p>
                    </motion.div>

                    <form onSubmit={handleSignUp} className="space-y-5">
                      {/* Error Display */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm"
                        >
                          <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type="email"
                            placeholder="your.email@example.com"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                      >
                        <label className="block text-zinc-400 mb-2 text-sm">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm border-2 text-white placeholder-zinc-600 focus:outline-none transition-all rounded-xl"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#D3AF37';
                              e.target.style.backgroundColor = 'rgba(211, 175, 55, 0.05)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(211, 175, 55, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 px-6 py-4 text-black rounded-xl flex items-center justify-center gap-3 group transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)',
                        }}
                      >
                        <span className="relative z-10">{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                        {!isLoading && (
                          <motion.div
                            className="relative z-10"
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </motion.div>
                        )}
                        
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.button>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      className="mt-8 text-center"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        <span className="text-zinc-500 text-sm">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                      </div>
                      
                      <p className="text-zinc-400">
                        Already have an account?{' '}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsSignUp(false)}
                          className="transition-colors"
                          style={{ color: '#D3AF37' }}
                        >
                          Sign In
                        </motion.button>
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}