"use client";

import React, { useState, useEffect } from 'react';
import { roles, getQuestions } from '../../data'; 
import { notFound } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ChevronRight, CheckCircle, ArrowLeft, Lock, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Unwrap Params for Next.js 15
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);

  // 2. State Management
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Cursor State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // 3. Setup Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-fill Discord Identity
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({ 
        ...prev, 
        discord_user: session.user?.name ?? "", 
        discord_id: (session.user as any).id ?? "" 
      }));
    }
  }, [session]);

  if (!role) return notFound();

  // 4. Pagination Logic
  const questions = getQuestions(role.id);
  const questionsPerPage = 3; 
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentStep * questionsPerPage, (currentStep * questionsPerPage) + questionsPerPage);
  
  // Validation: Check if current page is valid
  const isPageComplete = currentQuestions.every(q => {
    return formData[q.id] && formData[q.id].trim() !== "";
  });
  
  const progressPercent = ((currentStep + 1) / (totalPages + 1)) * 100;

  // 5. Submission Handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roleTitle: role.title, 
          username: session?.user?.name || "User", 
          discord_id: (session?.user as any)?.id,
          answers: formData 
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        // Save to local storage to show "Pending" on homepage
        const saved = localStorage.getItem('beehive_submissions');
        const submissions = saved ? JSON.parse(saved) : [];
        if (!submissions.includes(role.id)) {
          submissions.push(role.id);
          localStorage.setItem('beehive_submissions', JSON.stringify(submissions));
        }
      } else {
        alert("Transmission failed. Please try again.");
      }
    } catch (error) {
      alert("Error reaching server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-400 selection:text-black cursor-none relative overflow-x-hidden font-sans">
      
      {/* --- CUSTOM CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] mix-blend-difference"
        animate={{ 
          x: mousePos.x - 16, 
          y: mousePos.y - 16,
          scale: isHovering ? 1.5 : 1,
          rotate: isHovering ? 90 : 0
        }}
        transition={{ type: "spring", damping: 20, stiffness: 800, mass: 0.1 }}
      >
        <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} className="opacity-90" />
      </motion.div>

      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-yellow-400/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-yellow-400/5 blur-[100px] rounded-full" />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="flex items-center gap-3 group">
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-90 transition-transform duration-500" size={28} />
            <span className="font-bold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">The Beehive</span>
          </Link>
          
          {!isSubmitted && (
             <div className="flex items-center gap-4">
                <div className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  Secure Connection
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
             </div>
          )}
        </div>
        {!isSubmitted && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-white/10 w-full">
            <motion.div 
              className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        )}
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-4xl mx-auto px-6 py-20 z-10 relative">
        <AnimatePresence mode="wait">
          
          {isSubmitted ? (
            /* SUCCESS VIEW */
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="max-w-lg mx-auto bg-neutral-900/60 backdrop-blur-2xl border border-white/10 p-12 rounded-[2rem] text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />
              <motion.div 
                initial={{ scale: 0, rotate: -180 }} 
                animate={{ scale: 1, rotate: 0 }} 
                className="w-24 h-24 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-400/20"
              >
                <CheckCircle size={48} className="text-yellow-400" />
              </motion.div>
              <h2 className="text-4xl font-black uppercase mb-4 text-white tracking-tight">Application <span className="text-yellow-400">Sent</span></h2>
              <p className="text-neutral-400 mb-10 leading-relaxed text-sm font-medium">
                Your dossier for <span className="text-white font-bold">{role.title}</span> has been securely transmitted.
              </p>
              <Link 
                href="/" 
                className="w-full inline-flex items-center justify-center py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:scale-[1.02] transition-transform"
              >
                Return to Base
              </Link>
            </motion.div>
          ) : (
            /* FORM VIEW */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              
              {/* Form Header */}
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-4">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                     <span className="text-[10px] px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-500 bg-yellow-500/5 font-black tracking-widest uppercase">
                       {role.level || "STD"} Clearance
                     </span>
                     <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">ID: {role.id.toUpperCase()}</span>
                   </div>
                   <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                     Apply: <span className="text-yellow-400">{role.title}</span>
                   </h1>
                </div>
                <Link href="/" className="text-neutral-500 hover:text-white transition flex items-center gap-2 text-[10px] uppercase font-black tracking-widest mb-2">
                  <ArrowLeft size={14} /> Abort
                </Link>
              </div>

              {/* Form Body */}
              <motion.div layout className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
                
                {/* LOGIN LOCK */}
                {!session && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center">
                    <Lock size={64} className="text-yellow-400 mb-6" />
                    <h3 className="text-2xl font-black uppercase mb-2">Identity Verification Required</h3>
                    <button onClick={() => signIn('discord')} className="mt-6 bg-yellow-400 text-black px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300">
                      Authenticate via Discord
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait" custom={currentStep}>
                  {currentStep === totalPages ? (
                    /* CONFIRMATION STEP */
                    <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                      <Shield size={80} className="text-yellow-400 mx-auto mb-8" />
                      <h3 className="text-3xl font-black uppercase mb-4">Confirm Submission</h3>
                      <p className="text-neutral-400 max-w-md mx-auto mb-10 text-sm">
                        By submitting, you confirm that all provided information is accurate.
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => setCurrentStep(currentStep - 1)} className="px-10 py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold uppercase text-xs tracking-widest">
                          Review Data
                        </button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-yellow-400 text-black px-12 py-4 rounded-xl font-black hover:bg-yellow-300 uppercase text-xs tracking-widest disabled:opacity-50">
                          {isSubmitting ? "Transmitting..." : "Sign & Submit"}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* QUESTION STEPS */
                    <motion.div key={currentStep} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                      {currentQuestions.map((q, idx) => (
                        <motion.div key={q.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className="space-y-4 group">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 group-focus-within:text-yellow-400 transition-colors">
                              {q.label}
                            </label>
                            {formData[q.id] && formData[q.id].trim() !== "" && <CheckCircle size={14} className="text-green-500" />}
                          </div>
                          
                          {/* RENDER LOGIC */}
                          {q.type === 'textarea' ? (
                            <textarea 
                              rows={5} 
                              placeholder={q.placeholder || "Type here..."}
                              value={formData[q.id] || ''} 
                              onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                              className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 focus:border-yellow-400/50 focus:bg-black/60 outline-none transition-all resize-none text-sm text-white placeholder:text-neutral-700" 
                            />
                          ) : q.type === 'radio' ? (
                            // --- NEW RADIO BUTTON LOGIC ---
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {q.options?.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => setFormData(p => ({ ...p, [q.id]: option }))}
                                  className={`p-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                                    formData[q.id] === option 
                                      ? 'bg-yellow-400 text-black border-yellow-400' 
                                      : 'bg-black/20 text-neutral-500 border-white/10 hover:border-yellow-400/50 hover:text-white'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input 
                              type="text" 
                              placeholder={q.placeholder || "Type here..."}
                              value={formData[q.id] || ''} 
                              onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                              className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 focus:border-yellow-400/50 focus:bg-black/60 outline-none transition-all text-sm text-white placeholder:text-neutral-700" 
                              readOnly={q.id === 'discord_user' || q.id === 'discord_id'} 
                            />
                          )}
                        </motion.div>
                      ))}

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-10 border-t border-white/5">
                        <button onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className={`text-[10px] font-black uppercase tracking-widest ${currentStep === 0 ? 'opacity-0' : 'text-neutral-500 hover:text-white'}`}>
                          Previous
                        </button>
                        <button onClick={() => isPageComplete ? setCurrentStep(currentStep + 1) : alert("Please complete all fields.")} className={`px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-4 ${isPageComplete ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-neutral-800 text-neutral-600'}`}>
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}