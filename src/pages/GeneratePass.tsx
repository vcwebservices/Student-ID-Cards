import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { RTOS, RTOConfig } from "../lib/rtoConfig";
import { ImageCropper } from "../components/ImageCropper";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Eye,
  Clipboard,
  Lock,
  EyeOff,
} from "lucide-react";
import { Link } from "react-router-dom";

import QRCode from "react-qr-code";

export function GeneratePass() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRto, setSelectedRto] = useState<RTOConfig | null>(null);

  // Passcode state
  const [enteredPasscode, setEnteredPasscode] = useState("");

  // Form state
  const [studentNumber, setStudentNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [campus, setCampus] = useState("");
  const [commencedDate, setCommencedDate] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [photoData, setPhotoData] = useState("");

  const [saving, setSaving] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [walletType, setWalletType] = useState<'apple' | 'android'>('apple');

  const handleCopyPasscode = () => {
    if (selectedRto?.passcode) {
      navigator.clipboard.writeText(selectedRto.passcode);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 3000);
    }
  };

  const handleRtoSelect = (rtoId: string) => {
    const rto = RTOS.find((r) => r.id === rtoId);
    if (rto) {
      setSelectedRto(rto);
      setEnteredPasscode("");

      if (rto.id === "aibt") {
        setShowPassword(true);
      } else {
        setShowPassword(false);
      }

      setStep(2);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRto?.passcode && enteredPasscode !== selectedRto.passcode) {
      // If there's an alternative passcode for Pivot Education, allow it as well
      if (selectedRto.id === "pivot" && enteredPasscode === "H8H0NR7HPZ") {
        // allow
      } else {
        alert("Invalid passcode for " + selectedRto.shortName);
        return;
      }
    }
    if (enteredPasscode.length > 0) {
      setStep(4);
    } else {
      alert("Please enter a passcode");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset value to allow uploading the same file again
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRto) return;
    setSaving(true);
    try {
      const studentData = {
        rtoId: selectedRto.id,
        studentNumber,
        firstName,
        lastName: lastName || "N/A", // If you only have one name field, maybe combine them?
        email,
        status: "Full Time Student",
        campus,
        commencedDate,
        dob,
        photoData,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "students"), studentData);
      setGeneratedId(docRef.id);

      // Send the email notification
      try {
        const baseUrl = window.location.origin.replace('ais-dev', 'ais-pre');
        const passUrl = `${baseUrl}/pass/${docRef.id}`;
        await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            studentName: `${firstName} ${lastName || ""}`.trim(),
            studentEmail: email,
            rtoName: selectedRto.name,
            rtoDomain: selectedRto.domain,
            passUrl
          })
        });
      } catch (err) {
        console.error("Failed to send email notification", err);
      }
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to create pass. See console.");
      setSaving(false); // only set false on error to let success screen show without flicker
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedRto(null);
    setEnteredPasscode("");
    setStudentNumber("");
    setFirstName("");
    setLastName("");
    setCampus("");
    setCommencedDate("");
    setDob("");
    setEmail("");
    setPhotoData("");
    setGeneratedId(null);
    setSaving(false);
  };

  if (generatedId && selectedRto) {
    // If we are in the AI Studio dev environment, try to use the pre (shared) environment URL for the QR code
    // so it has a better chance of being accessible if the user shares the app.
    const baseUrl = window.location.origin.replace('ais-dev', 'ais-pre');
    const passUrl = `${baseUrl}/pass/${generatedId}`;

    return (
      <div className="w-full min-h-screen bg-[#1F1F1F] font-sans flex flex-col">
        {/* Header */}
        <div className="w-full flex justify-between items-center px-6 md:px-12 py-8 max-w-5xl mx-auto">
          <h1 className="text-white text-[22px] font-bold tracking-wide">
            {selectedRto.shortName} Student ID
          </h1>
          <div className="flex gap-4 items-center">
            {/* Apple Icon */}
            <button 
              onClick={() => setWalletType('apple')} 
              className={`pb-1 border-b-2 transition-colors ${walletType === 'apple' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <svg viewBox="0 0 384 512" className="w-[22px] h-[22px] fill-current" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
            </button>
            {/* Android Icon */}
            <button 
              onClick={() => setWalletType('android')} 
              className={`pb-1 border-b-2 transition-colors ${walletType === 'android' ? 'border-[#3DDC84] text-[#3DDC84]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <svg viewBox="0 0 576 512" className="w-6 h-6 fill-current" fill="currentColor">
                <path d="M420.2 108.5l46.7-80.9c4.2-7.3 1.7-16.7-5.6-20.9-7.3-4.2-16.7-1.7-20.9 5.6l-48 83.1C355.6 76.5 311 68.2 263.9 68.2c-47.1 0-91.7 8.3-128.4 27.2l-48-83.1c-4.2-7.3-13.6-9.8-20.9-5.6-7.3 4.2-9.8 13.6-5.6 20.9l46.7 80.9C45.3 162.7 0 252.3 0 355.3h527.8c0-103-45.3-192.6-107.6-246.8zM148.6 277.6c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3zm230.6 0c-16.7 0-30.3-13.6-30.3-30.3 0-16.7 13.6-30.3 30.3-30.3 16.7 0 30.3 13.6 30.3 30.3 0 16.7-13.6 30.3-30.3 30.3z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 pb-20">
          {/* Mock Pass */}
          <div 
            className={`w-full max-w-[600px] rounded-[10px] shadow-sm flex items-center justify-between px-6 mb-12 border border-white/5 ${walletType === 'apple' ? 'h-[75px]' : 'h-[140px] flex-col justify-center gap-4'}`}
            style={{ 
              backgroundColor: ['reach', 'brooklyn', 'hj'].includes(selectedRto.id) ? '#ffffff' :
                  selectedRto.id === 'avta' ? '#000000' :
                  selectedRto.id === 'aibt_i' ? '#0a1128' :
                  selectedRto.primaryColor 
            }}
          >
            {walletType === 'apple' ? (
              <>
                {selectedRto.logoUrl ? (
                  <img
                    src={selectedRto.logoUrl}
                    alt={`${selectedRto.shortName} Logo`}
                    className="h-10 object-contain max-w-[150px]"
                  />
                ) : (
                  <BookOpen className="w-8 h-8 text-white" />
                )}
                <span className="text-white text-[15px] font-medium tracking-wide" style={{ color: ['reach', 'brooklyn', 'hj'].includes(selectedRto.id) ? '#000000' : '#ffffff' }}>
                  {firstName} {lastName !== 'N/A' ? lastName : ''}
                </span>
              </>
            ) : (
              <>
                {selectedRto.logoUrl ? (
                  <img
                    src={selectedRto.logoUrl}
                    alt={`${selectedRto.shortName} Logo`}
                    className="h-12 object-contain max-w-[200px]"
                  />
                ) : (
                  <BookOpen className="w-10 h-10 text-white" />
                )}
                <span className="text-white text-[15px] font-medium tracking-wide" style={{ color: ['reach', 'brooklyn', 'hj'].includes(selectedRto.id) ? '#000000' : '#ffffff' }}>
                  {firstName} {lastName !== 'N/A' ? lastName : ''}
                </span>
              </>
            )}
          </div>

          <p className="text-white text-[16px] mb-4 text-center px-4 font-medium tracking-wide">
            {walletType === 'apple' 
              ? "This pass needs to be added to the Wallet app on your iPhone" 
              : "This pass needs to be added to the Google Wallet app on your phone"}
          </p>
          <p className="text-white text-[16px] mb-12 text-center max-w-[500px] px-4 font-medium tracking-wide">
            {walletType === 'apple'
              ? "Please ensure you use your mobile camera (no third-party apps) to scan the QR code"
              : "Click the 'Add to Google Wallet' button below and follow the instructions"}
          </p>

          {walletType === 'apple' ? (
            <div className="flex flex-col items-center gap-4">
              <a href={passUrl} target="_blank" rel="noreferrer" className="bg-white p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] block hover:scale-105 transition-transform cursor-pointer">
                <QRCode value={passUrl} size={200} />
              </a>
              <a href={passUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors underline text-sm break-all max-w-[300px] text-center">
                Can't scan? Click here to open pass
              </a>
              {window.location.hostname.includes('run.app') && (
                <div className="mt-2 text-xs text-amber-400 bg-amber-400/10 p-4 rounded-lg max-w-[320px] text-center border border-amber-400/20">
                  <strong>Access Warning:</strong> Your app is currently running in a private workspace. To allow anyone to scan this code without a Google login, you must <strong>deploy</strong> the app (e.g. to Firebase Hosting via the settings menu).
                </div>
              )}
            </div>
          ) : (
            <a 
              href={passUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-3 bg-[#1f1f1f] border border-gray-700 text-white hover:bg-[#2f2f2f] transition-colors rounded-full px-6 py-2.5 shadow-md active:scale-95"
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M19.5 5.5H4.5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2Zm0 11H4.5v-9h15v9Z" fill="#fff"/>
                <path d="M5.5 8h4c.3 0 .5-.2.5-.5S9.8 7 9.5 7h-4c-.3 0-.5.2-.5.5S5.2 8 5.5 8Zm0 3h7c.3 0 .5-.2.5-.5S12.8 10 12.5 10h-7c-.3 0-.5.2-.5.5s.2.5.5.5Zm0 3h7c.3 0 .5-.2.5-.5S12.8 13 12.5 13h-7c-.3 0-.5.2-.5.5s.2.5.5.5Zm10-3h3c.3 0 .5-.2.5-.5S18.8 10 18.5 10h-3c-.3 0-.5.2-.5.5s.2.5.5.5Z" fill="#ffc107"/>
                <path d="M15.5 14h3c.3 0 .5-.2.5-.5S18.8 13 18.5 13h-3c-.3 0-.5.2-.5.5s.2.5.5.5Z" fill="#4285f4"/>
                <path d="M15.5 8h3c.3 0 .5-.2.5-.5S18.8 7 18.5 7h-3c-.3 0-.5.2-.5.5S15.2 8 15.5 8Z" fill="#ea4335"/>
              </svg>
              Add to Google Wallet
            </a>
          )}


        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8f9fa] flex flex-col items-center font-sans pb-12">
      {/* Header */}
      <div className="w-full bg-[#042d30] text-white pt-10 pb-16 flex flex-col items-center px-4 text-center">
        <a href="https://myvc.com.au/student-support/" className="flex items-center gap-2 bg-[#0a484d] hover:bg-[#0c595f] border border-[#136166] px-4 py-1.5 rounded-full text-sm font-medium mb-6 transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Return to Student Support
        </a>

        <h1 className="text-4xl font-bold mb-3 tracking-tight">
          Student Digital ID Card
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto">
          Cards can be installed on the students iPhone or Android device
        </p>
      </div>

      <div className="w-full max-w-[800px] px-4 mt-8 flex-1 flex flex-col">
        {/* Step 1 */}
        {step === 1 && (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[480px]">
              {/* Dropdown */}
              <div className="mb-6 relative">
                <label className="block text-sm text-[#0a2336] font-bold mb-2">
                  Select College:
                </label>
                <div
                  className="bg-white border border-gray-300 rounded p-1 shadow-sm cursor-pointer"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="w-full bg-transparent p-2 text-gray-800 font-medium flex items-center justify-between">
                    {selectedRto ? (
                      <div className="flex items-center gap-3">
                        {selectedRto.logoUrl && (
                          <img
                            src={selectedRto.logoUrl}
                            alt=""
                            className="h-6 w-12 object-contain"
                          />
                        )}
                        <span className="text-lg">{selectedRto.shortName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        -- Please choose an option --
                      </span>
                    )}
                    <div className="text-gray-500">
                      <svg
                        className={`fill-current h-4 w-4 transform transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Custom Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                    {RTOS.map((rto) => (
                      <div
                        key={rto.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-3 transition-colors"
                        onClick={() => {
                          handleRtoSelect(rto.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {rto.logoUrl ? (
                          <img
                            src={rto.logoUrl}
                            alt=""
                            className="h-8 w-16 object-contain"
                          />
                        ) : (
                          <div className="h-8 w-16 flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                            No Logo
                          </div>
                        )}
                        <span className="text-lg font-medium text-gray-800">
                          {rto.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Show Passcode & Create Button */}
        {selectedRto && step === 2 && (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[500px]">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center text-sm font-bold text-[#042d30] mb-6 hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to College
                Selection
              </button>

              <div className="bg-white p-8 rounded-[20px] shadow-sm mb-6 flex flex-col items-center">
                <div className="flex items-center justify-center mb-6">
                  {selectedRto.logoUrl ? (
                    <img
                      src={selectedRto.logoUrl}
                      alt={`${selectedRto.shortName} Logo`}
                      className="h-[90px] object-contain w-auto max-w-[300px]"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[#142940]">
                      <BookOpen
                        className="w-12 h-12"
                        style={{ color: selectedRto.primaryColor }}
                      />
                      <span className="text-[28px] font-bold tracking-tight">
                        {selectedRto.shortName}
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold text-[#042d30] mb-8">
                  Student ID Card
                </h2>

                <div className="w-full">
                  <label className="block text-sm font-bold text-[#324b5d] mb-2">
                    Passcode
                  </label>
                  <div className="relative mb-8">
                    <input
                      type={showPassword ? "text" : "password"}
                      readOnly
                      value={selectedRto.passcode || ""}
                      className="w-full border border-gray-300 rounded p-3 pr-20 text-gray-800 font-medium bg-gray-50 focus:outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-gray-500">
                      {showPassword ? (
                        <EyeOff
                          className="w-5 h-5 cursor-pointer hover:text-gray-700"
                          onClick={() => setShowPassword(false)}
                        />
                      ) : (
                        <Eye
                          className="w-5 h-5 cursor-pointer hover:text-gray-700"
                          onClick={() => setShowPassword(true)}
                        />
                      )}
                      <Clipboard
                        className="w-5 h-5 cursor-pointer hover:text-gray-700"
                        onClick={handleCopyPasscode}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    className="w-full bg-[#042123] hover:bg-[#073639] text-[#eab308] font-bold py-4 rounded-lg flex justify-center items-center gap-2 transition-colors"
                  >
                    Create New ID Card <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-[#feeeec] border border-[#f5d9d7] rounded-[20px] p-6">
                <h3 className="font-bold text-[#042123] mb-3 flex items-center gap-2">
                  <Lock className="w-[18px] h-[18px]" fill="currentColor" />
                  Security Information
                </h3>
                <p className="text-sm text-[#042123] leading-relaxed">
                  For security purposes, a passcode is required to access the
                  form and generate a new digital ID. Please note that passcodes
                  may change at any time; ensure you view and copy the passcode
                  before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Enter Passcode */}
        {selectedRto && step === 3 && (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[500px]">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center text-sm font-bold text-[#042d30] mb-6 hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Passcode
              </button>
              <div className="bg-white pt-10 pb-12 px-8 flex flex-col items-center shadow-sm">
                <div className="mb-8">
                  {selectedRto.logoUrl ? (
                    <img
                      src={selectedRto.logoUrl}
                      alt={`${selectedRto.shortName} Logo`}
                      className="h-[90px] object-contain w-auto max-w-[300px]"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[#142940]">
                      <BookOpen
                        className="w-12 h-12"
                        style={{ color: selectedRto.primaryColor }}
                      />
                      <span className="text-3xl font-bold tracking-tight">
                        {selectedRto.shortName}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-center text-[#4a4a4a] text-[17px] font-light mb-10 max-w-[360px] leading-relaxed font-sans">
                  This page requires a passcode to continue. Any issues, please
                  email{" "}
                  <a
                    href="mailto:webservices@vconsultancy.com.au"
                    className="text-gray-600 hover:underline"
                  >
                    webservices@vconsultancy.com.au
                  </a>
                </p>

                <form
                  className="w-full flex flex-col items-center"
                  onSubmit={handlePasscodeSubmit}
                >
                  <div className="w-full max-w-[360px] mb-6">
                    <label className="block text-[15px] text-[#4a4a4a] font-light mb-2">
                      Enter Passcode
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={enteredPasscode}
                        onChange={(e) => setEnteredPasscode(e.target.value)}
                        className="w-full border border-gray-300 rounded-[4px] p-2.5 text-gray-800 focus:outline-none focus:border-gray-400 font-sans"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                        {showPassword ? (
                          <EyeOff
                            className="w-4 h-4 cursor-pointer hover:text-gray-600"
                            onClick={() => setShowPassword(false)}
                          />
                        ) : (
                          <Eye
                            className="w-4 h-4 cursor-pointer hover:text-gray-600"
                            onClick={() => setShowPassword(true)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full max-w-[360px] bg-[#75bf69] hover:bg-[#65aa5a] text-white text-[15px] py-3 rounded-[4px] tracking-wide transition-colors"
                  >
                    CONTINUE
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: ID Card Generator */}
        {step === 4 && selectedRto && (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[800px]">
              {/* Return Button */}
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center text-sm font-bold text-[#042d30] mb-6 hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Passcode Entry
              </button>

              <div className="bg-white shadow-sm rounded border border-gray-200">
                {/* RTO Header */}
                <div
                  className="p-6 flex items-center justify-center flex-col min-h-[140px]"
                  style={{
                    backgroundColor: ['reach', 'brooklyn', 'hj'].includes(selectedRto.id) ? '#ffffff' :
                      selectedRto.id === 'avta' ? '#000000' :
                      selectedRto.id === 'aibt_i' ? '#0a1128' :
                      selectedRto.primaryColor
                  }}
                >
                  {selectedRto.logoUrl ? (
                    <img
                      src={selectedRto.logoUrl}
                      alt={`${selectedRto.shortName} Logo`}
                      className={['reach'].includes(selectedRto.id) ? "h-[110px] object-contain max-w-[320px]" : "h-[90px] object-contain max-w-[280px]"}
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                <div className="p-8 pb-12 flex flex-col px-10">
                  <div className="text-center mb-8 flex flex-col items-center">
                    <h2 className="text-[22px] text-[#4a4a4a] font-light mb-1">
                      {selectedRto.id === 'reach' ? `Generate Digital Student ID Card for Reach` :
                       ['avta', 'npa', 'pivot', 'brooklyn', 'hj'].includes(selectedRto.id) ? `${selectedRto.shortName} Digital Student ID Card` :
                       `Generate an ${selectedRto.shortName} Digital Student ID Card`}
                    </h2>
                    {['avta', 'npa', 'pivot', 'brooklyn', 'hj'].includes(selectedRto.id) && (
                      <p className="text-[15px] font-light text-[#5a5a5a] mt-1">
                        Fill out the student information below to issue a digital ID card
                      </p>
                    )}
                  </div>

                  <div className="w-full">
                    <form onSubmit={handleCreate}>
                      
                      {/* --- Image Upload Field --- */}
                      {(() => {
                        const renderImageUploadBlock = (required = false) => (
                          <div className={['aibt'].includes(selectedRto.id) ? "mb-8" : "mb-6"}>
                            <div className="w-full border shadow-sm border-dashed border-gray-300 bg-white rounded py-8 px-4 flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              {photoData ? (
                                <div className="flex flex-col items-center">
                                  <img src={photoData} alt="Preview" className="h-28 w-28 object-cover rounded shadow-sm mb-3 border border-gray-200" />
                                  <span className="text-[14px] text-[#4a4a4a] z-20 hover:text-gray-900 pointer-events-none cursor-pointer">Change Image</span>
                                </div>
                              ) : (
                                <div className="text-center flex flex-col items-center">
                                  <p className="text-[15px] text-[#4a4a4a] mb-1 font-light">
                                    Upload Profile Image {required ? '*' : ''}
                                  </p>
                                  <p className="text-[13px] text-gray-500 font-light mt-1 max-w-[400px]">
                                    Please select your profile image. Square photos are best; minimum resolution is 480x480px.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );

                        const renderEmailBlock = () => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px]" />
                            {selectedRto.id === 'reach' && <p className="text-[13px] text-[#8a8a8a] mt-1.5 font-light">Enter the students email address</p>}
                          </div>
                        );

                        const renderStudentNumberBlock = (required = false, label = "Student Number") => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">{label} {required && '*'}</label>
                            <input type="text" required={required} value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px]" />
                          </div>
                        );

                        const renderStudentNameBlock = (required = false) => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">Student Name{required ? ' *' : ''}</label>
                            <input type="text" required={required} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px]" placeholder={selectedRto.id === 'aibt' ? "e.g. Deepanshu Gupta" : ""} />
                          </div>
                        );

                        const renderCampusBlock = (required = false, label = "Campus Location", placeholder = "") => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">{label} {required && '*'}</label>
                            <input type="text" required={required} value={campus} onChange={(e) => setCampus(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px]" placeholder={placeholder} />
                          </div>
                        );

                        const renderDobBlock = (required = false) => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">DOB {required && '*'}</label>
                            <div className="relative">
                              <input type="date" required={required} value={dob} onChange={(e) => setDob(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px] text-[#4a4a4a]" />
                            </div>
                          </div>
                        );

                        const renderCommencedBlock = (label = "Commenced Date", subtitle = "") => (
                          <div className="mb-5">
                            <label className="block text-[15px] text-[#4a4a4a] mb-1.5 font-light">{label}</label>
                            <div className="relative">
                              <input type="date" value={commencedDate} onChange={(e) => setCommencedDate(e.target.value)} className="w-full border border-gray-300 rounded-[3px] p-2 focus:outline-none focus:border-gray-400 font-sans font-light text-[15px] text-[#4a4a4a]" />
                            </div>
                            {subtitle && <p className="text-[13px] text-[#8a8a8a] mt-1.5 font-light">{subtitle}</p>}
                          </div>
                        );

                        // Layout conditional rendering
                        switch(selectedRto.id) {
                          case 'aibt':
                            return (
                              <>
                                {renderImageUploadBlock()}
                                {renderStudentNameBlock(true)}
                                {renderStudentNumberBlock(true, "Student ID")}
                                {renderDobBlock(true)}
                                {renderEmailBlock()}
                                {renderCampusBlock(true, "Campus")}
                                {renderCommencedBlock()}
                              </>
                            );
                          case 'aibt_i':
                            return (
                              <>
                                {renderStudentNameBlock(true)}
                                {renderImageUploadBlock()}
                                {renderStudentNumberBlock(true, "Student ID")}
                                {renderDobBlock(true)}
                                {renderCampusBlock(true, "Campus")}
                                {renderCommencedBlock()}
                              </>
                            );
                          case 'reach':
                            return (
                              <>
                                {renderStudentNameBlock(false)}
                                {renderDobBlock(true)}
                                {renderImageUploadBlock(true)}
                                {renderEmailBlock()}
                                {renderCommencedBlock("Issued", "Put today's date")}
                                {renderCampusBlock(false, "Campus Location", "e.g. Hobart")}
                                {renderStudentNumberBlock(true, "Student Number")}
                              </>
                            );
                          case 'avta':
                          case 'npa':
                          case 'pivot':
                          case 'brooklyn':
                          case 'hj':
                          default:
                            return (
                              <>
                                {renderEmailBlock()}
                                {renderStudentNumberBlock(false, "Student Number")}
                                {renderStudentNameBlock(false)}
                                {renderCampusBlock(false, "Campus Location")}
                                {renderDobBlock(false)}
                                {renderImageUploadBlock(true)}
                                <div className="mt-8 mb-6 text-[14px] text-[#4a4a4a] font-light">
                                  For support, please email <a href="mailto:webservices@vconsultancy.com.au" className="hover:underline">webservices@vconsultancy.com.au</a>
                                </div>
                              </>
                            );
                        }
                      })()}

                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3.5 rounded-[4px] mt-2 mb-2 text-white font-medium text-[15px] tracking-wide active:scale-[0.99] transition-transform disabled:opacity-50 uppercase shadow-sm"
                        style={{
                          backgroundColor:
                            selectedRto.id === 'npa' ? '#000000' :
                            selectedRto.id === 'avta' ? '#4ade80' :
                            selectedRto.id === 'reach' ? '#eab308' :
                            selectedRto.id === 'aibt_i' ? '#0a1128' :
                            selectedRto.id === 'brooklyn' ? '#1e293b' :
                            selectedRto.id === 'hj' ? '#162c53' :
                            selectedRto.primaryColor,
                          color: selectedRto.id === 'reach' ? '#000' : '#fff'
                        }}
                      >
                        {saving ? "PROCESSING..." : 
                          selectedRto.id === 'reach' ? "ISSUE CARD" :
                          selectedRto.id === 'npa' ? "CREATE ID CARD" :
                          ['aibt', 'aibt_i'].includes(selectedRto.id) ? "GENERATE ID LINK" :
                          "ENROL"
                        }
                      </button>
                    </form>
                  </div>
                  
                  {['aibt'].includes(selectedRto.id) && (
                    <div className="mt-8 text-[13px] text-[#8a8a8a] text-center font-light">
                      Powered by <b>PassKit®</b> Clone
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-4 right-4 bg-[#1e293b] text-white px-4 py-3 rounded shadow-lg font-medium text-sm flex items-center z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          Passcode copied to clipboard!
        </div>
      )}

      {/* Image Cropper */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={(croppedUrl) => {
            setPhotoData(croppedUrl);
            setImageToCrop(null);
          }}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
