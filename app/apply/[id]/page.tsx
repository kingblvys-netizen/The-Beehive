"use client";

import React, { useState, useEffect } from 'react';
import { roles, getQuestions } from '../../data'; 
import { notFound, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, ChevronRight, CheckCircle2, ArrowLeft, 
  Lock, Shield, AlertTriangle, Terminal, Send,
  Database, Cpu, Zap, User, Fingerprint
} from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);
  const router = useRouter();

  // --- 1. STATE & IDENTITY ---
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR
  const [transactionId, setTransactionId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [existingApplication, setExistingApplication] = useState<{ id: number; status: string } | null>(null);

  // --- 2. NEURAL LINK: DRAFT AUTO-SAVE ---
  useEffect(() => {
    const draft = localStorage.getItem(`hive_draft_${resolvedParams.id}`);
    if (draft) {
      setFormData(JSON.parse(draft));
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    if (Object.keys(formData).length > 2) { // Only save if they've answered more than identity info
      localStorage.setItem(`hive_draft_${resolvedParams.id}`, JSON.stringify(formData));
    }
  }, [formData, resolvedParams.id]);

  // Identity Sync
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({ 
        ...prev, 
        discord_user: session.user?.name ?? "Unknown", 
        discord_id: (session.user as any)?.id ?? "unknown_id" 
      }));
    }
  }, [session]);

  // --- 3. KEYBOARD NAV ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && isStepComplete) {
        if (currentStep < totalPages - 1) {
          setCurrentStep(s => s + 1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, formData]);

  if (!role) return notFound();

  // --- 4. LOGIC & VALIDATION ---
  const questions = getQuestions(role.id);
  const totalPages = questions.length;
  const q = questions[currentStep];
  
  const progress = ((currentStep + 1) / totalPages) * 100;
  const isStepComplete = formData[q.id] && formData[q.id].trim().length > 3;

  // Data Density Meter
  const getDataDensity = (val: string) => {
    const len = val?.length || 0;
    if (len === 0) return { label: "NO SIGNAL", color: "bg-neutral-800", width: "5%" };
    if (len < 15) return { label: "LOW DENSITY", color: "bg-red-500", width: "25%" };
    if (len < 50) return { label: "STABLE", color: "bg-yellow-500", width: "60%" };
    return { label: "OPTIMAL", color: "bg-green-500", width: "100%" };
  };

  // --- 5. SUBMISSION ---
  const handleSubmit = async () => {
    setSubmissionStatus("SENDING");
    setIsScanning(true);
    
    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: role.id,
          roleTitle: role.title,
          answers: formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Submit failed (${response.status})`);
      }

      const result = await response.json();
      setTransactionId(String(result.id || result.application?.id || Math.random().toString(36).substring(7).toUpperCase()));
      setSubmissionStatus("SUCCESS");
      localStorage.removeItem(`hive_draft_${resolvedParams.id}`);
      setTimeout(() => router.push("/"), 5000);
    } catch (error) {
      setSubmissionStatus("ERROR");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const checkExisting = async () => {
      if (status !== "authenticated" || !role) return;
      try {
        const res = await fetch(`/api/apply?roleId=${encodeURIComponent(role.id)}`, { cache: "no-store" });
        const data = await res.json();
        if (data?.applied) {
          setExistingApplication(data.existing ?? null);
          setSubmissionStatus("LOCKED");
        }
      } catch {
        // no-op
      }
    };
    checkExisting();
  }, [status, role?.id]);

  if (status === "loading") return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Cpu className="text-yellow-400 animate-pulse" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-400 selection:text-black overflow-hidden relative">
      
      {/* BACKGROUND GRID */}
      <div className="fixed inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* HEADER NAV */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <Link href="/" className="flex items-center gap-3 group opacity-60 hover:opacity-100 transition-all">
          <ArrowLeft className="text-neutral-500 group-hover:text-yellow-400 group-hover:-translate-x-1" size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Abort Session</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">Neural Signature</div>
            <div className="text-[10px] font-bold text-yellow-500">{session?.user?.name || "UNVERIFIED"}</div>
          </div>
          <div className="w-10 h-10 rounded-lg border border-white/5 bg-white/5 flex items-center justify-center">
            {session?.user?.image ? (
              <img src={session.user.image} className="rounded-md" alt="User" />
            ) : (
              <Fingerprint className="text-neutral-700" size={20} />
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-32 relative z-20 min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {submissionStatus === "LOCKED" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
                <Lock className="text-yellow-400" size={34} />
              </div>
              <h2 className="text-3xl font-black uppercase mb-2">Already Submitted</h2>
              <p className="text-neutral-500 text-sm max-w-md mx-auto">
                You already submitted this role. An admin must reset/unlock your previous entry before you can apply again.
              </p>
              {existingApplication?.status && (
                <p className="text-[11px] uppercase tracking-widest text-neutral-600 mt-4">
                  Current status: <span className="text-yellow-400">{existingApplication.status}</span>
                </p>
              )}
            </motion.div>
          ) : submissionStatus === "SUCCESS" ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <Zap size={40} className="text-green-500 animate-pulse" />
              </div>
              <h2 className="text-4xl font-black uppercase mb-2 tracking-tighter">Data <span className="text-green-500">Encoded</span></h2>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-8 inline-block">
                <span className="text-neutral-500 text-[10px] uppercase block mb-1">Receipt Hash</span>
                <span className="text-yellow-500 font-bold tracking-widest text-lg">#{transactionId}</span>
              </div>
              <p className="text-neutral-500 mb-8 max-w-sm mx-auto text-sm">Your intel has been archived. Redirecting to hub in 5 seconds...</p>
            </motion.div>
          ) : (
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal size={14} className="text-yellow-500" />
                  <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em]">Node Upload: {currentStep + 1} / {totalPages}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                  {role.title} <span className="text-neutral-800">Protocol</span>
                </h1>
                
                {/* PROGRESS BAR */}
                <div className="mt-8 flex items-center gap-3">
                  <div className="h-1 flex-1 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-yellow-400 shadow-[0_0_15px_#FACC15]" 
                      animate={{ width: `${progress}%` }} 
                      transition={{ type: "spring", stiffness: 40 }} 
                    />
                  </div>
                  <span className="text-[10px] font-black text-neutral-700 uppercase">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* MAIN FORM CARD */}
              <div className="bg-neutral-900/40 border border-white/10 p-8 md:p-12 rounded-[1rem] backdrop-blur-md relative shadow-2xl">
                
                {/* LOGIN LOCKOVERLAY */}
                {!session && (
                  <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center rounded-[1rem] backdrop-blur-xl">
                    <Lock size={48} className="text-red-500 mb-6 animate-pulse" />
                    <h3 className="text-2xl font-black uppercase mb-2 text-white">Neural Link Denied</h3>
                    <p className="text-neutral-500 mb-8 max-w-xs text-xs tracking-widest uppercase">Discord Identity must be verified before proceeding.</p>
                    <button onClick={() => signIn('discord')} className="bg-yellow-400 text-black px-12 py-4 rounded font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all hover:scale-105 active:scale-95">
                      Establish Link
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={q.id} 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-end">
                      <label className="block text-xs font-black uppercase tracking-widest text-neutral-400">
                        {q.label}
                      </label>
                      <span className="text-[8px] font-bold text-neutral-700 uppercase tracking-tighter italic">Neural Input Required</span>
                    </div>
                    
                    {q.type === 'textarea' ? (
                      <div className="space-y-4">
                        <textarea 
                          rows={6} 
                          autoFocus
                          value={formData[q.id] || ''} 
                          onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                          className="w-full bg-black/50 border border-white/5 rounded-lg p-6 text-white text-lg focus:border-yellow-500/50 outline-none transition-all resize-none font-mono"
                          placeholder=">>> Input data here..."
                        />
                        {/* DATA DENSITY METER */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-[2px] bg-neutral-900 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${getDataDensity(formData[q.id]).color}`} 
                              animate={{ width: getDataDensity(formData[q.id]).width }} 
                            />
                          </div>
                          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter">
                            {getDataDensity(formData[q.id]).label}
                          </span>
                        </div>
                      </div>
                    ) : q.type === 'radio' ? (
                      <div className="grid grid-cols-1 gap-3">
                        {q.options?.map(opt => (
                          <button 
                            key={opt} 
                            onClick={() => setFormData(p => ({ ...p, [q.id]: opt }))} 
                            className={`p-5 rounded-lg border font-black text-[10px] uppercase tracking-[0.2em] transition-all text-left flex items-center justify-between group ${
                              formData[q.id] === opt 
                              ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' 
                              : 'bg-black/40 border-white/5 text-neutral-600 hover:border-white/20'
                            }`}
                          >
                            {opt}
                            {formData[q.id] === opt && <Zap size={14} />}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        autoFocus
                        value={formData[q.id] || ''} 
                        onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                        className="w-full bg-black/50 border border-white/5 rounded-lg p-6 text-white text-lg focus:border-yellow-500/50 outline-none transition-all font-mono" 
                        readOnly={q.id.includes('discord')}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* NAVIGATION */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                  <button 
                    onClick={() => setCurrentStep(s => s - 1)} 
                    disabled={currentStep === 0} 
                    className={`text-[9px] font-black uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-neutral-500 hover:text-white'}`}
                  >
                    PREV NODE
                  </button>
                  
                  {currentStep === totalPages - 1 ? (
                    <button 
                      onClick={handleSubmit} 
                      disabled={!isStepComplete || submissionStatus === "SENDING"} 
                      className={`px-10 py-4 font-black uppercase text-xs tracking-widest transition-all rounded-lg flex items-center gap-2
                        ${submissionStatus === "ERROR" ? "bg-red-500 text-white" : 
                          "bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_20px_#FACC1533]"}`}
                    >
                      {submissionStatus === "SENDING" ? "ENCRYPTING..." : 
                       submissionStatus === "ERROR" ? "RETRY UPLOAD" : "INITIATE ARCHIVE"} <Send size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentStep(s => s + 1)} 
                      disabled={!isStepComplete} 
                      className="bg-white text-black px-10 py-4 rounded-lg font-black uppercase text-xs tracking-widest disabled:opacity-5 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:bg-neutral-200"
                    >
                      Next Step <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-4 text-neutral-800">
                <div className="flex items-center gap-2">
                  <Shield size={12} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Encrypted Transmissions</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-neutral-800" />
                <div className="flex items-center gap-2">
                  <Database size={12} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Real-time Auto-save</span>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER GLITCH DECORATION */}
      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent shadow-[0_0_10px_#FACC15]" />
    </div>
  );
}