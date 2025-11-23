import { motion } from 'motion/react';
import { FileText, Mic, ChevronDown, Plus, Filter, ArrowUpDown, Upload, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { grievanceService } from '../api';
import { handleApiError, validateFile } from '../utils/errorHandler';
import type { User, Grievance } from '../types';

interface CompliantPortalProps {
  user: User;
}

export function CompliantPortal({ user }: CompliantPortalProps) {
  const [subject, setSubject] = useState('');
  const [bankInstitution, setBankInstitution] = useState('');
  const [complaintDetail, setComplaintDetail] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [complaints, setComplaints] = useState<Grievance[]>([]); // For form reset only
  // Use React Query for fetching complaints
  const {
    data: complaintsData,
    isLoading,
    error: complaintsError,
    refetch: refetchComplaints
  } = useQuery({
    queryKey: ['complaints', viewMode],
    queryFn: async () => {
      if (viewMode !== 'list') return [];
      const response = await grievanceService.getGrievances({ page: 1, limit: 10 });
      return response.results;
    },
    enabled: viewMode === 'list',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [voiceAudio, setVoiceAudio] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Clean up audio stream on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      // Attempt to stop any active audio stream
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  const subjects = [
    { label: 'Fraud', value: 'financial_fraud' },
    { label: 'Identity Theft', value: 'identity_theft' },
    { label: 'Phishing Attempt', value: 'phishing_attempt' },
    { label: 'Document Forgery', value: 'document_forgery' },
    { label: 'Trust Verification', value: 'trust_verification' },
    { label: 'Malware Suspicion', value: 'malware_suspicion' },
  ];
  
  const banks = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'Other'];

  // Removed fetchComplaints and useEffect, now handled by React Query

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      try {
        validateFile(file, 'image');
        validFiles.push(file);
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    setEvidenceFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'voice-complaint.wav', { type: 'audio/wav' });
        setVoiceAudio(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

    // Validation
    if (!subject) {
      setError('Please select a subject');
      return;
    }

    if (!complaintDetail.trim()) {
      setError('Please enter complaint details');
      return;
    }

    if (complaintDetail.trim().length < 20) {
      setError('Complaint details must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const title = `${subject} - ${bankInstitution || 'General'}`;
      
      await grievanceService.createGrievanceWithProgress(
        {
          title,
          description: complaintDetail.trim(),
          category: subjects.find(s => s.label === subject)?.value || 'financial_fraud',
          priority: 'Medium',
          evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined,
          voiceAudio: voiceAudio || undefined,
        },
        (progress) => setUploadProgress(progress)
      );

      setSuccessMessage('Complaint submitted successfully!');
      // Reset form
      setSubject('');
      setBankInstitution('');
      setComplaintDetail('');
      setEvidenceFiles([]);
      setVoiceAudio(null);
      // Refetch complaints and return to list view after 2 seconds
      setTimeout(() => {
        refetchComplaints();
        setViewMode('list');
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      const errorResult = handleApiError(err);
      setError(errorResult.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', ' /');
  };

  // List view - showing all complaints
  if (viewMode === 'list') {
    return (
      <div className="w-full">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-4xl text-white mb-3">
            Hey {user.name.split(' ')[0]}, Welcome to <span className="text-[#FFF86A]">Tri</span>klan
          </h2>
          <p className="text-white/70 text-xl">Been scammed? Raise your voice to take action</p>
        </div>

        {/* Error Display */}
        {(error || complaintsError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error || (complaintsError ? complaintsError.message : '')}
          </motion.div>
        )}

        {/* My Complaints Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-4xl">My Complaints</h3>
            
            {/* New Complaints Button */}
            <button
              onClick={() => setViewMode('create')}
              className="px-8 py-3 rounded-2xl border-2 border-[#FFCF2F] text-white text-xl flex items-center gap-3 hover:bg-[#FFCF2F]/10 transition-all"
            >
              New Complaints <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* White divider line */}
          <div className="w-full h-px bg-white mb-4" />

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-[#FFCF2F] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white mt-4">Loading complaints...</p>
            </div>
          ) : (complaintsData?.length ?? 0) === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-xl">No complaints found. Create your first complaint!</p>
            </div>
          ) : (
            /* Table */
            <div
              className="rounded-2xl overflow-hidden p-8"
              style={{
                background: 'radial-gradient(circle at center, rgba(110,97,97,0.3) 0%, rgba(161,141,141,0.35) 50%, rgba(212,186,186,0.4) 100%)',
              }}
            >
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-6 mb-6 pb-4">
                <div className="col-span-2">
                  <p className="text-white/60 text-xl">Complaint ID</p>
                  <div className="w-full h-0.5 bg-[#FFCF2F] mt-2" />
                </div>
                <div className="col-span-4">
                  <p className="text-white/60 text-xl">Title</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/60 text-xl">Status</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/60 text-xl">Priority</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/60 text-xl">Date</p>
                </div>
              </div>

              {/* Table Rows */}
              <div className="space-y-0">
                {complaintsData?.map((complaint, index) => (
                  <div
                    key={complaint.id}
                    className="grid grid-cols-12 gap-6 py-5 border-t border-white/30"
                  >
                    <div className="col-span-2">
                      <p className="text-white text-lg">#{complaint.id.slice(0, 8)}</p>
                    </div>
                    <div className="col-span-4">
                      <p className="text-white text-lg">{complaint.title}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        complaint.status === 'Open' ? 'bg-blue-500/20 text-blue-400' :
                        complaint.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        complaint.status === 'Resolved' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        complaint.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                        complaint.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                        complaint.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white text-sm">{formatDate(complaint.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create new complaint view
  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-4xl text-white mb-3">Complaint Portal</h2>
          <p className="text-white/70 text-lg">File complaint to resolve your issue</p>
        </div>
        
        {/* Back to List Button */}
        <button
          onClick={() => setViewMode('list')}
          className="px-6 py-3 rounded-xl border-2 border-[#FFCF2F] text-white hover:bg-[#FFCF2F]/10 transition-all"
        >
          ← Back to Complaints
        </button>
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

      {/* Success Display */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm"
        >
          {successMessage}
        </motion.div>
      )}

      <div
        className="p-8 rounded-3xl backdrop-blur-xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          borderColor: 'rgba(211, 175, 55, 0.2)',
        }}
      >
        {/* Subject Dropdown */}
        <div className="mb-6">
          <label className="block text-white text-xl mb-3">Subject *</label>
          <div className="relative">
            <button
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              className="w-full max-w-md px-4 py-3 bg-[rgba(217,217,217,0.41)] rounded-xl text-white text-left flex items-center justify-between focus:outline-none"
            >
              <span className={!subject ? 'text-white/50' : ''}>{subject || 'Select Subject'}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showSubjectDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSubjectDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 w-full max-w-md bg-zinc-200 rounded-xl overflow-hidden shadow-xl z-50"
              >
                {subjects.map((subj, index) => (
                  <button
                    key={subj.value}
                    onClick={() => {
                      setSubject(subj.label);
                      setShowSubjectDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all ${
                      index !== subjects.length - 1 ? 'border-b border-black' : ''
                    }`}
                  >
                    {subj.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Bank/Institution Dropdown */}
        <div className="mb-6">
          <label className="block text-white text-xl mb-3">Bank/Institution (Optional)</label>
          <div className="relative">
            <button
              onClick={() => setShowBankDropdown(!showBankDropdown)}
              className="w-full max-w-md px-4 py-3 bg-[rgba(217,217,217,0.41)] rounded-xl text-white text-left flex items-center justify-between focus:outline-none"
            >
              <span className={!bankInstitution ? 'text-white/50' : ''}>{bankInstitution || 'Select Bank/Institution'}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showBankDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 w-full max-w-md bg-zinc-200 rounded-xl overflow-hidden shadow-xl z-50"
              >
                {banks.map((bank, index) => (
                  <button
                    key={bank}
                    onClick={() => {
                      setBankInstitution(bank);
                      setShowBankDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-black hover:bg-zinc-300 transition-all ${
                      index !== banks.length - 1 ? 'border-b border-black' : ''
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Complaint Detail */}
        <div className="mb-6">
          <label className="block text-white text-xl mb-3">Complaint Detail * (Min 20 characters)</label>
          <div className="relative">
            <textarea
              value={complaintDetail}
              onChange={(e) => setComplaintDetail(e.target.value)}
              placeholder="Type your Complaint"
              className="w-full px-4 py-4 bg-transparent border border-white rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[#FFCF2F] transition-all resize-none"
              rows={5}
            />
            <div className="absolute bottom-4 right-4 flex gap-3">
              {/* File Upload */}
              <label className="p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                <FileText className="w-5 h-5 text-white" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {/* Voice Recording */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-lg transition-all ${isRecording ? 'bg-red-500/30 animate-pulse' : 'hover:bg-white/10'}`}
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-2">{complaintDetail.length} / 20 minimum</p>
        </div>

        {/* File Previews */}
        {evidenceFiles.length > 0 && (
          <div className="mb-6">
            <label className="block text-white text-xl mb-3">Evidence Files ({evidenceFiles.length})</label>
            <div className="flex flex-wrap gap-3">
              {evidenceFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="w-24 h-24 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-white/70 text-xs mt-1 truncate w-24">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Recording Preview */}
        {voiceAudio && (
          <div className="mb-6">
            <label className="block text-white text-xl mb-3">Voice Recording</label>
            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
              <Mic className="w-6 h-6 text-[#FFCF2F]" />
              <span className="text-white flex-1">{voiceAudio.name}</span>
              <button
                onClick={() => setVoiceAudio(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isSubmitting && uploadProgress > 0 && (
          <div className="mb-6">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFCF2F]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-white/70 text-sm mt-2 text-center">{uploadProgress}% uploaded</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-12 py-4 rounded-2xl text-white text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #FFCF2F 0%, #A98303 100%)' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}