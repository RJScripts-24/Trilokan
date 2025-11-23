import { motion } from 'motion/react';
import { ChevronDown, Upload, CheckCircle, XCircle, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { appService } from '../api';
import { handleApiError, validateFile } from '../utils/errorHandler';
import type { AppVerificationResult } from '../types';

export function AppChecker() {
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'link' | 'file'>('upload');
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [packageName, setPackageName] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<AppVerificationResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      try {
        validateFile(file, 'apk');
        setSelectedFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        validateFile(file, 'apk');
        setSelectedFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid file');
      }
    }
  };

  const handleVerifyApp = async () => {
    setError('');
    setIsVerifying(true);
    setUploadProgress(0);

    try {
      let result: AppVerificationResult;

      if (uploadMethod === 'link' && packageName.trim()) {
        result = await appService.verifyAppPackage(packageName.trim());
      } else if (selectedFile) {
        result = await appService.verifyAppFileWithProgress(
          selectedFile,
          (progress) => setUploadProgress(progress)
        );
      } else {
        setError('Please select a file or enter a package name');
        setIsVerifying(false);
        return;
      }

      setVerificationResult(result);
      setIsChecked(true);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
      setUploadProgress(0);
    }
  };

  const handleCheckAnother = () => {
    setIsChecked(false);
    setSelectedFile(null);
    setPackageName('');
    setVerificationResult(null);
    setError('');
    setUploadProgress(0);
  };

  // Calculate trust score percentage
  const getTrustScorePercentage = () => {
    if (!verificationResult) return 0;
    return Math.round(verificationResult.trustScore * 100);
  };

  // Get risk color based on trust score
  const getRiskColor = () => {
    const score = getTrustScorePercentage();
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isChecked && verificationResult) {
    // Results view
    return (
      <div className="w-full">
        <h2 className="text-4xl text-white mb-8">App Checker</h2>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Community Score Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              borderColor: '#D3AF37',
              background: '#1A1A1A',
            }}
          >
            <h3 className="text-white text-2xl mb-6">Trust Score</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-8 border-zinc-800/50" />
                
                {/* Inner filled circle */}
                <div className="absolute inset-[20%] rounded-full bg-[#FFCF2F] flex items-center justify-center">
                  <motion.span
                    className="text-5xl text-black font-semibold"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {getTrustScorePercentage()}
                  </motion.span>
                </div>
                
                {/* Bottom text */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                  <span className="text-xl text-white">/94</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 rounded-2xl border-2 backdrop-blur-xl flex flex-col justify-center"
            style={{
              borderColor: '#D3AF37',
              background: '#1A1A1A',
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              {verificationResult.isSafe ? (
                <CheckCircle className="w-8 h-8 text-[#FFCF2F] flex-shrink-0 mt-1" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              )}
              <p className={`text-lg leading-relaxed ${verificationResult.isSafe ? 'text-[#FFCF2F]' : 'text-red-400'}`}>
                {verificationResult.isSafe 
                  ? 'No security threats detected' 
                  : verificationResult.malwareDetected 
                    ? 'Malware detected - Do not install!' 
                    : 'Potential security risks found'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-lg">{selectedFile?.name || verificationResult.appId || 'App'}</span>
              <span className="px-3 py-1 rounded-full text-sm text-white bg-[rgba(255,207,47,0.4)]">
                APK
              </span>
              {verificationResult.isOfficial && (
                <span className="px-3 py-1 rounded-full text-sm text-white bg-green-500/20 border border-green-500/40">
                  Official
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Warnings Section */}
        {verificationResult.warnings && verificationResult.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
          >
            <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings
            </h4>
            <ul className="space-y-1">
              {verificationResult.warnings.map((warning, idx) => (
                <li key={idx} className="text-yellow-300 text-sm">• {warning}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-8 mb-6 border-b border-zinc-800">
          <button className="pb-3 text-white border-b-2 border-transparent text-lg">Detection</button>
          <button className="pb-3 text-white/60 hover:text-white transition-colors text-lg">Details</button>
          <button className="pb-3 text-white/60 hover:text-white transition-colors text-lg">Community</button>
        </div>

        {/* Permissions/Analysis Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl overflow-hidden p-8"
          style={{
            background: 'radial-gradient(circle at center, rgba(110,97,97,0.3) 0%, rgba(161,141,141,0.35) 50%, rgba(212,186,186,0.4) 100%)',
          }}
        >
          <div className="grid grid-cols-2 gap-x-16 gap-y-6">
            {verificationResult.analysis?.permissions && verificationResult.analysis.permissions.length > 0 ? (
              verificationResult.analysis.permissions.map((permission, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between py-3 border-b border-zinc-800/50"
                >
                  <div className="flex-1">
                    <span className="text-white text-base">{permission.permission}</span>
                    {permission.description && (
                      <p className="text-gray-400 text-sm mt-1">{permission.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      permission.riskLevel === 'high' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                        : permission.riskLevel === 'medium' 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/40'
                    }`}>
                      {permission.riskLevel || 'low'}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No permissions data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Back button */}
        <div className="flex justify-start mt-8">
          <motion.button
            onClick={handleCheckAnother}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 rounded-xl border-2 border-[#FFCF2F] text-white hover:bg-[#FFCF2F]/10 transition-all"
          >
            Check Another App
          </motion.button>
        </div>
      </div>
    );
  }

  // Upload view
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-4xl text-white mb-3">App Checker</h2>
        <p className="text-white/70 text-lg">Upload your APK file to detect the Fraud/malicious activity</p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <p className="text-red-400 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            {error}
          </p>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl backdrop-blur-xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          borderColor: 'rgba(211, 175, 55, 0.2)',
        }}
      >
        {/* Choose Method Dropdown */}
        <div className="mb-8">
          <label className="block text-white text-2xl mb-4">Choose method</label>
          <div className="relative">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              className="w-full max-w-md px-4 py-3 bg-transparent border-b-2 border-white text-white text-left flex items-center justify-between focus:outline-none"
            >
              <span>
                {uploadMethod === 'upload' && 'Upload APK'}
                {uploadMethod === 'link' && 'Give Link'}
                {uploadMethod === 'file' && 'Choose File'}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showMethodDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showMethodDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 w-full max-w-md bg-zinc-200 rounded-xl overflow-hidden shadow-xl z-50"
              >
                <button
                  onClick={() => {
                    setUploadMethod('upload');
                    setShowMethodDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all border-b border-black"
                >
                  Upload APK
                </button>
                <button
                  onClick={() => {
                    setUploadMethod('link');
                    setShowMethodDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all border-b border-black"
                >
                  Give Link
                </button>
                <button
                  onClick={() => {
                    setUploadMethod('file');
                    setShowMethodDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all"
                >
                  Choose File
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Upload Method Input */}
        <div className="mb-8">
          {uploadMethod === 'link' ? (
            <>
              <label className="block text-white text-2xl mb-4">Package Name</label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g., com.example.app"
                className="w-full px-4 py-3 bg-[#D9D9D9] text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF2F]"
              />
            </>
          ) : (
            <>
              <label className="block text-white text-2xl mb-4">Upload APK</label>
              <input
                type="file"
                accept=".apk"
                onChange={handleFileSelect}
                className="px-4 py-2 bg-[#D9D9D9] text-black rounded-lg cursor-pointer"
              />
              {selectedFile && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[#FFCF2F] mt-2 flex items-center gap-2"
                >
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </motion.p>
              )}
            </>
          )}
        </div>

        {/* Upload Progress */}
        {isVerifying && uploadProgress > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex justify-between text-white mb-2">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#FFCF2F]"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Drop File Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative p-16 rounded-3xl bg-gradient-radial from-zinc-800/50 to-zinc-900/30 border-2 border-dashed transition-all mb-8 ${
            dragActive ? 'border-[#FFCF2F] bg-[#FFCF2F]/10' : 'border-white/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <Upload className="w-16 h-16 text-white/50 mb-4" />
            <p className="text-white/70 text-2xl text-center">Drop File</p>
            <p className="text-white/50 text-sm mt-2">or click to browse</p>
          </div>
        </div>

        {/* Check button */}
        <div className="flex justify-end">
          <motion.button
            onClick={handleVerifyApp}
            whileHover={{ scale: isVerifying ? 1 : 1.05 }}
            whileTap={{ scale: isVerifying ? 1 : 0.95 }}
            className="px-16 py-5 rounded-2xl text-white text-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #FFCF2F 0%, #A98303 100%)' }}
            disabled={isVerifying || (!selectedFile && !(uploadMethod === 'link' && packageName.trim()))}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {uploadProgress > 0 ? 'UPLOADING...' : 'ANALYZING...'}
              </>
            ) : (
              'CHECK'
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}