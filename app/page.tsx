"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Hexagon, ChevronRight, LogOut, Clock, Users, Zap, 
  Activity, Shield, Lock, Database, Wifi, BookOpen 
} from 'lucide-react';
import { signIn, useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { roles as staticRoles } from './data'; 
import { motion, AnimatePresence, useMotionValue, useSpring, type Variants } from 'framer-motion';

// --- CONFIGURATION ---
const SITE_VERSION = "2.3.0-TACTICAL";

// --- CUSTOM BRAND ICONS ---
const DiscordIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
  </svg>
);

export default function Home() {
  const { data: session, status } = useSession();
  const [isHovering, setIsHovering] = useState(false);
  const [liveRoles, setLiveRoles] = useState(staticRoles);
  const [submittedRoles, setSubmittedRoles] = useState<Record<string, string>>({});
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [enableCursorFx, setEnableCursorFx] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [canAccessKnowledge, setCanAccessKnowledge] = useState(false);

  // --- 1. SURGICAL PRECISION CURSOR (ZERO LAG) ---
  const mouseX = useMotionValue(-100); 
  const mouseY = useMotionValue(-100);
  const springConfig = { damping: 40, stiffness: 1000, mass: 0.1 }; 
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  const cursorFrameRef = useRef<number | null>(null);
  const clickCleanupTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pointerMedia = window.matchMedia("(pointer: fine)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setEnableCursorFx(pointerMedia.matches && !motionMedia.matches);
    };

    sync();
    pointerMedia.addEventListener("change", sync);
    motionMedia.addEventListener("change", sync);

    return () => {
      pointerMedia.removeEventListener("change", sync);
      motionMedia.removeEventListener("change", sync);
    };
  }, []);

  // --- 2. LIVE ROLE & USER SYNC ENGINE ---
  useEffect(() => {
    const loadRoleSettings = async () => {
      try {
        const res = await fetch("/api/admin/toggle-role", { cache: "no-store" });
        const payload = await res.json();

        const settings: Record<string, boolean> = Array.isArray(payload)
          ? Object.fromEntries(payload.map((r: { role_id: string; is_open: boolean | null }) => [r.role_id, Boolean(r.is_open)]))
          : (payload?.settings || {});

        setLiveRoles(
          staticRoles.map((r) => ({
            ...r,
            isOpen: settings[r.id] ?? r.isOpen,
          }))
        );
      } catch {
        setLiveRoles(staticRoles);
      }
    };

    const loadSubmittedRoles = async () => {
      if (status !== "authenticated") {
        setSubmittedRoles({});
        return;
      }
      try {
        const res = await fetch("/api/apply", { cache: "no-store" });
        const data = await res.json();
        const map = Object.fromEntries(
          (Array.isArray(data?.appliedRoles) ? data.appliedRoles : []).map((r: { role_id: string; status: string }) => [String(r.role_id), String(r.status)])
        );
        setSubmittedRoles(map);
      } catch {
        setSubmittedRoles({});
      }
    };

    loadRoleSettings();
    loadSubmittedRoles();

    const loadAccess = async () => {
      if (status !== "authenticated") {
        setCanAccessAdmin(false);
        setCanAccessKnowledge(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/access/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setCanAccessAdmin(Boolean(data?.canAccessAdmin));
        setCanAccessKnowledge(Boolean(data?.canAccessKnowledge));
      } catch {
        setCanAccessAdmin(false);
        setCanAccessKnowledge(false);
      }
    };

    loadAccess();
  }, [status]);

  // --- 3. INPUT TRACKING ---
  useEffect(() => {
    if (!enableCursorFx) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nextX = e.clientX - 16;
      const nextY = e.clientY - 16;
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
      cursorFrameRef.current = requestAnimationFrame(() => {
        mouseX.set(nextX);
        mouseY.set(nextY);
        cursorFrameRef.current = null;
      });
    };
    const handleClick = (e: MouseEvent) => {
      const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
      setClicks((prev) => [...prev, newClick]);
      const timeoutId = window.setTimeout(() => {
        setClicks((prev) => prev.filter((c) => c.id !== newClick.id));
        clickCleanupTimersRef.current = clickCleanupTimersRef.current.filter((t) => t !== timeoutId);
      }, 600);
      clickCleanupTimersRef.current.push(timeoutId);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
      for (const timer of clickCleanupTimersRef.current) {
        window.clearTimeout(timer);
      }
      clickCleanupTimersRef.current = [];
    };
  }, [enableCursorFx, mouseX, mouseY]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 20 } },
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden selection:bg-yellow-500 selection:text-black font-sans antialiased ${enableCursorFx ? "cursor-none" : ""}`}>
      
      {/* --- SNAPPY CURSOR --- */}
      {enableCursorFx ? (
        <motion.div 
          className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 mix-blend-difference"
          style={{ x: cursorX, y: cursorY }}
          animate={{ scale: isHovering ? 1.4 : 1, rotate: isHovering ? 45 : 0 }}
        >
          <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} />
        </motion.div>
      ) : null}

      {/* --- CLICK PULSE --- */}
      {enableCursorFx ? (
        <AnimatePresence>
          {clicks.map((click) => (
            <motion.div key={click.id} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 3 }} exit={{ opacity: 0 }}
              className="fixed pointer-events-none z-[9998] border border-yellow-400/30 rounded-full w-8 h-8" style={{ left: click.x - 16, top: click.y - 16 }} 
            />
          ))}
        </AnimatePresence>
      ) : null}

      <motion.div 
        animate={enableCursorFx ? { opacity: [0.03, 0.06, 0.03] } : undefined}
        transition={enableCursorFx ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ backgroundImage: `radial-gradient(#FACC15 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
      />

      {/* --- NAVIGATION --- */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-180 transition-transform duration-1000 shadow-[0_0_20px_#FACC1544]" size={28} />
            <span className="font-black text-xl tracking-tighter uppercase text-white italic">The Beehive</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {status === "authenticated" ? (
              <div className="flex items-center gap-4">
                {canAccessKnowledge ? (
                  <Link
                    href="/knowledge"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    className="flex items-center gap-2 px-5 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-all"
                  >
                    <BookOpen size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Knowledge Base</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2 bg-white/5 text-neutral-500 border border-white/10 rounded-lg">
                    <Lock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Knowledge Locked</span>
                  </div>
                )}
                {canAccessAdmin && (
                  <Link href="/admin" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                    className="flex items-center gap-2 px-5 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_#ef444433] group">
                    <Shield size={16} className="group-hover:animate-spin-slow" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Command Hub</span>
                  </Link>
                )}
                <div className="hidden md:flex flex-col items-end border-l border-white/10 pl-4">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Neural Agent</span>
                  <span className="text-xs font-black text-white uppercase italic">{session.user?.name}</span>
                </div>
                <button onClick={() => signOut()} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="text-neutral-600 hover:text-white transition p-2">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('discord')} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
                className="bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-[0_0_20px_#FACC1566]">
                Neural Link via Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <motion.div initial="hidden" animate="show" variants={containerVariants}>
          
          {/* --- HERO (SCALED DOWN) --- */}
          <motion.div variants={itemVariants} className="text-center mb-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-yellow-400/5 blur-[160px] pointer-events-none rounded-full" />
            <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 backdrop-blur-md">
              <Wifi size={12} className="text-yellow-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-400">Recruitment Protocol // {SITE_VERSION}</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none text-white drop-shadow-2xl">
              Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600">Hive</span>
            </h1>
            <p className="text-neutral-500 font-bold max-w-2xl mx-auto text-lg leading-relaxed uppercase tracking-widest italic opacity-80">
              Scouting dedicated units for development, moderation, and systemic innovation.
            </p>
          </motion.div>
          
          {/* --- TACTICAL STATS (SCALED DOWN) --- */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-24 max-w-5xl mx-auto">
             {[
               { icon: Users, label: "Total Recruits", val: "4k+", color: "text-neutral-500" },
               { icon: Activity, label: "Units Active", val: "400+", color: "text-green-500", pulse: true },
               { icon: Zap, label: "Core Stability", val: "99.9%", color: "text-yellow-500" }
             ].map((stat, i) => (
               <div key={i} className="bg-neutral-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md hover:border-white/10 transition-all group shadow-inner">
                 <div className={`p-3 bg-black/40 border border-white/5 rounded-2xl mb-4 inline-block ${stat.color} group-hover:shadow-[0_0_15px_currentColor] transition-all`}><stat.icon size={22} /></div>
                 <div>
                    <div className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                       {stat.pulse && (
                         <span className="relative flex h-3 w-3">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                         </span>
                       )}
                       {stat.val}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600 mt-1 group-hover:text-neutral-400 transition-colors">{stat.label}</div>
                 </div>
               </div>
             ))}
          </motion.div>

          {/* --- MISSION ROLES --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {liveRoles.map((role) => {
              const submittedStatus = submittedRoles[role.id];
              const isSubmitted = Boolean(submittedStatus);
              const IconComponent = role.icon;

              return (
                <motion.div
                  key={role.id}
                  variants={itemVariants}
                  onMouseEnter={() => setIsHovering(role.isOpen && !isSubmitted)}
                  onMouseLeave={() => setIsHovering(false)}
                  whileHover={enableCursorFx && role.isOpen && !isSubmitted ? { y: -8, scale: 1.01 } : {}}
                  className={`group bg-[#080808] border p-10 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden ${
                    !role.isOpen
                      ? 'grayscale opacity-30 cursor-not-allowed border-white/5'
                      : isSubmitted
                      ? 'border-yellow-400/20 bg-yellow-400/[0.01]'
                      : 'border-white/5 hover:border-yellow-400/50 hover:shadow-[0_30px_60px_-25px_#FACC1522]'
                  }`}
                >
                  
                  {role.isOpen && !isSubmitted && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  )}

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-12">
                      <div className={`p-5 rounded-2xl transition-all duration-700 ${
                        isSubmitted ? 'bg-yellow-400/10 text-yellow-400' : 
                        'bg-neutral-900 border border-white/5 group-hover:bg-yellow-400 group-hover:text-black group-hover:shadow-[0_0_25px_#FACC1588]'
                      }`}>
                          <IconComponent size={28} />
                      </div>

                      {!role.isOpen ? (
                        <span className="text-[9px] px-3 py-1.5 rounded-full border border-red-500/20 text-red-500 bg-red-500/5 font-black tracking-widest uppercase flex items-center gap-1">
                          <Lock size={10} /> Locked
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-[9px] px-3 py-1.5 rounded-full border border-yellow-400/20 text-yellow-400 bg-yellow-400/5 font-black tracking-widest uppercase flex items-center gap-1">
                          <Clock size={10} /> Already Submitted
                        </span>
                      ) : (
                        <span className={`text-[9px] px-3 py-1.5 rounded-full border font-black tracking-widest uppercase ${
                          role.level === 'HIGH' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 
                          role.level === 'MID' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' : 
                          'border-green-500/30 text-green-500 bg-green-500/5'
                        }`}>{role.level} PRIORITY</span>
                      )}
                    </div>
                    
                    <h3 className="text-3xl font-black mb-3 text-white group-hover:text-yellow-400 transition-colors uppercase italic tracking-tighter">
                      {role.title}
                    </h3>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 mb-8 flex items-center gap-2">
                       <Database size={12} className="text-yellow-500/40" /> Commitment: {role.commitment}
                    </div>

                    <p className="text-neutral-500 text-sm mb-12 leading-relaxed font-bold uppercase tracking-tight line-clamp-3 min-h-[60px] border-l-2 border-white/5 pl-6 group-hover:border-yellow-400/40 transition-colors">
                      {role.description}
                    </p>
                    
                    {isSubmitted ? (
                      <div className="w-full py-5 text-center border border-dashed border-yellow-400/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400/70 italic bg-yellow-400/[0.02]">
                        Already Submitted ({submittedStatus})
                      </div>
                    ) : !role.isOpen ? (
                      <div className="w-full py-5 bg-white/5 border border-white/5 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.3em] text-neutral-700 italic">
                        Node Offline
                      </div>
                    ) : (
                      <Link href={`/apply/${role.id}`} className="block w-full">
                        <div className="group/btn relative w-full flex items-center justify-center py-5 bg-white/[0.04] border border-white/5 hover:bg-yellow-400 text-neutral-400 hover:text-black font-black text-[11px] uppercase tracking-[0.4em] rounded-2xl transition-all duration-300">
                          <span className="relative z-10 flex items-center gap-2 italic">Initiate Handshake <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" /></span>
                        </div>
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 bg-black/80 backdrop-blur-md py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-700 group cursor-default">
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-90 transition-transform duration-1000" size={24} />
            <span className="font-black uppercase tracking-[0.3em] text-[11px] text-white italic">Global Hive Defense // 2026</span>
          </div>

          <div className="flex items-center gap-12">
            {/* CORE STATUS LINK */}
            <Link href="/status" className="text-[10px] font-black uppercase text-neutral-600 hover:text-green-400 transition-all flex items-center gap-3 group">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse group-hover:shadow-[0_0_10px_#22c55e]" /> 
              System Core Integrity
            </Link>
            
            <div className="flex items-center gap-8 border-l border-white/10 pl-12">
              <a href="https://discord.gg/qR6kFuBhCh" target="_blank" rel="noopener noreferrer" className="text-neutral-700 transition-all hover:scale-125 hover:text-[#5865F2]"><DiscordIcon size={24} /></a>
              <a href="https://www.twitch.tv/its_pupbee" target="_blank" rel="noopener noreferrer" className="text-neutral-700 transition-all hover:scale-125 hover:text-[#9146FF]"><Zap size={24} /></a>
              <a href="https://www.tiktok.com/@its_pupbee?lang=en" target="_blank" rel="noopener noreferrer" className="text-neutral-700 transition-all hover:scale-125 hover:text-[#FE2C55]"><Users size={24} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}