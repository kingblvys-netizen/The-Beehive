"use client";

import React, { useState, useEffect } from 'react';
import { roles, getQuestions } from '../../data'; 
import { notFound } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ChevronRight, CheckCircle, ArrowLeft, Lock, Shield, Info } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { data: session, status } = useSession();
  const role = roles.find((r) => r.id === resolvedParams.id);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Sync session identity
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

  const questions = getQuestions(role.id);
  const questionsPerPage = 3; 
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(currentStep * questionsPerPage, (currentStep * questionsPerPage) + questionsPerPage);
  
  const isPageComplete = currentQuestions.every(q => formData[q.id] && formData[q.id].trim() !== "");
  const progressPercent = ((currentStep + 1) / (totalPages + 1)) * 100;

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
        const saved = localStorage.getItem('beehive_submissions');
        const submissions = saved ? JSON.parse(saved) : [];
        if (!submissions.includes(role.id)) {
          submissions.push(role.id);
          localStorage.setItem('beehive_submissions', JSON.stringify(submissions));
        }
      } else {
        alert("Transmission failed. Please check your network or re-login.");
      }
    } catch (error) {
      alert("Critical error reaching server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-yellow-400 selection:text-black cursor-none relative overflow-x-hidden font-sans">
      
      {/* --- CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 mix-blend-difference"
        animate={{ x: mousePos.x - 16, y: mousePos.y - 16, scale: isHovering ? 1.5 : 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 800, mass: 0.1 }}
      >
        <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} />
      </motion.div>

      {/* --- NAV --- */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-90 transition-transform" size={24} />
            <span className="font-black uppercase tracking-tighter text-xl">The Beehive</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Protocol Progress</span>
              <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                <motion.div className="h-full bg-yellow-400" animate={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20 z-10 relative">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-neutral-900/20 rounded-[3rem] border border-white/5 backdrop-blur-sm">
              <div className="w-24 h-24 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-400/20">
                <CheckCircle size={48} className="text-yellow-400" />
              </div>
              <h2 className="text-4xl font-black uppercase mb-4 tracking-tight">Data <span className="text-yellow-400">Archived</span></h2>
              <p className="text-neutral-500 mb-10 max-w-sm mx-auto">Your application for {role.title} has been logged in the Hive database.</p>
              <Link href="/" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="inline-flex items-center gap-2 bg-yellow-400 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                Return to Hub <ArrowLeft size={14} className="rotate-180" />
              </Link>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-12 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={12} className="text-yellow-400" />
                    <span className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.3em]">Clearance: {role.level}</span>
                  </div>
                  <h1 className="text-5xl font-black uppercase tracking-tighter">Apply for <span className="text-neutral-500">{role.title}</span></h1>
                </div>
                <Link href="/" className="text-neutral-600 hover:text-white transition-colors text-[10px] font-black uppercase mb-2">Abort</Link>
              </div>

              <div className="bg-neutral-900/40 border border-white/10 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden backdrop-blur-md">
                {!session && (
                  <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8 text-center">
                    <Lock size={64} className="text-yellow-400 mb-6" />
                    <h3 className="text-2xl font-black uppercase mb-2">Neural Link Required</h3>
                    <p className="text-neutral-500 mb-8 max-w-xs text-sm">Authentication via Discord is mandatory for security logging.</p>
                    <button onClick={() => signIn('discord')} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-yellow-400 text-black px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all">Connect Discord</button>
                  </div>
                )}

                <div className="space-y-12">
                  {currentQuestions.map((q) => (
                    <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-focus-within:text-yellow-400 transition-colors">{q.label}</label>
                        {formData[q.id] && <CheckCircle size={12} className="text-green-500" />}
                      </div>
                      
                      {q.type === 'textarea' ? (
                        <div className="relative">
                          <textarea rows={5} value={formData[q.id] || ''} onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 focus:border-yellow-400/50 outline-none transition-all text-sm leading-relaxed" placeholder="Detailed response required..." />
                          <div className="absolute bottom-4 right-4 text-[9px] font-bold text-neutral-700 uppercase">Input Logged</div>
                        </div>
                      ) : q.type === 'radio' ? (
                        <div className="grid grid-cols-2 gap-4">
                          {q.options?.map(opt => (
                            <button key={opt} onClick={() => setFormData(p => ({ ...p, [q.id]: opt }))} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className={`p-5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${formData[q.id] === opt ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'bg-white/5 border-white/5 text-neutral-500 hover:border-white/20'}`}>{opt}</button>
                          ))}
                        </div>
                      ) : (
                        <input type="text" value={formData[q.id] || ''} onChange={(e) => setFormData(p => ({ ...p, [q.id]: e.target.value }))} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 focus:border-yellow-400/50 outline-none transition-all text-sm" readOnly={q.id.includes('discord')} />
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                  <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 0} className={`text-[10px] font-black uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0' : 'text-neutral-500 hover:text-white'}`}>Previous Section</button>
                  
                  {currentStep === totalPages - 1 ? (
                    <button onClick={handleSubmit} disabled={!isPageComplete || isSubmitting} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-yellow-400 text-black px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-20 hover:scale-105 transition-all shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                      {isSubmitting ? 'Transmitting...' : 'Sign & Submit'}
                    </button>
                  ) : (
                    <button onClick={() => setCurrentStep(s => s + 1)} disabled={!isPageComplete} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-white text-black px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-20 transition-all flex items-center gap-2">Next Step <ChevronRight size={16} /></button>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-2 text-neutral-700">
                <Info size={14} />
                <span className="text-[9px] font-bold uppercase tracking-widest">All transmissions are encrypted and logged for security auditing</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}