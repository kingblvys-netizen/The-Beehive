"use client";

import React, { useState, useEffect } from 'react';
// We keep your existing data file
import { roles, getQuestions } from '../../data'; 
import { notFound, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ChevronRight, CheckCircle, ArrowLeft, Lock, Shield, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR
  
  // Visual State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // --- 1. SESSION SYNC (Fixes Identity) ---
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({ 
        ...prev, 
        // We auto-fill these fields so the user doesn't have to
        discord_user: session.user?.name ?? "Unknown", 
        discord_id: (session.user as any)?.id ?? "unknown_id" 
      }));
    }
  }, [session]);

  // --- 2. CURSOR EFFECT ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!role) return notFound();

  // --- 3. QUESTION LOGIC ---
  const questions = getQuestions(role.id);
  const questionsPerPage = 3; 
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentStep * questionsPerPage, (currentStep * questionsPerPage) + questionsPerPage);
  
  const isPageComplete = currentQuestions.every(q => formData[q.id] && formData[q.id].trim() !== "");
  const progressPercent = ((currentStep + 1) / totalPages) * 100;

  // --- 4. SUBMISSION HANDLER (The Critical Fix) ---
  const handleSubmit = async () => {
    setSubmissionStatus("SENDING");
    
    // Safety Fallbacks for ID
    const safeId = (session?.user as any)?.id || (session?.user as any)?.discordId || "manual_entry";
    const safeName = session?.user?.name || "Anonymous Agent";

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Matches your Database Columns EXACTLY
          roleTitle: role.title,    // -> role_title
          username: safeName,       // -> username
          discord_id: safeId,       // -> discord_id
          answers: formData         // -> answers (JSON)
        }),
      });

      if (response.ok) {
        setSubmissionStatus("SUCCESS");
        // Optional: Save to local storage to show "Reviewing" on home screen
        const saved = localStorage.getItem('beehive_submissions');
        const submissions = saved ? JSON.parse(saved) : [];
        if (!submissions.includes(role.id)) {
          submissions.push(role.id);
          localStorage.setItem('beehive_submissions', JSON.stringify(submissions));
        }
        // Redirect after delay
        setTimeout(() => router.push("/"), 3000);
      } else {
        setSubmissionStatus("ERROR");
      }
    } catch (error) {
      console.error("Transmission Error", error);
      setSubmissionStatus("ERROR");
    }
  };

  // Loading State
  if (status === "loading") return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Hexagon className="text-yellow-500 animate-spin" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500 selection:text-black cursor-none relative overflow-x-hidden font-mono">
      
      {/* --- BACKGROUND PATTERN (Matches Home) --- */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* --- CUSTOM CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference"
        animate={{ x: mousePos.x - 16, y: mousePos.y - 16, scale: isHovering ? 1.5 : 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 800, mass: 0.1 }}
      >
        <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} />
      </motion.div>

      {/* --- HEADER --- */}
      <nav className="border-b border-yellow-900/30 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <Hexagon className="text-yellow-500 fill-yellow-500 group-hover:rotate-90 transition-transform" size={24} />
            <span className="font-bold uppercase tracking-widest text-xl text-yellow-500">HIVE COMMAND</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-widest">Protocol Upload</span>
              <div className="w-32 h-1 bg-yellow-900/30 rounded-full mt-1 overflow-hidden">
                <motion.div className="h-full bg-yellow-500" animate={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20 z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* --- SUCCESS STATE --- */}
          {submissionStatus === "SUCCESS" ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-neutral-900/50 rounded-[2rem] border border-yellow-500/30 backdrop-blur-sm">
              <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-500/20">
                <CheckCircle size={48} className="text-yellow-500" />
              </div>
              <h2 className="text-4xl font-bold uppercase mb-4 tracking-wider">Protocol <span className="text-yellow-500">Complete</span></h2>
              <p className="text-neutral-500 mb-10 max-w-sm mx-auto">Application data archived. Redirecting to Command Hub...</p>
            </motion.div>
          ) : (
            
            /* --- FORM STATE --- */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-12 border-l-2 border-yellow-500 pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-yellow-500" />
                  <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-[0.3em]">Clearance: {role.level}</span>
                </div>
                <h1 className="text-5xl font-bold uppercase tracking-tighter text-white">
                  {role.title} <span className="text-neutral-600">Protocol</span>
                </h1>
              </div>

              <div className="bg-neutral-900/80 border border-yellow-500/20 p-8 md:p-12 rounded-[1rem] relative overflow-hidden backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                
                {/* --- LOCKED STATE (No Login) --- */}
                {!session && (
                  <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                    <Lock size={64} className="text-red-500 mb-6 animate-pulse" />
                    <h3 className="text-2xl font-bold uppercase mb-2 text-white">Identity Required</h3>
                    <p className="text-neutral-400 mb-8 max-w-xs text-sm font-mono">Secure neural link via Discord is mandatory for this application.</p>
                    <button onClick={() => signIn('discord')} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-yellow-500 text-black px-12 py-4 rounded font-bold uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all">
                      Establish Link
                    </button>
                  </div>
                )}

                {/* --- QUESTIONS LOOP --- */}
                <div className="space-y-12">
                  {currentQuestions.map((q) => (
                    <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 group-focus-within:text-yellow-500 transition-colors">
                          // {q.label}
                        </label>
                        {formData[q.id] && <CheckCircle size={14} className="text-green-500" />}
                      </div>
                      
                      {q.type === 'textarea' ? (
                        <div className="relative">
                          <textarea 
                            rows={5} 
                            value={formData[q.id] || ''} 
                            onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                            className="w-full bg-black/60 border border-white/10 text-white p-4 focus:border-yellow-500 outline-none transition-all text-sm font-mono rounded-none border-l-4 focus:border-l-yellow-500" 
                            placeholder="INPUT DATA..." 
                          />
                        </div>
                      ) : q.type === 'radio' ? (
                        <div className="grid grid-cols-2 gap-4">
                          {q.options?.map(opt => (
                            <button key={opt} onClick={() => setFormData(p => ({ ...p, [q.id]: opt }))} className={`p-4 border font-bold text-[10px] uppercase tracking-widest transition-all ${formData[q.id] === opt ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' : 'bg-black/40 border-white/10 text-neutral-500 hover:border-white/30'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          value={formData[q.id] || ''} 
                          onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                          className="w-full bg-black/60 border border-white/10 text-white p-4 focus:border-yellow-500 outline-none transition-all text-sm font-mono rounded-none border-l-4 focus:border-l-yellow-500" 
                          readOnly={q.id.includes('discord')}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* --- NAVIGATION & SUBMIT --- */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-yellow-500/20">
                  <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 0} className={`text-[10px] font-bold uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0' : 'text-neutral-500 hover:text-white'}`}>
                    &lt; PREV
                  </button>
                  
                  {currentStep === totalPages - 1 ? (
                    <button 
                      onClick={handleSubmit} 
                      disabled={!isPageComplete || submissionStatus === "SENDING"} 
                      onMouseEnter={() => setIsHovering(true)} 
                      onMouseLeave={() => setIsHovering(false)} 
                      className={`px-12 py-4 font-bold uppercase text-xs tracking-widest transition-all flex items-center gap-2
                        ${submissionStatus === "ERROR" ? "bg-red-500/20 text-red-500 border border-red-500" : 
                          "bg-yellow-500 text-black hover:bg-yellow-400"}`}
                    >
                      {submissionStatus === "SENDING" ? "TRANSMITTING..." : 
                       submissionStatus === "ERROR" ? "RETRY TRANSMISSION" : "INITIATE UPLOAD"}
                    </button>
                  ) : (
                    <button onClick={() => setCurrentStep(s => s + 1)} disabled={!isPageComplete} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-white/10 border border-white/20 text-white px-10 py-4 font-bold uppercase text-xs tracking-widest disabled:opacity-20 transition-all flex items-center gap-2 hover:bg-white/20">
                      NEXT &gt;
                    </button>
                  )}
                </div>
              </div>
              
              {/* --- FOOTER STATUS --- */}
              <div className="mt-8 flex items-center justify-center gap-2 text-neutral-600">
                {submissionStatus === "ERROR" ? <AlertTriangle size={14} className="text-red-500" /> : <Info size={14} />}
                <span className={`text-[9px] font-bold uppercase tracking-widest ${submissionStatus === "ERROR" ? "text-red-500" : ""}`}>
                  {submissionStatus === "ERROR" ? "Connection Protocol Failed" : "Secure Connection Established"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}