"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, FileText, User, 
  CheckCircle2, XSquare, Lock, Unlock, RefreshCw, 
  Power, Activity, Target, PieChart, ExternalLink, Zap
} from 'lucide-react';
import { roles as staticRoleData, getQuestions } from '../data';

// --- CONFIGURATION: AUTHORIZED ADMIN IDS ---
const ADMIN_IDS = [
  "1208908529411301387", // Syn
  "1406555930769756161", 
  "1241945084346372247",
  "845669772926779392",
  "417331086369226752"
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Data State
  const [applications, setApplications] = useState<any[]>([]);
  const [roleSettings, setRoleSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- 1. SURGICAL PRECISION CURSOR (ZERO LAG) ---
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springConfig = { damping: 40, stiffness: 1000, mass: 0.1 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

  // --- 2. DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const appRes = await fetch('/api/admin/applications');
      const apps = await appRes.json();
      if (Array.isArray(apps)) setApplications(apps);

      const roleRes = await fetch('/api/admin/toggle-role');
      const roleData = await roleRes.json();
      const settingsMap: Record<string, boolean> = {};
      if (Array.isArray(roleData)) {
        roleData.forEach((r: any) => settingsMap[r.role_id] = r.is_open);
      }
      setRoleSettings(settingsMap);
    } catch (err) {
      console.error("Satellite Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status]);

  // --- 3. TACTICAL HUD STATS ---
  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    successRate: applications.length > 0 
      ? Math.round((applications.filter(a => a.status === 'approved').length / applications.length) * 100) 
      : 0,
    mostPopular: applications.length > 0 ? Object.entries(
      applications.reduce((acc, curr) => {
        acc[curr.role_title] = (acc[curr.role_title] || 0) + 1;
        return acc;
      }, {} as any)
    ).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A' : 'N/A'
  };

  // --- 4. ACTIONS (FIXED LINK) ---
  const handleDecision = async (id: number, decision: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: id, 
          status: decision 
        }),
      });
      
      if (res.ok) {
        const finalStatus = decision === 'reset' ? 'pending' : decision;
        setApplications(prev => prev.map(app => 
          app.id === id ? { ...app, status: finalStatus } : app
        ));
        if (selectedApp?.id === id) setSelectedApp(null);
      } else {
        const err = await res.json();
        alert(`Satellite uplink rejected: ${err.error || 'Decision Access Denied'}`);
      }
    } catch (error) {
      alert("Neural connection failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleRole = async (roleId: string, currentStatus: boolean) => {
    setRoleSettings(prev => ({ ...prev, [roleId]: !currentStatus }));
    try {
      await fetch('/api/admin/toggle-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, isOpen: !currentStatus }),
      });
    } catch (error) {
      setRoleSettings(prev => ({ ...prev, [roleId]: currentStatus }));
    }
  };

  if (status === "loading" || loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-yellow-500 animate-pulse uppercase tracking-[0.5em]">Establishing Connection...</div>;
  if (!session || !ADMIN_IDS.includes((session.user as any)?.id)) return <div className="min-h-screen bg-black" />;

  const filteredApps = applications.filter(app => 
    app.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-500 selection:text-black relative cursor-none antialiased">
      <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference" style={{ x: cursorX, y: cursorY }}><Hexagon fill="currentColor" size={24} className="opacity-80" /></motion.div>

      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <Hexagon className="text-yellow-500 fill-yellow-500" size={24} />
          <h1 className="text-lg font-black tracking-widest uppercase italic">Hive Admin Hub</h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={fetchData} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
          <div className="text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-l border-white/10 pl-6">{session.user?.name} // CLEARANCE LEVEL 5</div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* STATS HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <Activity className="text-yellow-500" size={32} />
            <div>
              <div className="text-2xl font-black">{stats.pending}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Pending Intel</div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <PieChart className="text-green-500" size={32} />
            <div>
              <div className="text-2xl font-black">{stats.successRate}%</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Approval Rating</div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <Target className="text-blue-500" size={32} />
            <div>
              <div className="text-lg font-black truncate max-w-[150px] uppercase tracking-tighter">{stats.mostPopular}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">High Interest Role</div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-neutral-600 mb-6 flex items-center gap-2"><Power size={12} /> Personnel Recruitment Channels</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {staticRoleData.map(role => {
              const isOpen = roleSettings[role.id] !== false; 
              return (
                <button key={role.id} onClick={() => toggleRole(role.id, isOpen)} className={`p-4 border rounded-xl text-left transition-all ${isOpen ? 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'border-red-500/20 bg-red-500/5 grayscale opacity-50'}`}>
                  <div className="text-[9px] font-black uppercase text-neutral-500 mb-1 truncate">{role.title}</div>
                  <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isOpen ? 'text-green-500' : 'text-red-500'}`}>{isOpen ? <Unlock size={10} /> : <Lock size={10} />} {isOpen ? 'Active' : 'Locked'}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-400">Recruitment Intelligence Logs</h2>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
              <input type="text" placeholder="FILTER BY IDENTITY..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700 font-bold tracking-widest uppercase" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black uppercase text-neutral-500 tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="p-6">Candidate</th>
                <th className="p-6">Objective (Role)</th>
                <th className="p-6">Deployment Status</th>
                <th className="p-6 text-right">Intel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6"><div className="font-black text-sm uppercase italic tracking-tight">{app.username}</div><div className="text-[9px] text-neutral-600">{app.discord_id}</div></td>
                  <td className="p-6"><span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] text-yellow-500/80 font-black uppercase tracking-widest">{app.role_title}</span></td>
                  <td className="p-6">
                    <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'approved' ? 'bg-green-500' : app.status === 'declined' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                       {app.status}
                    </div>
                    <div className="text-[8px] text-neutral-700 italic mt-1 font-bold">{app.audit_note || 'Awaiting Command Decision'}</div>
                  </td>
                  <td className="p-6 text-right"><button onClick={() => setSelectedApp(app)} className="px-5 py-2.5 border border-white/10 hover:border-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg shadow-lg">Review Dossier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && <div className="py-24 text-center text-neutral-800 uppercase font-black tracking-widest text-xs">Zero Records Match Search Parameters</div>}
        </div>
      </main>

      {/* --- ENLARGED DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#080808] border border-white/10 p-8 md:p-12 rounded-[2.5rem] max-w-5xl w-full my-8 relative shadow-[0_0_80px_rgba(0,0,0,1)]">
              <button onClick={() => setSelectedApp(null)} className="absolute top-10 right-10 text-neutral-600 hover:text-white transition-colors hover:rotate-90 duration-300"><XCircle size={32} /></button>
              
              <div className="mb-12 border-b border-white/5 pb-10">
                <div className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2"><Shield size={16} /> Confidential Personnel Intelligence</div>
                <h2 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter mb-4">{selectedApp.username}</h2>
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-bold uppercase tracking-widest"><Target size={14} className="text-yellow-500" /> Target: <span className="text-white">{selectedApp.role_title}</span></div>
                  <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-bold uppercase tracking-widest"><User size={14} className="text-yellow-500" /> ID: <span className="text-neutral-300">#{selectedApp.id}</span></div>
                </div>
              </div>
              
              {/* RESPONSES SECTION (FULL QUESTIONS) */}
              <div className="space-y-6 mb-12">
                {selectedApp.answers && Object.entries(selectedApp.answers).map(([key, value]) => {
                   const roleEntry = staticRoleData.find(r => r.title === selectedApp.role_title);
                   const allQuestions = roleEntry ? getQuestions(roleEntry.id) : [];
                   const questionLabel = allQuestions.find(q => q.id === key)?.label || key;

                   return (
                    <div key={key} className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl group hover:border-yellow-500/20 transition-all shadow-inner">
                      <div className="text-[10px] font-black uppercase text-yellow-500/50 mb-4 tracking-[0.3em] flex items-center gap-2">
                        <Zap size={12} className="group-hover:animate-pulse" /> {questionLabel}
                      </div>
                      <div className="text-white text-lg md:text-xl leading-relaxed font-bold italic border-l-4 border-yellow-500/10 pl-8 group-hover:border-yellow-500 transition-colors whitespace-pre-wrap">
                        "{String(value)}"
                      </div>
                    </div>
                   );
                })}
              </div>
              
              {/* --- ACTION ZONE --- */}
              <div className="flex flex-col gap-6 border-t border-white/5 pt-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'approved')} className="py-6 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-green-500 hover:text-black transition-all shadow-lg hover:scale-[1.02] active:scale-95">
                    {processingId === selectedApp.id ? <RefreshCw className="animate-spin" size={20}/> : <CheckCircle2 size={24}/>} 
                    Authorize Deployment
                  </button>
                  <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'declined')} className="py-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:scale-[1.02] active:scale-95">
                    {processingId === selectedApp.id ? <RefreshCw className="animate-spin" size={20}/> : <XSquare size={24}/>} 
                    Terminate Candidate
                  </button>
                </div>

                {/* THE RESET PROTOCOL (SECOND CHANCE) BUTTON */}
                {selectedApp.status !== 'pending' && (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'reset')} 
                    className="w-full py-5 bg-yellow-500/5 text-yellow-500/60 border border-yellow-500/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.5em] flex items-center justify-center gap-3 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/50 transition-all group"
                  >
                    <RefreshCw size={18} className={processingId === selectedApp.id ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"}/> 
                    Reset Handshake Protocol (Second Chance)
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}