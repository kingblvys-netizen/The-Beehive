"use client";

import React, { useState, useEffect } from 'react';
import { 
  Hexagon, ChevronRight, LogOut, Clock, Users, Zap, 
  Activity, Shield, Lock, Unlock 
} from 'lucide-react';
import { signIn, useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { roles } from './data'; // Ensure this file exists
import { motion, AnimatePresence, useMotionValue, useSpring, type Variants } from 'framer-motion';

// --- CONFIGURATION: ADMIN ACCESS LIST ---
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

// --- CUSTOM ICONS ---
const DiscordIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
  </svg>
);

const TwitchIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-12.358-8.776h2.507v7.164h-2.507v-7.164zm8.06 0h2.507v7.164h-2.507v-7.164z"/>
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

  // --- MOUSE PHYSICS ---
  const mouseX = useMotionValue(-100); 
  const mouseY = useMotionValue(-100);
  const springConfig = { damping: 25, stiffness: 200, mass: 0.1 }; // Smoother feel
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Check local storage to see which roles are "Reviewing"
    const saved = localStorage.getItem('beehive_submissions');
    if (saved) setSubmittedRoles(JSON.parse(saved));
  }, []);

  const handleClick = (e: MouseEvent) => {
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

  // ANIMATIONS
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } },
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden selection:bg-yellow-400 selection:text-black cursor-none font-sans">
      
      {/* --- CUSTOM CURSOR --- */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-400 mix-blend-difference"
        style={{ x: cursorX, y: cursorY }}
        animate={{ scale: isHovering ? 1.5 : 1, rotate: isHovering ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }} 
      >
        <Hexagon fill={isHovering ? "currentColor" : "none"} strokeWidth={2} size={32} />
      </motion.div>

      {/* --- CLICK RIPPLES --- */}
      <AnimatePresence>
        {clicks.map((click) => (
          <motion.div key={click.id} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 2 }} exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[9998] border border-yellow-400/50 rounded-full w-8 h-8" style={{ left: click.x - 16, top: click.y - 16 }} 
          />
        ))}
      </AnimatePresence>

      {/* --- BACKGROUND GRID --- */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '32px 32px' }} 
      />

      {/* --- NAV --- */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-180 transition-transform duration-700" size={28} />
            <span className="font-black text-xl tracking-tighter uppercase text-white">The Beehive</span>
          </Link>
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <div className="flex items-center gap-4">
                
                {/* ADMIN BUTTON */}
                {ADMIN_IDS.includes((session.user as any)?.id) && (
                  <Link href="/admin" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} 
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all group shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <Shield size={16} className="group-hover:animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
                  </Link>
                )}

                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Operator</span>
                  <span className="text-xs font-bold text-white uppercase">{session.user?.name}</span>
                </div>
                <button onClick={() => signOut()} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="text-neutral-500 hover:text-white transition p-2 hover:bg-white/10 rounded-lg">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('discord')} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
                className="bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-yellow-300 transition shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <motion.div initial="hidden" animate="show" variants={containerVariants}>
          
          {/* --- HERO SECTION --- */}
          <motion.div variants={itemVariants} className="text-center mb-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-400/5 blur-[120px] pointer-events-none rounded-full" />
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400">Recruitment Portal // 2026</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 leading-none text-white drop-shadow-2xl">
              The Beehive <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">Apps</span>
            </h1>
            <p className="text-neutral-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Join the collective. We are scouting for dedicated individuals to help build, moderate, and innovate within our ecosystem.
            </p>
          </motion.div>
          
          {/* --- STATS HUD --- */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24 max-w-5xl mx-auto">
             <div className="bg-neutral-900/40 border border-white/5 p-6 rounded-2xl flex items-center gap-5 backdrop-blur-sm hover:border-white/10 transition-colors">
               <div className="p-3 bg-white/5 rounded-xl text-neutral-200"><Users size={24} /></div>
               <div>
                  <div className="text-3xl font-black text-white">4k+</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Members</div>
               </div>
             </div>

             <div className="bg-neutral-900/40 border border-white/5 p-6 rounded-2xl flex items-center gap-5 backdrop-blur-sm hover:border-green-500/20 transition-colors group">
               <div className="p-3 bg-green-500/10 rounded-xl text-green-500"><Activity size={24} /></div>
               <div>
                  <div className="text-3xl font-black text-white flex items-center gap-3">
                     <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                     </span>
                     400+
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-green-500 transition-colors">Users Online</div>
               </div>
             </div>

             <div className="bg-neutral-900/40 border border-white/5 p-6 rounded-2xl flex items-center gap-5 backdrop-blur-sm hover:border-yellow-400/20 transition-colors">
               <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400"><Zap size={24} /></div>
               <div>
                  <div className="text-3xl font-black text-white">99.9%</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Uptime</div>
               </div>
             </div>
          </motion.div>

          {/* --- ROLES GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => {
              const isPending = submittedRoles.includes(role.id);
              const IconComponent = role.icon;

              return (
                <motion.div key={role.id} variants={itemVariants} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
                  whileHover={role.isOpen && !isPending ? { y: -5 } : {}}
                  className={`group bg-[#0a0a0a] border p-8 rounded-[2rem] transition-all duration-300 relative overflow-hidden ${
                    !role.isOpen ? 'grayscale opacity-50 cursor-not-allowed border-white/5' : 
                    isPending ? 'border-yellow-400/20 opacity-80' : 'border-white/5 hover:border-yellow-400/50 hover:shadow-[0_20px_40px_-10px_rgba(250,204,21,0.1)]'
                  }`}>
                  
                  {/* Hover Glow Effect */}
                  {role.isOpen && !isPending && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  )}

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className={`p-4 rounded-2xl ${
                        isPending ? 'bg-yellow-400/10 text-yellow-400' : 
                        'bg-neutral-900 border border-white/10 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-300'
                      }`}>
                          <IconComponent size={24} />
                      </div>

                      {!role.isOpen ? (
                        <span className="text-[9px] px-3 py-1.5 rounded-full border border-red-500/20 text-red-500 bg-red-500/5 font-black tracking-widest uppercase flex items-center gap-1">
                          <Lock size={10} /> Locked
                        </span>
                      ) : isPending ? (
                        <span className="text-[9px] px-3 py-1.5 rounded-full border border-yellow-400/20 text-yellow-400 bg-yellow-400/5 font-black tracking-widest uppercase flex items-center gap-1">
                          <Clock size={10} /> Pending
                        </span>
                      ) : (
                        <span className={`text-[9px] px-3 py-1.5 rounded-full border font-black tracking-widest uppercase ${
                          role.level === 'HIGH' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 
                          role.level === 'MID' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' : 
                          'border-green-500/30 text-green-500 bg-green-500/5'
                        }`}>{role.level}</span>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-black mb-2 text-white group-hover:text-yellow-400 transition-colors uppercase italic">{role.title}</h3>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
                       <Clock size={12} /> {role.commitment}
                    </div>

                    <p className="text-neutral-400 text-sm mb-8 leading-relaxed line-clamp-2 min-h-[40px] font-medium border-l-2 border-white/5 pl-4 group-hover:border-yellow-400/50 transition-colors">
                      {role.description}
                    </p>
                    
                    {isPending ? (
                      <div className="w-full py-4 text-center bg-yellow-400/5 border border-yellow-400/10 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-yellow-400/80 italic">
                        Under Review
                      </div>
                    ) : !role.isOpen ? (
                      <div className="w-full py-4 bg-white/5 border border-white/5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-neutral-600">
                        Applications Closed
                      </div>
                    ) : (
                      <Link href={`/apply/${role.id}`} className="block w-full">
                        <div className="group/btn relative w-full flex items-center justify-center py-4 bg-white/5 hover:bg-yellow-400 text-neutral-300 hover:text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all duration-300">
                          <span className="flex items-center gap-2">Initiate <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" /></span>
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
      <footer className="border-t border-white/5 bg-black/90 backdrop-blur-md py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
            <Hexagon className="text-yellow-400 fill-yellow-400" size={20} />
            <span className="font-bold uppercase tracking-widest text-xs text-white">The Beehive © 2026</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://discord.gg/qR6kFuBhCh" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors hover:scale-110 transform duration-200">
              <DiscordIcon size={24} />
            </a>
            <a href="https://www.twitch.tv/its_pupbee" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-[#9146FF] transition-colors hover:scale-110 transform duration-200">
              <TwitchIcon size={24} />
            </a>
            <a href="https://www.tiktok.com/@its_pupbee?lang=en" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-[#FE2C55] transition-colors hover:scale-110 transform duration-200">
              <TikTokIcon size={24} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}