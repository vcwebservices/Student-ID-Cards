import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student } from '../types';
import { StudentCard } from '../components/StudentCard';
import { RTOS } from '../lib/rtoConfig';

export function PassView() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [added, setAdded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [osDetected, setOsDetected] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [autoAdding, setAutoAdding] = useState(false);
  const [showSimulatedSuccess, setShowSimulatedSuccess] = useState(false);

  useEffect(() => {
    // Check OS
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);

    if (isIOS) setOsDetected('ios');
    else if (isAndroid) setOsDetected('android');
    else setOsDetected('desktop');

    // Auto-trigger flow for mobile
    if (isIOS || isAndroid) {
      setAutoAdding(true);
      const timer = setTimeout(() => {
        setAutoAdding(false);
        setAdded(true);
        setShowSimulatedSuccess(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setShowPrompt(true); // Show manual prompt for desktop
    }
  }, []);

  useEffect(() => {
    async function loadStudent() {
      if (!studentId) return;
      try {
        const docRef = doc(db, 'students', studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudent({ id: docSnap.id, ...docSnap.data() } as Student);
        } else {
          setError('Student pass not found.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Error loading student pass.');
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [studentId]);

  const handleAdd = (os: 'ios' | 'android') => {
    setAutoAdding(true);
    setShowPrompt(false);
    setTimeout(() => {
      setAutoAdding(false);
      setAdded(true);
      setShowSimulatedSuccess(true);
      setOsDetected(os);
    }, 1500);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading pass...</div>;
  }

  if (error || !student) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">{error || 'Not found'}</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center pt-8 pb-12 px-4 selection:bg-white/30 relative overflow-hidden">
      <div className="w-full max-w-[340px] flex justify-between items-center mb-6 text-white z-10">
        <button onClick={() => window.close()} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
          ✕
        </button>
        <span className="font-semibold text-sm tracking-wide mix-blend-screen">{student.rtoId.replace('rto_','').toUpperCase()} Student ID Card</span>
        <button 
          onClick={() => handleAdd('ios')}
          className="px-4 py-1.5 rounded-full bg-blue-400 text-black font-semibold text-sm transition-colors active:bg-blue-500">
          {added ? 'Added' : 'Add'}
        </button>
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-6">
        <StudentCard student={student} isViewMode={true} />
        
        {RTOS.find(r => r.id === student.rtoId)?.infoText && (
          <div className="w-full max-w-[340px] bg-[#1c1c1e] text-gray-300 p-6 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-lg border border-white/5">
            {RTOS.find(r => r.id === student.rtoId)?.infoText}
          </div>
        )}
      </div>

      {/* Auto Adding Overlay */}
      {autoAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium text-lg">
            Opening {osDetected === 'ios' ? 'Apple Wallet' : osDetected === 'android' ? 'Google Wallet' : 'Wallet'}...
          </p>
        </div>
      )}

      {/* Simulated Success Message */}
      {showSimulatedSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-[#1c1c1e] text-white px-6 py-4 rounded-2xl shadow-2xl z-[70] border border-white/10 animate-in slide-in-from-top flex flex-col items-center max-w-[340px] text-center w-full mt-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
             <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
             </svg>
          </div>
          <h3 className="font-semibold text-lg mb-1">Pass Added</h3>
          <p className="text-sm text-gray-400">
            [AI Studio Simulated Save]<br/>
            In production, {osDetected === 'ios' ? 'a .pkpass file would be downloaded.' : osDetected === 'android' ? 'you would be redirected to the Google Wallet save link.' : 'the appropriate wallet link would be opened.'}
          </p>
          <button 
             onClick={() => setShowSimulatedSuccess(false)}
             className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mock Add to Wallet Prompt */}
      {showPrompt && !added && !autoAdding && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 z-50 animate-in slide-in-from-bottom flex flex-col items-center shadow-2xl">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-6"></div>
          <h3 className="text-white font-semibold text-xl mb-2 text-center">Add to Wallet</h3>
          <p className="text-gray-400 text-sm text-center mb-6">
            Keep your student ID card handy by adding it to your mobile wallet.
          </p>
          <div className="w-full max-w-sm flex flex-col gap-3">
            <button 
              onClick={() => handleAdd('ios')}
              className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-base flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <svg viewBox="0 0 384 512" className="w-[18px] h-[18px]" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              Add to Apple Wallet
            </button>
            <button 
              onClick={() => handleAdd('android')}
              className="w-full py-3.5 rounded-xl bg-[#2a2a2c] text-white font-semibold text-base border border-white/5 flex justify-center items-center gap-2 hover:bg-[#3a3a3c] transition-colors"
            >
              <svg viewBox="0 0 576 512" className="w-5 h-5 text-[#3DDC84]" fill="currentColor">
                <path d="M420.2 108.5l46.7-80.9c4.2-7.3 1.7-16.7-5.6-20.9-7.3-4.2-16.7-1.7-20.9 5.6l-48 83.1C355.6 76.5 311 68.2 263.9 68.2c-47.1 0-91.7 8.3-128.4 27.2l-48-83.1c-4.2-7.3-13.6-9.8-20.9-5.6-7.3 4.2-9.8 13.6-5.6 20.9l46.7 80.9C45.3 162.7 0 252.3 0 355.3h527.8c0-103-45.3-192.6-107.6-246.8zM148.6 277.6c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3zm230.6 0c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3z"/>
              </svg>
              Add to Google Wallet
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="mt-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
