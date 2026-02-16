"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Hexagon, ChevronRight, LogOut, Clock, Users, Zap, 
  Twitch, Activity, Shield 
} from 'lucide-react';
import { signIn, useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { roles } from './data';
import { motion, AnimatePresence, Variants, useMotionValue, useSpring } from 'framer-motion';

// --- CONFIGURATION: ADMIN ACCESS LIST ---
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

// --- CUSTOM BRAND ICONS ---
const DiscordIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
  </svg>
);

const TikTokIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
  </svg>
);

export default function Home() {
  const { data: session, status } = useSession();
  const [isHovering, setIsHovering] = useState(false);
  const [submittedRoles, setSubmittedRoles] = useState<string[]>([]);
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);

  // --- OPTIMIZED CURSOR (NO LAG) ---
  const mouseX = useMotionValue(-100); 
  const mouseY = useMotionValue(-100);
  const springConfig = { damping: 50, stiffness: 1500, mass: 0.1 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  // --- AUDIO REFS ---
  const hoverSound = useRef<HTMLAudioElement | null>(null);
  const clickSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Audio (Optional: Uncomment .play() calls below if you have files)
    if (typeof window !== 'undefined') {
      hoverSound.current = new Audio('/sounds/hover.mp3'); 
      hoverSound.current.volume = 0.2;
      clickSound.current = new Audio('/sounds/click.mp3');
      clickSound.current.volume = 0.4;
    }

    const saved = localStorage.getItem('beehive_submissions');
    if (saved) setSubmittedRoles(JSON.parse(saved));
  }, []);

  const playHover = () => {
    setIsHovering(true);
    // if (hoverSound.current) { hoverSound.current.currentTime = 0; hoverSound.current.play().catch(() => {}); }
  };

  const handleClick = (e: MouseEvent) => {
    // if (clickSound.current) { clickSound.current.currentTime = 0; clickSound.current.play().catch(() => {}); }
    const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
    setClicks((prev) => [...prev, newClick]);
    setTimeout(() => setClicks((prev) => prev.filter((c) => c.id !== newClick.id)), 600);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [mouseX, mouseY]);

  // Animation Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.3 } 
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } },
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-yellow-400 selection:text-black cursor-none font-sans">
      
      {/* --- CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] mix-blend-difference"
        style={{ x: cursorX, y: cursorY }}
        animate={{ scale: isHovering ? 1.5 : 1, rotate: isHovering ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }} 
      >
        <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} className="opacity-90" />
      </motion.div>

      {/* --- CLICK PARTICLES --- */}
      <AnimatePresence>
        {clicks.map((click) => (
          <motion.div key={click.id} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 3 }} exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[9998] text-yellow-400/30" style={{ left: click.x - 16, top: click.y - 16 }}>
            <Hexagon size={32} strokeWidth={1} />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' stroke-width='2' fill='none'/%3E%3C/svg%3E")` }} 
      />

      {/* --- NAV --- */}
      <nav className="border-b border-white/10 bg-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onMouseEnter={playHover} onMouseLeave={() => setIsHovering(false)}>
            <Hexagon className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={28} />
            <span className="font-bold text-xl tracking-tight uppercase text-white">The Beehive</span>
          </Link>
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <div className="flex items-center gap-4">
                
                {/* --- ADMIN BUTTON (Visible to Authorized IDs) --- */}
                {ADMIN_IDS.includes((session.user as any)?.id) && (
                  <Link href="/admin" onMouseEnter={playHover} onMouseLeave={() => setIsHovering(false)} 
                    className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 group">
                    <Shield size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block animate-in fade-in zoom-in duration-200">Admin</span>
                  </Link>
                )}

                <span className="font-bold text-xs uppercase tracking-widest hidden md:block text-neutral-500">Welcome, {session.user?.name}</span>
                <button onClick={() => signOut()} onMouseEnter={playHover} onMouseLeave={() => setIsHovering(false)} className="text-neutral-500 hover:text-white transition p-2 hover:bg-white/5 rounded-full">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('discord')} onMouseEnter={playHover} onMouseLeave={() => setIsHovering(false)}
                className="bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-yellow-300 transition shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <motion.div initial="hidden" animate="show" variants={containerVariants}>
          
          <motion.div variants={itemVariants} className="text-center mb-24 relative">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }} 
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400/10 blur-[120px] pointer-events-none" 
            />
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400/80">Recruitment Portal</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none text-white">
              The Beehive <span className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.4)]">Applications</span>
            </h1>
            <p className="text-neutral-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Join the hive. We are looking for dedicated individuals to help build, moderate, and innovate within our growing ecosystem.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24 max-w-4xl mx-auto">
             <div className="bg-neutral-900/30 border border-white/10 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-sm group hover:border-yellow-400/30 transition-colors">
               <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400"><Users size={24} /></div>
               <div>
                  <div className="text-2xl font-black text-white">4k+</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Members</div>
               </div>
             </div>

             <div className="bg-neutral-900/30 border border-white/10 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-sm group hover:border-yellow-400/30 transition-colors">
               <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400"><Activity size={24} /></div>
               <div>
                  <div className="text-2xl font-black text-green-400 flex items-center gap-2">
                     <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                     </span>
                     400+
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Users Online</div>
               </div>
             </div>

             <div className="bg-neutral-900/30 border border-white/10 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-sm group hover:border-yellow-400/30 transition-colors">
               <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400"><Zap size={24} /></div>
               <div><div className="text-2xl font-black text-white">99.9%</div><div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Uptime</div></div>
             </div>
          </motion.div>

          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => {
              const isPending = submittedRoles.includes(role.id);
              const IconComponent = role.icon;

              return (
                <motion.div key={role.id} variants={itemVariants} onMouseEnter={playHover} onMouseLeave={() => setIsHovering(false)}
                  whileHover={!isPending ? { y: -8, scale: 1.02 } : {}}
                  className={`group bg-neutral-900/40 border p-8 rounded-[2rem] transition-all duration-300 relative overflow-hidden ${
                    isPending ? 'border-yellow-400/20 opacity-80' : 'border-white/10 hover:border-yellow-400/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
                  }`}>
                  
                  {!isPending && <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-400/5 blur-[80px] group-hover:bg-yellow-400/10 transition-colors" />}
                  
                  <div className="flex justify-between items-start mb-8">
                    <div className={`p-4 rounded-2xl ${isPending ? 'bg-yellow-400/5 text-yellow-400/50' : 'bg-black border border-white/10 group-hover:border-yellow-400/30 group-hover:text-yellow-400 transition-colors'}`}>
                        <IconComponent size={24} className="text-white group-hover:text-yellow-400 transition-colors" />
                    </div>

                    {isPending ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-yellow-400/30 text-yellow-400 bg-yellow-400/5 font-black tracking-widest uppercase"><Clock size={10} /> Pending</span>
                    ) : (
                      <span className={`text-[10px] px-2 py-1 rounded border font-black tracking-widest uppercase ${
                        role.level === 'HIGH' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 
                        role.level === 'MID' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' : 
                        'border-green-500/30 text-green-500 bg-green-500/5'
                      }`}>{role.level}</span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black mb-2 text-white group-hover:text-yellow-400 transition-colors">{role.title}</h3>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                     <Clock size={12} /> {role.commitment}
                  </div>

                  <p className="text-neutral-400 text-sm mb-8 leading-relaxed line-clamp-2 min-h-[40px] font-medium">{role.description}</p>
                  
                  {isPending ? (
                    <div className="w-full py-4 text-center border border-dashed border-yellow-400/30 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-yellow-400/60 italic">
                      Application under review
                    </div>
                  ) : (
                    <Link href={`/apply/${role.id}`} className="group/btn relative w-full inline-flex items-center justify-center py-4 bg-black/50 border border-white/10 hover:border-yellow-400/50 text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl transition-all overflow-hidden">
                      <div className="absolute inset-0 bg-yellow-400/0 group-hover/btn:bg-yellow-400/10 transition-colors" />
                      <span className="relative z-10 flex items-center gap-2">Start Application <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" /></span>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </main>

      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
            <Hexagon className="text-yellow-400 fill-yellow-400" size={20} />
            <span className="font-bold uppercase tracking-widest text-xs text-white">The Beehive © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://discord.gg/qR6kFuBhCh" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-yellow-400 transition-colors group">
              <DiscordIcon size={24} className="group-hover:scale-110 transition-transform" />
            </a>
            <a href="https://www.twitch.tv/its_pupbee" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-yellow-400 transition-colors group">
              <Twitch size={24} className="group-hover:scale-110 transition-transform" />
            </a>
            <a href="https://www.tiktok.com/@its_pupbee?lang=en" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-yellow-400 transition-colors group">
              <TikTokIcon size={24} className="group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}