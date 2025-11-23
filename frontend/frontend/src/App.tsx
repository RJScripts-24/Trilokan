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
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ backgroundColor: '#D3AF37', opacity: 0.2 }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: '#D3AF37', opacity: 0.15 }}
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#D3AF37 1px, transparent 1px), linear-gradient(90deg, #D3AF37 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Empty space for particle field visibility */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          {/* Logo with enhanced styling */}
          <div className="absolute top-12 left-12">
            <h1 className="text-5xl tracking-tight">
            </h1>
          </div>

          <div>
            {/* Sign In Form */}
            {!isSignUp ? (
              <div
                key="signin"
                className="w-full max-w-md"
              >
                {/* Glass card container */}
                <div
                  className="relative p-10 rounded-3xl backdrop-blur-xl border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    borderColor: 'rgba(211, 175, 55, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(211, 175, 55, 0.1)'
                  }}
                >
                  {/* Glow effect inside card */}
                  <div className="absolute inset-0 rounded-3xl"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(211, 175, 55, 0.05), transparent 70%)'
                    }}
                  />

                  <div className="relative z-10">
                    {/* Logo at top of form */}
                    <div className="text-center mb-8">
                      <h1 className="text-4xl tracking-tight mb-6">
                        <span style={{ color: '#D3AF37', fontWeight: 700 }}>Tri</span>
                        <span className="text-white" style={{ fontWeight: 300 }}>Løklan</span>
                      </h1>
                    </div>

                    <div className="text-center mb-8">
                      <h2 className="text-4xl text-white mb-3">
                        Welcome Back
                      </h2>
                      <p className="text-zinc-400">Sign in to continue to your account</p>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-6">
                      {/* Error Display */}
                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      <div>
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
                      </div>

                      <div>
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
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: '#D3AF37' }} />
                          <span className="text-zinc-400 text-sm">Remember me</span>
                        </label>
                        <button type="button" className="text-sm hover:underline transition-all" style={{ color: '#D3AF37' }}>
                          Forgot Password?
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 px-6 py-4 text-black rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)',
                        }}
                      >
                        <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                        {!isLoading && <ArrowRight className="w-5 h-5" />}
                      </button>
                    </form>

                    <div className="mt-8 text-center">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        <span className="text-zinc-500 text-sm">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                      </div>
                      
                      <p className="text-zinc-400">
                        Don't have an account?{' '}
                        <button
                          onClick={() => setIsSignUp(true)}
                          className="transition-colors"
                          style={{ color: '#D3AF37' }}
                        >
                          Sign Up
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sign Up Form */
              <div
                key="signup"
                className="w-full max-w-md"
              >
                <div
                  className="relative p-10 rounded-3xl backdrop-blur-xl border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    borderColor: 'rgba(211, 175, 55, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(211, 175, 55, 0.1)'
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(211, 175, 55, 0.05), transparent 70%)'
                    }}
                  />

                  <div className="relative z-10">
                    <div className="text-center mb-8">
                      <h2 className="text-4xl text-white mb-3">
                        Create Account
                      </h2>
                      <p className="text-zinc-400">Join us and start your journey</p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-5">
                      {/* Error Display */}
                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
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
                      </div>

                      <div>
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
                      </div>

                      <div>
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
                      </div>

                      <div>
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
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 px-6 py-4 text-black rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: 'linear-gradient(135deg, #D3AF37 0%, #B8941F 100%)',
                        }}
                      >
                        <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                        {!isLoading && <ArrowRight className="w-5 h-5" />}
                      </button>
                    </form>

                    <div className="mt-8 text-center">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        <span className="text-zinc-500 text-sm">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                      </div>
                      
                      <p className="text-zinc-400">
                        Already have an account?{' '}
                        <button
                          onClick={() => setIsSignUp(false)}
                          className="transition-colors"
                          style={{ color: '#D3AF37' }}
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}