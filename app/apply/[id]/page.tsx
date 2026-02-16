"use client";

import React, { useState, useEffect } from 'react';
import { roles, getQuestions } from '../../data'; 
import { notFound, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, ChevronRight, CheckCircle2, ArrowLeft, 
  Lock, Shield, AlertTriangle, Terminal, Send
} from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);
  const router = useRouter();

  // --- STATE ---
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR
  const [isHovering, setIsHovering] = useState(false);

  // --- 1. IDENTITY SYNC ---
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({ 
        ...prev, 
        discord_user: session.user?.name ?? "Unknown", 
        discord_id: (session.user as any)?.id ?? "unknown_id" 
      }));
    }
  }, [session]);

  if (!role) return notFound();

  // --- 2. PAGINATION LOGIC ---
  const questions = getQuestions(role.id);
  const questionsPerPage = 1; // Focus on ONE question at a time for better focus
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentStep * questionsPerPage, (currentStep * questionsPerPage) + questionsPerPage);
  
  // Progress Calculation
  const progress = ((currentStep + 1) / totalPages) * 100;
  
  // Validation
  const isStepComplete = currentQuestions.every(q => formData[q.id] && formData[q.id].trim() !== "");

  // --- 3. SUBMISSION ---
  const handleSubmit = async () => {
    setSubmissionStatus("SENDING");
    
    const safeId = (session?.user as any)?.id || "manual_entry";
    const safeName = session?.user?.name || "Anonymous Agent";

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roleTitle: role.title,
          username: safeName,
          discord_id: safeId,
          answers: formData
        }),
      });

      if (response.ok) {
        setSubmissionStatus("SUCCESS");
        // Save to local storage for "Pending" badge on home
        const saved = localStorage.getItem('beehive_submissions');
        const submissions = saved ? JSON.parse(saved) : [];
        if (!submissions.includes(role.id)) {
          submissions.push(role.id);
          localStorage.setItem('beehive_submissions', JSON.stringify(submissions));
        }
        setTimeout(() => router.push("/"), 3000);
      } else {
        setSubmissionStatus("ERROR");
      }
    } catch (error) {
      setSubmissionStatus("ERROR");
    }
  };

  // Loading Spinner
  if (status === "loading") return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
      <Hexagon className="text-yellow-400 animate-spin" size={48} />
      <div className="text-yellow-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Initializing Protocol...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-400 selection:text-black overflow-hidden relative">
      
      {/* --- BACKGROUND FX --- */}
      <div className="fixed inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* --- HEADER --- */}
      <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <Link href="/" className="flex items-center gap-3 group opacity-80 hover:opacity-100 transition-opacity">
          <ArrowLeft className="text-neutral-500 group-hover:text-yellow-400 group-hover:-translate-x-1 transition-all" size={20} />
          <span className="font-black uppercase tracking-widest text-xs">Abort Mission</span>
        </Link>
        
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Clearance Level</span>
          <span className={`text-xs font-black uppercase tracking-widest ${
            role.level === 'HIGH' ? 'text-red-500' : 'text-green-500'
          }`}>{role.level}</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-32 relative z-20 min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* --- SUCCESS STATE --- */}
          {submissionStatus === "SUCCESS" ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">Transmission <span className="text-green-500">Secure</span></h2>
              <p className="text-neutral-500 mb-8 max-w-sm mx-auto font-medium">Your application data has been encrypted and archived. Stand by for command review.</p>
              <div className="h-1 w-32 bg-neutral-800 mx-auto rounded-full overflow-hidden">
                <motion.div className="h-full bg-green-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3 }} />
              </div>
            </motion.div>
          ) : (
            
            /* --- FORM CONTAINER --- */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              
              {/* Header Info */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                  <Terminal size={10} /> Protocol: {role.title}
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">
                  Application <span className="text-neutral-600">Form</span>
                </h1>
                
                {/* Progress Bar */}
                <div className="mt-8 flex items-center gap-4 max-w-xs mx-auto">
                  <span className="text-[10px] font-black text-neutral-600 w-8">0%</span>
                  <div className="h-1.5 flex-1 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                    <motion.div className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 50 }} />
                  </div>
                  <span className="text-[10px] font-black text-yellow-400 w-8 text-right">100%</span>
                </div>
              </div>

              {/* Glass Card */}
              <div className="bg-neutral-900/40 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-md relative shadow-2xl">
                
                {/* LOGIN LOCK */}
                {!session && (
                  <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 text-center rounded-[2rem] backdrop-blur-sm">
                    <Lock size={48} className="text-red-500 mb-4 animate-pulse" />
                    <h3 className="text-xl font-black uppercase mb-2 text-white tracking-widest">Identity Required</h3>
                    <p className="text-neutral-500 mb-6 text-sm">Secure neural link via Discord is mandatory.</p>
                    <button onClick={() => signIn('discord')} className="bg-yellow-400 text-black px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all shadow-lg hover:scale-105">
                      Establish Link
                    </button>
                  </div>
                )}

                {/* QUESTION RENDERER */}
                <div className="min-h-[200px]">
                  <AnimatePresence mode="wait">
                    {currentQuestions.map((q) => (
                      <motion.div 
                        key={q.id} 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <label className="block text-sm font-bold uppercase tracking-widest text-neutral-400 border-l-2 border-yellow-400 pl-4">
                          {q.label}
                        </label>
                        
                        {q.type === 'textarea' ? (
                          <textarea 
                            rows={6} 
                            autoFocus
                            value={formData[q.id] || ''} 
                            onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-6 text-white text-lg focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none resize-none shadow-inner"
                            placeholder="Type your response here..."
                          />
                        ) : q.type === 'radio' ? (
                          <div className="grid grid-cols-1 gap-3">
                            {q.options?.map(opt => (
                              <button 
                                key={opt} 
                                onClick={() => setFormData(p => ({ ...p, [q.id]: opt }))} 
                                className={`p-5 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all text-left flex items-center justify-between group ${
                                  formData[q.id] === opt 
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                                  : 'bg-black/40 border-white/10 text-neutral-500 hover:border-white/30 hover:bg-white/5'
                                }`}
                              >
                                {opt}
                                {formData[q.id] === opt && <CheckCircle2 size={16} />}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            autoFocus
                            value={formData[q.id] || ''} 
                            onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-6 text-white text-lg focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none shadow-inner" 
                            readOnly={q.id.includes('discord')} // Auto-filled fields are read-only
                          />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* NAVIGATION */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                  <button 
                    onClick={() => setCurrentStep(s => s - 1)} 
                    disabled={currentStep === 0} 
                    className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:text-white ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-neutral-500'}`}
                  >
                    <ArrowLeft size={12} /> Previous
                  </button>
                  
                  {currentStep === totalPages - 1 ? (
                    <button 
                      onClick={handleSubmit} 
                      disabled={!isStepComplete || submissionStatus === "SENDING"} 
                      className={`px-8 py-4 font-black uppercase text-xs tracking-widest transition-all rounded-xl flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95
                        ${submissionStatus === "ERROR" ? "bg-red-500 text-white" : 
                          "bg-yellow-400 text-black hover:bg-yellow-300"}`}
                    >
                      {submissionStatus === "SENDING" ? "Transmitting..." : 
                       submissionStatus === "ERROR" ? "Failed - Retry" : "Submit Application"} <Send size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentStep(s => s + 1)} 
                      disabled={!isStepComplete} 
                      className="bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:bg-white/20 hover:scale-105 active:scale-95"
                    >
                      Next Step <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Footer Status */}
              <div className="mt-8 text-center">
                 <div className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-600 bg-black/50 px-4 py-2 rounded-full border border-white/5">
                    {submissionStatus === "ERROR" ? <AlertTriangle size={10} className="text-red-500" /> : <Shield size={10} />}
                    {submissionStatus === "ERROR" ? "Connection Interrupted" : "Secure Connection Established"}
                 </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}