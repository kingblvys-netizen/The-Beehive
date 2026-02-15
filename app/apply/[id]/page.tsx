"use client";

import React, { useState, useEffect } from 'react';
import { roles, getQuestions } from '../../data';
import { notFound } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ChevronRight, CheckCircle, ArrowLeft, Lock, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Unwrap Params & Session
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);

  // 2. State Management
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Cursor & Hover State
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

  // 4. Question Pagination
  const questions = getQuestions(role.id);
  const questionsPerPage = 2; 
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentStep * questionsPerPage, (currentStep * questionsPerPage) + questionsPerPage);
  const isPageComplete = currentQuestions.every(q => formData[q.id] && formData[q.id].trim() !== "");
  const progressPercent = ((currentStep + 1) / (totalPages + 1)) * 100;

  // 5. Submission Handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleTitle: role.title, username: session?.user?.name || "User", answers: formData }),
      });

      if (response.ok) {
        // Save "Pending" status to LocalStorage
        const saved = localStorage.getItem('beehive_submissions');
        const submissions = saved ? JSON.parse(saved) : [];
        if (!submissions.includes(role.id)) {
          submissions.push(role.id);
          localStorage.setItem('beehive_submissions', JSON.stringify(submissions));
        }
        setIsSubmitted(true);
      } else {
        alert("Submission failed. Please try again.");
      }
    } catch (error) {
      alert("Error reaching server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Loading State
  if (status === "loading") return (
    <div className="min-h-screen bg-bee-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-bee-black text-white selection:bg-yellow-400 selection:text-black cursor-none relative overflow-x-hidden">
      
      {/* --- SNAPPY CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
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

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-yellow-400/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-yellow-400/5 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.04]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' stroke-width='2' fill='none'/%3E%3C/svg%3E")` }} 
        />
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="border-b border-bee-gray bg-bee-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="flex items-center gap-3 group">
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-90 transition-transform duration-500" size={28} />
            <span className="font-bold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">The Beehive</span>
          </Link>
          
          {!isSubmitted && (
             <div className="flex items-center gap-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Secure Connection
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
             </div>
          )}
        </div>
        {/* Glowing Progress Line */}
        {!isSubmitted && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-bee-gray w-full">
            <motion.div 
              className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20 z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* --- SUCCESS STATE --- */}
          {isSubmitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="max-w-lg mx-auto bg-bee-dark/60 backdrop-blur-2xl border border-bee-gray p-12 rounded-[2rem] text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />
              
              <motion.div 
                initial={{ scale: 0, rotate: -180 }} 
                animate={{ scale: 1, rotate: 0 }} 
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-400/20"
              >
                <CheckCircle size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              </motion.div>

              <h2 className="text-4xl font-black uppercase mb-4 text-white tracking-tight">Application <span className="text-yellow-400">Sent</span></h2>
              <p className="text-gray-400 mb-10 leading-relaxed text-sm font-medium">
                Your dossier for <span className="text-white font-bold">{role.title}</span> has been securely transmitted to our High Command. 
              </p>
              
              <Link 
                onMouseEnter={() => setIsHovering(true)} 
                onMouseLeave={() => setIsHovering(false)} 
                href="/" 
                className="group relative w-full inline-flex items-center justify-center py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl overflow-hidden hover:scale-[1.02] transition-transform"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-2">Return to Base <ArrowLeft size={14} className="rotate-180" /></span>
              </Link>
            </motion.div>
          ) : (
            
            /* --- FORM STATE --- */
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="w-full"
            >
              {/* Header */}
              <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                   <motion.div 
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     className="flex items-center gap-3 mb-2"
                   >
                     <span className={`text-[10px] px-2 py-0.5 rounded border font-black tracking-widest uppercase ${
                        role.level === 'HIGH' ? 'border-red-500/50 text-red-500 bg-red-500/5' : 
                        role.level === 'MID' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/5' : 
                        'border-green-500/50 text-green-500 bg-green-500/5'
                      }`}>
                       {role.level} Clearance
                     </span>
                     <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">ID: {role.id.toUpperCase()}</span>
                   </motion.div>
                   <h1 className="text-5xl font-black uppercase tracking-tighter">
                     Apply: <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">{role.title}</span>
                   </h1>
                </div>
                <Link onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} href="/" className="text-gray-500 hover:text-white transition flex items-center gap-2 text-[10px] uppercase font-black tracking-widest mb-2 opacity-60 hover:opacity-100">
                  <ArrowLeft size={14} /> Abort
                </Link>
              </div>

              {/* Form Container */}
              <motion.div 
                layout
                className="bg-bee-dark/40 backdrop-blur-2xl border border-bee-gray p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
              >
                {/* Security Lock Overlay */}
                {!session && (
                  <div className="absolute inset-0 bg-bee-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="mb-6 text-yellow-400"
                    >
                      <Lock size={64} />
                    </motion.div>
                    <h3 className="text-2xl font-black uppercase mb-2 tracking-tight">Identity Verification Required</h3>
                    <p className="text-gray-500 text-sm mb-8 max-w-xs text-center">We require a verified Discord identity to access this secure form.</p>
                    <button 
                      onMouseEnter={() => setIsHovering(true)} 
                      onMouseLeave={() => setIsHovering(false)} 
                      onClick={() => signIn('discord')} 
                      className="bg-yellow-400 text-black px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                    >
                      Authenticate via Discord
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait" custom={currentStep}>
                  {currentStep === totalPages ? (
                    /* Final Review Step */
                    <motion.div 
                      key="submit" 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="text-center py-8"
                    >
                      <Shield size={80} className="text-yellow-400 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" />
                      <h3 className="text-3xl font-black uppercase mb-4">Confirm Submission</h3>
                      <p className="text-gray-400 max-w-md mx-auto mb-10 leading-relaxed text-sm">
                        By submitting, you confirm that all provided information is accurate. False data will result in immediate disqualification.
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button 
                          onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                          onClick={() => setCurrentStep(currentStep - 1)} 
                          className="px-10 py-4 rounded-xl border border-bee-gray hover:bg-white/5 font-bold uppercase text-xs tracking-widest transition"
                        >
                          Review Data
                        </button>
                        <button 
                          onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                          onClick={handleSubmit} 
                          disabled={isSubmitting} 
                          className="bg-yellow-400 text-black px-12 py-4 rounded-xl font-black hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.4)] transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                        >
                          {isSubmitting ? "Transmitting..." : "Sign & Submit"}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Questions Step */
                    <motion.div 
                      key={currentStep} 
                      initial={{ x: 20, opacity: 0 }} 
                      animate={{ x: 0, opacity: 1 }} 
                      exit={{ x: -20, opacity: 0 }} 
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-10"
                    >
                      {currentQuestions.map((q, idx) => (
                        <motion.div 
                          key={q.id} 
                          initial={{ y: 20, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          transition={{ delay: idx * 0.1 }} 
                          className="space-y-4 group"
                        >
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-500 group-focus-within:text-yellow-400 transition-colors">
                              {q.label}
                            </label>
                            {/* Validation Dot */}
                            {formData[q.id] && formData[q.id].trim() !== "" ? (
                              <CheckCircle size={14} className="text-green-500" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                            )}
                          </div>

                          {q.type === 'textarea' ? (
                            <textarea 
                              onMouseEnter={() => setIsHovering(true)} 
                              onMouseLeave={() => setIsHovering(false)} 
                              rows={5} 
                              placeholder={q.placeholder || "Type your answer here..."}
                              value={formData[q.id] || ''} 
                              onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                              className="w-full bg-bee-black/30 border border-bee-gray rounded-2xl p-6 focus:border-yellow-400/50 focus:bg-bee-black/60 outline-none transition-all resize-none cursor-none text-sm leading-relaxed" 
                            />
                          ) : q.type === 'radio' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {q.options?.map((option) => (
                                <motion.button 
                                  whileTap={{ scale: 0.98 }} 
                                  key={option} 
                                  type="button" 
                                  onMouseEnter={() => setIsHovering(true)} 
                                  onMouseLeave={() => setIsHovering(false)} 
                                  onClick={() => setFormData(p => ({ ...p, [q.id]: option }))} 
                                  className={`p-6 rounded-2xl border font-black text-xs uppercase tracking-widest text-left transition-all flex items-center justify-between cursor-none relative overflow-hidden group/btn ${
                                    formData[q.id] === option 
                                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.15)]' 
                                      : 'border-bee-gray bg-bee-black/20 text-gray-500 hover:border-gray-600 hover:bg-bee-black/40'
                                  }`}
                                >
                                  <span className="relative z-10">{option}</span>
                                  {formData[q.id] === option && (
                                    <motion.div layoutId={`check-${q.id}`} className="relative z-10">
                                      <CheckCircle size={20} className="drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                    </motion.div>
                                  )}
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <input 
                              onMouseEnter={() => setIsHovering(true)} 
                              onMouseLeave={() => setIsHovering(false)} 
                              type="text" 
                              placeholder={q.placeholder || "Start typing..."}
                              value={formData[q.id] || ''} 
                              onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} 
                              className="w-full bg-bee-black/30 border border-bee-gray rounded-2xl p-6 focus:border-yellow-400/50 focus:bg-bee-black/60 outline-none transition-all cursor-none text-sm font-medium" 
                              readOnly={q.id === 'discord_user' || q.id === 'discord_id'} 
                            />
                          )}
                        </motion.div>
                      ))}

                      {/* Footer Navigation */}
                      <div className="flex justify-between items-center pt-10 border-t border-white/5">
                        <button 
                          onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                          onClick={() => setCurrentStep(currentStep - 1)} 
                          disabled={currentStep === 0} 
                          className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${currentStep === 0 ? 'opacity-0' : 'text-gray-500 hover:text-white'}`}
                        >
                          Previous Section
                        </button>
                        
                        <button 
                          onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                          onClick={() => isPageComplete ? setCurrentStep(currentStep + 1) : alert("Please complete all required fields before proceeding.")} 
                          className={`group px-10 py-4 rounded-xl font-black transition-all uppercase text-xs tracking-widest flex items-center gap-4 ${
                            isPageComplete 
                              ? 'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-105 shadow-[0_0_20px_rgba(250,204,21,0.2)]' 
                              : 'bg-bee-gray text-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          Next Section 
                          <ChevronRight size={16} className={`transition-transform ${isPageComplete ? 'group-hover:translate-x-1' : ''}`} />
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