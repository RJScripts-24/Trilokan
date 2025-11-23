import { motion } from 'motion/react';
import { Camera, Play, User as UserIcon, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { identityService } from '../api';
import { handleApiError, validateFile } from '../utils/errorHandler';
import type { User, Challenge, IdentityVerificationResult } from '../types';

interface IdentityVerificationProps {
  user: User;
}

export function IdentityVerification({ user }: IdentityVerificationProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<File | null>(null);
  const [voiceAudio, setVoiceAudio] = useState<File | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  // Use React Query for challenge fetching
  const {
    data: challenge,
    error: challengeError,
    refetch: refetchChallenge,
    isFetching: isChallengeFetching
  } = useQuery({
    queryKey: ['identity-challenge', user.isIdentityVerified],
    queryFn: async () => {
      if (user.isIdentityVerified) return null;
      return await identityService.getChallenge();
    },
    enabled: !user.isIdentityVerified,
    staleTime: 1000 * 60 * 2,
  });
  const [verificationResult, setVerificationResult] = useState<IdentityVerificationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Remove fetchChallenge and useEffect, use React Query instead

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setError('');
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoFile = new File([videoBlob], 'face-verification.webm', { type: 'video/webm' });
        setRecordedVideo(videoFile);
        stopCamera();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleIdDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file, 'document');
      setIdDocument(file);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitVerification = async () => {
    setError('');
    setVerificationResult(null);

    // Validation
    if (!recordedVideo) {
      setError('Please record a face video first');
      return;
    }

    setIsVerifying(true);
    setUploadProgress(0);

    try {
      const result = await identityService.verifyIdentityWithProgress(
        {
          faceVideo: recordedVideo,
          voiceAudio: voiceAudio || undefined,
          idDocument: idDocument || undefined,
          challengeId: challenge?.id,
        },
        (progress) => setUploadProgress(progress)
      );

      setVerificationResult(result);
      
      if (result.verified) {
        // Update user verification status in localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.isIdentityVerified = true;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setIsVerifying(false);
      setUploadProgress(0);
    }
  };

  // If user is already verified
  if (user.isIdentityVerified) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-4xl text-white mb-3">Identity Verification</h2>
          <p className="text-white/70 text-lg">Your identity is already verified</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl backdrop-blur-xl border text-center"
          style={{
            background: '#1A1A1A',
            borderColor: 'rgba(211, 175, 55, 0.3)',
          }}
        >
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl text-white mb-3">Identity Verified!</h3>
          <p className="text-white/70">Your identity has been successfully verified.</p>
        </motion.div>
      </div>
    );
  }

  // If verification is complete
  if (verificationResult) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-4xl text-white mb-3">Verification Results</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl backdrop-blur-xl border"
          style={{
            background: '#1A1A1A',
            borderColor: 'rgba(211, 175, 55, 0.3)',
          }}
        >
          <div className="text-center mb-8">
            {verificationResult.verified ? (
              <>
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                <h3 className="text-3xl text-white mb-3">Verification Successful!</h3>
                <p className="text-white/70 text-lg">Your identity has been verified with {(verificationResult.confidence * 100).toFixed(1)}% confidence.</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
                <h3 className="text-3xl text-white mb-3">Verification Failed</h3>
                <p className="text-white/70 text-lg">We couldn't verify your identity. Please try again.</p>
              </>
            )}
          </div>

          {/* Results Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {verificationResult.results.faceMatch !== undefined && (
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 mb-2">Face Match</p>
                <p className="text-2xl text-white">{(verificationResult.results.faceMatch * 100).toFixed(1)}%</p>
              </div>
            )}
            {verificationResult.results.voiceMatch !== undefined && (
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 mb-2">Voice Match</p>
                <p className="text-2xl text-white">{(verificationResult.results.voiceMatch * 100).toFixed(1)}%</p>
              </div>
            )}
            {verificationResult.results.livenessScore !== undefined && (
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 mb-2">Liveness Score</p>
                <p className="text-2xl text-white">{(verificationResult.results.livenessScore * 100).toFixed(1)}%</p>
              </div>
            )}
            {verificationResult.results.documentVerified !== undefined && (
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 mb-2">Document Verified</p>
                <p className="text-2xl text-white">{verificationResult.results.documentVerified ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {verificationResult.warnings && verificationResult.warnings.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 font-semibold mb-2">Warnings:</p>
              <ul className="list-disc list-inside text-yellow-300 space-y-1">
                {verificationResult.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {verificationResult.recommendations && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-400 font-semibold mb-2">Recommendations:</p>
              <p className="text-blue-300">{verificationResult.recommendations}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {!verificationResult.verified && (
              <motion.button
                onClick={() => {
                  setVerificationResult(null);
                  setRecordedVideo(null);
                  setVoiceAudio(null);
                  setIdDocument(null);
                  refetchChallenge();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-2xl text-black font-semibold text-lg"
                style={{ backgroundColor: '#D3AF37' }}
              >
                Try Again
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Main verification UI
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-4xl text-white mb-3">Identity Verification</h2>
        <p className="text-white/70 text-lg">Complete the verification to secure your account</p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl backdrop-blur-xl border"
        style={{
          background: '#1A1A1A',
          borderColor: 'rgba(211, 175, 55, 0.3)',
        }}
      >
        {/* Challenge Text */}
        {challenge && (
          <div className="mb-6 p-4 bg-[#D3AF37]/10 border border-[#D3AF37]/30 rounded-xl text-center">
            <p className="text-white/70 text-sm mb-2">Liveness Challenge</p>
            <p className="text-[#D3AF37] text-xl font-semibold">"{challenge.text}"</p>
            <p className="text-white/50 text-xs mt-2">Please say this phrase during recording</p>
          </div>
        )}

        <p className="text-white text-center text-xl mb-6">Please look at the camera and say the phrase above</p>

        {/* Camera Feed */}
        <div className="relative mx-auto w-full max-w-[600px] h-[350px] rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border-2 border-[#D3AF37] overflow-hidden">
          {showCamera ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-sm font-semibold">Recording</span>
                </div>
              )}
            </>
          ) : recordedVideo ? (
            <div className="text-center">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
              <p className="text-white text-xl">Video Recorded!</p>
              <p className="text-white/70 text-sm mt-2">{(recordedVideo.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="relative text-center">
              <div className="w-48 h-48 rounded-full bg-zinc-800 flex items-center justify-center relative overflow-hidden mx-auto">
                <UserIcon className="w-32 h-32 text-zinc-700" />
              </div>
              <p className="text-white/60 mt-4">Click camera button to start</p>
            </div>
          )}

          {/* Camera Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
            {!showCamera && !recordedVideo && (
              <motion.button
                onClick={startCamera}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg"
                style={{ backgroundColor: '#D3AF37' }}
              >
                <Camera className="w-8 h-8 text-black" />
              </motion.button>
            )}
            
            {showCamera && !isRecording && (
              <>
                <motion.button
                  onClick={startRecording}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-white" />
                </motion.button>
                <motion.button
                  onClick={stopCamera}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-500 text-white shadow-lg"
                >
                  <X className="w-8 h-8" />
                </motion.button>
              </>
            )}
            
            {isRecording && (
              <motion.button
                onClick={stopRecording}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg"
              >
                <div className="w-6 h-6 bg-white" />
              </motion.button>
            )}

            {recordedVideo && (
              <motion.button
                onClick={() => {
                  setRecordedVideo(null);
                  setShowCamera(false);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-500 text-white shadow-lg"
              >
                <X className="w-8 h-8" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Optional Uploads */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* ID Document Upload */}
          <div>
            <label className="block text-white text-lg mb-2">ID Document (Optional)</label>
            <div className="relative">
              {!idDocument ? (
                <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-[#D3AF37] hover:bg-white/5 transition-all cursor-pointer">
                  <Upload className="w-6 h-6 text-white/70" />
                  <span className="text-white/70">Upload ID Document (PDF, JPG, PNG)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleIdDocumentUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-white">{idDocument.name}</p>
                      <p className="text-white/50 text-sm">{(idDocument.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIdDocument(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {isVerifying && uploadProgress > 0 && (
          <div className="mb-6">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full bg-[#D3AF37]"
              />
            </div>
            <p className="text-white/70 text-sm mt-2 text-center">
              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Verifying...'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <motion.button
            onClick={handleSubmitVerification}
            disabled={!recordedVideo || isVerifying}
            whileHover={recordedVideo && !isVerifying ? { scale: 1.05 } : {}}
            whileTap={recordedVideo && !isVerifying ? { scale: 0.95 } : {}}
            className="px-10 py-4 rounded-2xl text-black font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#D3AF37' }}
          >
            {isVerifying ? 'VERIFYING...' : 'START VERIFICATION'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}