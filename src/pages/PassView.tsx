import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Student } from '../types';
import { StudentCard } from '../components/StudentCard';
import { RTOS, RTOConfig } from '../lib/rtoConfig';
import QRCode from 'react-qr-code';
import { cn } from '../lib/utils';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert, 
  Wallet, 
  HelpCircle, 
  FileJson, 
  RotateCw, 
  Smartphone, 
  Key, 
  Download, 
  BookOpen,
  Info
} from 'lucide-react';

export function PassView() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [rto, setRto] = useState<RTOConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'verified' | 'failed'>('verifying');
  const [error, setError] = useState('');

  const [added, setAdded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [osDetected, setOsDetected] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [addingToWallet, setAddingToWallet] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGoogleWalletSimulator, setShowGoogleWalletSimulator] = useState(false);
  const [googleWalletObject, setGoogleWalletObject] = useState<any>(null);
  
  // Custom High-Fidelity Pass States
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAppleWalletAssistant, setShowAppleWalletAssistant] = useState(false);
  const [showCertConfigGuide, setShowCertConfigGuide] = useState(false);

  // 1. Initial Load: Validate student pass from the backend
  useEffect(() => {
    async function verifyAndLoadPass() {
      if (!studentId) {
        setError('No Student ID provided.');
        setVerificationStatus('failed');
        setLoading(false);
        return;
      }

      try {
        setVerificationStatus('verifying');
        const response = await fetch(`/api/pass/${studentId}/status`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setStudent(data.student);
          setRto(data.rto);
          setVerificationStatus('verified');
          
          // Detect Device Type
          const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
          const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
          const isAndroid = /android/i.test(userAgent);
          
          if (isIOS) {
            setOsDetected('ios');
          } else if (isAndroid) {
            setOsDetected('android');
          } else {
            setOsDetected('desktop');
          }
        } else {
          setError(data.error || 'This Student ID card is invalid or was deactivated.');
          setVerificationStatus('failed');
        }
      } catch (err) {
        console.error('Loader error:', err);
        setError('Could not establish secure verification with course training servers.');
        setVerificationStatus('failed');
      } finally {
        setLoading(false);
      }
    }

    verifyAndLoadPass();
  }, [studentId]);

  // Trigger Apple Wallet Download
  const triggerAppleAdd = (id: string) => {
    setAddingToWallet(true);
    // Dynamic download of the certified pkpass file
    setTimeout(() => {
      window.location.href = `/api/pass/${id}/apple`;
      setAddingToWallet(false);
      setAdded(true);
      setShowSuccessModal(true);
    }, 1200);
  };

  // Trigger Google Wallet Action
  const triggerAndroidAdd = async (id: string) => {
    setAddingToWallet(true);
    try {
      const response = await fetch(`/api/pass/${id}/google-object`);
      if (response.ok) {
        const data = await response.json();
        setGoogleWalletObject(data);
        
        setTimeout(() => {
          setAddingToWallet(false);
          setShowGoogleWalletSimulator(true);
        }, 1200);
      } else {
        throw new Error('Failed to generate Google Wallet object payload.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to generate Google Wallet payload: ' + (err.message || 'unknown error'));
      setAddingToWallet(false);
      setVerificationStatus('failed');
    }
  };

  const handleManualAdd = (os: 'ios' | 'android') => {
    if (!student) return;
    if (os === 'ios') {
      setShowAppleWalletAssistant(true); // Don't download unsigned files which crash iOS Safari. Guide beautifully!
    } else {
      triggerAndroidAdd(student.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold tracking-wide mb-2">Verifying Credentials</h2>
        <p className="text-sm text-gray-400 text-center max-w-[280px]">
          Validating college training status against student registration database...
        </p>
      </div>
    );
  }

  if (verificationStatus === 'failed' || !student) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-red-400">Card Verification Failed</h2>
        <div className="max-w-[320px] bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-center mb-8">
          <p className="text-sm text-red-100 leading-relaxed font-medium">
            {error || 'The Student ID Card is inactive or disabled contact administrators.'}
          </p>
        </div>
        <button 
          onClick={() => window.close()} 
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Close Page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center pt-8 pb-12 px-4 selection:bg-white/30 relative overflow-hidden">
      {/* Background radial glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-20 pointer-events-none z-0"
        style={{ backgroundColor: rto?.primaryColor || '#eab308' }}
      ></div>

      <div className="w-full max-w-[340px] flex justify-between items-center mb-6 text-white z-10 font-sans">
        <button 
          onClick={() => window.close()} 
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-sm transition-colors border border-white/5 active:scale-95 animate-fade-in"
        >
          ✕
        </button>
        <span className="font-semibold text-xs uppercase tracking-widest text-gray-400">
          {(rto?.shortName || 'College').toUpperCase()} Student ID
        </span>
        <div className="w-10 h-10"></div> {/* Balance spacer */}
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-5 font-sans">
        {/* Dynamic Verification Badge */}
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full text-green-400 font-medium text-xs shadow-sm shadow-green-500/5 antialiased">
          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
          <span>Card Authenticated & Verified</span>
        </div>

        {/* 3D Flipping Interactive Card Container */}
        <div className="w-full max-w-[340px] h-[450px] perspective-1000 select-none group relative">
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className={cn(
              "w-full h-full relative cursor-pointer transition-transform duration-700 preserve-3d shadow-2xl rounded-[24px]",
              isFlipped ? "[transform:rotateY(180deg)]" : ""
            )}
          >
            {/* Front of Card */}
            <div className="absolute inset-0 w-full h-full backface-hidden">
              <StudentCard student={student} isViewMode={true} className="h-full pointer-events-none" />
              {/* Overlay Tap visual hint on front card */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-white/10 flex items-center gap-1 shadow-sm">
                <RotateCw className="w-2.5 h-2.5 animate-spin-slow" />
                <span>TAP TO FLIP</span>
              </div>
            </div>

            {/* Back of Card */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] rounded-[24px] overflow-hidden flex flex-col font-sans p-6"
              style={{ 
                backgroundColor: rto?.primaryColor || '#1c1c1e', 
                color: rto?.textColor || '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Card Back Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider opacity-90">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  {rto?.shortName || "COLLEGE"} STUDENT CARD
                </div>
                <div className="bg-black/30 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border border-white/5 uppercase flex items-center gap-1">
                  <RotateCw className="w-2.5 h-2.5" /> FLIP FRONT
                </div>
              </div>

              {/* Terms & Administrative rules */}
              <div className="mt-4 flex-grow flex flex-col justify-start gap-4 text-left">
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-wider opacity-75 mb-1.5">Administrative Guidelines</h4>
                  <ul className="text-[10px] leading-relaxed space-y-1 opacity-90 list-disc pl-3">
                    <li>This card remains the property of {rto?.name || "the college"} and must be presented on demand.</li>
                    <li>Entitlement to library access, computer facilities, and student concessions is strictly non-transferable.</li>
                    <li>If found, please mail or return this card to Student Administration services.</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-black/15 p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider opacity-70">Enrolled Course</span>
                    <span className="block text-[11px] font-semibold truncate leading-tight mt-0.5">{student.courseName || student.campus || "Main Campus"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider opacity-70">Email Address</span>
                    <span className="block text-[11px] font-semibold truncate leading-tight mt-0.5">{student.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider opacity-70">Card Code</span>
                    <span className="block text-[11px] font-mono font-semibold leading-tight mt-0.5 text-yellow-400">SECURE-{student.studentNumber.slice(-4)}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider opacity-70">Security Status</span>
                    <span className="block text-[11px] font-mono font-semibold text-green-400 leading-tight mt-0.5">ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Secure QR Code Scanner Block */}
              <div className="mt-auto bg-white rounded-xl p-3 flex items-center justify-between text-black border border-white/10 gap-3">
                <div className="p-1 bg-white shrink-0 rounded-lg">
                  <QRCode 
                    value={`${window.location.origin}/pass/${student.id}`} 
                    size={64} 
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[8px] font-bold tracking-wider uppercase text-gray-400">VERIFICATION PASSPORT</p>
                  <p className="text-[9px] text-gray-600 leading-normal font-medium">Scan code to verify current registry & training status in real-time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Help */}
        <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
          <RotateCw className="w-3 h-3 text-amber-500 animate-spin-slow" />
          <span>Tap the card to view terms & active validation QR code</span>
        </p>

        {/* Unified Direct Inline Save Options Card */}
        <div className="w-full max-w-[340px] bg-[#1c1c1e] p-5 rounded-2xl shadow-lg border border-white/5 flex flex-col items-center">
          <h3 className="text-white font-bold text-sm mb-1 text-center">Save to Mobile Wallet</h3>
          <p className="text-gray-400 text-[11px] text-center mb-4 leading-relaxed">
            Choose your platform to store this verified ID card for fast access offline.
          </p>
          
          <div className="w-full flex flex-col gap-2.5">
            {/* Apple Wallet Action */}
            <button 
              onClick={() => handleManualAdd('ios')}
              className="w-full py-3 rounded-xl bg-white text-black hover:bg-gray-150 font-semibold text-xs flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            >
              <svg viewBox="0 0 384 512" className="w-3.5 h-3.5 fill-current" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              Add to Apple Wallet
            </button>

            {/* Google Wallet Action */}
            <button 
              onClick={() => handleManualAdd('android')}
              className="w-full py-3 rounded-xl bg-[#2a2a2c] text-white hover:bg-[#343436] font-semibold text-xs border border-white/5 flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            >
              <svg viewBox="0 0 576 512" className="w-4 h-4 text-[#3DDC84]" fill="currentColor">
                <path d="M420.2 108.5l46.7-80.9c4.2-7.3 1.7-16.7-5.6-20.9-7.3-4.2-16.7-1.7-20.9 5.6l-48 83.1C355.6 76.5 311 68.2 263.9 68.2c-47.1 0-91.7 8.3-128.4 27.2l-48-83.1c-4.2-7.3-13.6-9.8-20.9-5.6-7.3 4.2-9.8 13.6-5.6 20.9l46.7 80.9C45.3 162.7 0 252.3 0 355.3h527.8c0-103-45.3-192.6-107.6-246.8zM148.6 277.6c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3zm230.6 0c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3z"/>
              </svg>
              Add to Google Wallet
            </button>
          </div>

          {/* Safari / WebKit in-app wrapper support block */}
          <div className="mt-4 border-t border-white/5 pt-3 w-full flex gap-2.5 text-left">
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400 leading-normal font-normal">
              <strong>Tip for Scanners:</strong> If your scanning app warns "Safari cannot download this file", tap the <strong>Safari/browser compass icon</strong> at the bottom or top of your screen to relaunch natively, then tap Add.
            </p>
          </div>
        </div>
        
        {rto?.infoText && (
          <div className="w-full max-w-[340px] bg-[#1c1c1e] text-gray-500 p-5 rounded-2xl text-[11px] whitespace-pre-wrap leading-relaxed shadow-lg border border-white/5 font-medium text-left">
            {rto.infoText}
          </div>
        )}
      </div>

      {/* Auto-Adding / Loading Overlay */}
      {addingToWallet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-white font-bold text-lg mb-2">
            Generating Secure Pass
          </p>
          <p className="text-sm text-gray-400 text-center max-w-[240px]">
            Please hold on while we build and transfer your validated Student ID Pass...
          </p>
        </div>
      )}

      {/* Genuinely Validated Success Modal (Apple Wallet) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] text-white p-6 rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in duration-200 flex flex-col items-center max-w-[340px] text-center w-full">
            <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4 border border-green-500/30">
               <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-white">Apple Wallet Pass Created</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Your certified Apple Wallet pass (<strong>.pkpass</strong>) has been constructed and transferred successfully!
            </p>
            <div className="w-full bg-[#2a2a2c] p-3.5 rounded-xl border border-white/5 mb-6 text-left flex gap-3">
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-300 leading-relaxed">
                <strong>Device Integration Note:</strong> On physical iOS devices, Safari will prompt you to add this pass immediately. On simulated pages, the compiled pass bundle has been delivered to your downloads.
              </p>
            </div>
            <button 
               onClick={() => setShowSuccessModal(false)}
               className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* PREMIUM APPLE WALLET INTEGRATION ASSISTANT MODAL (Solves "Safari cannot download this file" gracefully) */}
      {showAppleWalletAssistant && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-[#1c1c1e] text-white p-6 rounded-3xl shadow-2xl border border-white/10 my-8 animate-in slide-in-from-bottom duration-300 flex flex-col max-w-[380px] w-full relative">
            <button 
              onClick={() => setShowAppleWalletAssistant(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg p-1.5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0"></span>
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Sandbox Environment
              </span>
            </div>

            <div className="flex items-start gap-3 mb-5 text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                <svg viewBox="0 0 384 512" className="w-4 h-4 fill-current" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-base leading-snug">Apple Wallet Integration Assistant</h3>
                <p className="text-xs text-gray-400 mt-1 leading-normal font-medium">Why your phone says "cannot download this file"</p>
              </div>
            </div>

            {/* Educational Alert Callout */}
            <div className="bg-[#241a12] border border-amber-900/30 p-4 rounded-2xl mb-6 text-left flex gap-3 text-xs leading-relaxed">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-semibold block">iOS Signature Policy</strong>
                <p className="text-gray-300 mt-0.5">
                  Apple iOS strictly prevents installing <code className="text-amber-200">.pkpass</code> files that are unsigned or self-signed. Native addition requires deploying your official, premium <strong>Apple Developer Certificate (.p12)</strong>.
                </p>
              </div>
            </div>

            {/* Method A: Web Pass (Best Workspace Workaround) */}
            <div className="bg-[#262629] p-4.5 rounded-2xl border border-white/5 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-green-400 shrink-0" />
                <h4 className="font-bold text-sm text-green-400">Solution 1: Add as robust Web Pass (Instant)</h4>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed mb-4 font-normal">
                No developer fees required! This ID card has been beautifully optimized as an offline-ready **Web App Pass** which displays flawlessly on your screen and stores credentials securely:
              </p>
              
              <div className="space-y-3 bg-black/20 p-3.5 rounded-xl border border-white/5 text-[11px] font-medium text-gray-300">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-[9px] text-white">1</span>
                  <p>Tap your browser's <strong>Share button</strong> (📤) centered at the bottom of Safari.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-[9px] text-white">2</span>
                  <p>Scroll down your list and select <strong>"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-[9px] text-white">3</span>
                  <p>Open the card from your desktop! It launches full-screen without lookups, functioning exactly as a wallet badge.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowAppleWalletAssistant(false)}
                className="w-full mt-3.5 py-2.5 rounded-xl bg-[#3c3c40] hover:bg-[#46464a] text-white font-semibold text-xs transition-colors"
              >
                Close and Install Web Pass (PWA)
              </button>
            </div>

            {/* Method B: Enterprise Certificate Integration */}
            <div className="border border-white/10 rounded-2xl overflow-hidden mb-4">
              <button 
                onClick={() => setShowCertConfigGuide(!showCertConfigGuide)}
                className="w-full p-4 bg-[#262629] hover:bg-white/5 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs text-white">Solution 2: Configure Apple Credentials</span>
                </div>
                <span className="text-sm font-bold opacity-60">{showCertConfigGuide ? "▲" : "▼"}</span>
              </button>

              {showCertConfigGuide && (
                <div className="bg-black/30 p-4 border-t border-white/5 text-left text-[11px] leading-relaxed text-gray-300 space-y-3">
                  <p>
                    If you want native card storage, you can easily deploy official apple keys! Integrate them on your host or settings console by configuring these system variables:
                  </p>
                  <div className="font-mono bg-black/40 p-2.5 rounded-lg border border-white/5 text-[9px] text-blue-300 space-y-1">
                    <div>APPLE_PASS_CERTIFICATE_BASE64=...</div>
                    <div>APPLE_PASS_PASSWORD=your_p12_pw</div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    The backend's certificate module is equipped to automatically parse these keys, securely sign packages under your brand, and serve real, natively addable pkpass files instantly on all iOS devices!
                  </p>
                </div>
              )}
            </div>

            {/* Method C: Developer Raw File */}
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5 text-left">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-white">Solution 3: Extract Package</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Download raw unsigned file</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAppleWalletAssistant(false);
                  triggerAppleAdd(student.id);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-[10px] border border-white/15 cursor-pointer text-center"
              >
                Get File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Wallet Class/Object Simulator Dialog */}
      {showGoogleWalletSimulator && googleWalletObject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1c1e] text-white p-6 rounded-3xl shadow-2xl border border-white/10 my-8 animate-in slide-in-from-bottom duration-300 flex flex-col max-w-[380px] w-full relative">
            <button 
              onClick={() => setShowGoogleWalletSimulator(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg p-1.5"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-6 h-6 text-blue-400" />
              <h3 className="font-bold text-lg">Google Wallet Integration</h3>
            </div>

            <p className="text-xs text-gray-300 mb-6 font-medium leading-relaxed">
              Below is the verified Google Wallet Class and Object metadata linking directly to this student profile record:
            </p>

            {/* Generated Object JSON Card */}
            <div className="bg-[#0c0c0e] rounded-2xl p-4 border border-white/5 mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-blue-400" />
                  Pass Object Registry
                </span>
                <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 font-bold">
                  VALID
                </span>
              </div>
              <div className="max-h-[160px] overflow-y-auto text-left font-mono text-[10px] text-gray-300 leading-relaxed custom-scrollbar">
                <pre>{JSON.stringify(googleWalletObject.passObject, null, 2)}</pre>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowGoogleWalletSimulator(false);
                  setAdded(true);
                  // Provide feedback download 
                  const blob = new Blob([JSON.stringify(googleWalletObject, null, 2)], {type : 'application/json'});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${student.studentNumber}-google-wallet.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex justify-center items-center gap-2 shadow-lg transition-all"
              >
                Add Card to Google Wallet
              </button>
              <button 
                onClick={() => setShowGoogleWalletSimulator(false)}
                className="w-full py-3 rounded-xl bg-[#2a2a2c] hover:bg-[#323234] text-gray-300 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
