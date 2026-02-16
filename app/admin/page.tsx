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

// --- CONFIGURATION: AUTHORIZED ADMINS ---
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

  // --- 1. ZERO-LAG CURSOR ---
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { damping: 40, stiffness: 1000, mass: 0.1 });
  const cursorY = useSpring(mouseY, { damping: 40, stiffness: 1000, mass: 0.1 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => { mouseX.set(e.clientX - 16); mouseY.set(e.clientY - 16); };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

  // --- 2. DATA SYNC (LIVE STATUS) ---
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
    } catch (err) { console.error("Sync Error:", err); } finally { setLoading(false); }
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  // --- 3. DECISION LOGIC (FIXED LINK) ---
  const handleDecision = async (id: number, decision: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: id, // Correct key for backend
          status: decision    // Correct key for backend
        }),
      });
      
      if (res.ok) {
        const finalStatus = decision === 'reset' ? 'pending' : decision;
        setApplications(prev => prev.map(app => 
          app.id === id ? { ...app, status: finalStatus } : app
        ));
        if (selectedApp?.id === id) setSelectedApp(null);
      } else {
        alert("Satellite uplink rejected the decision. Check API connectivity.");
      }
    } catch (error) {
      alert("Neural connection failure.");
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
    } catch (error) { setRoleSettings(prev => ({ ...prev, [roleId]: currentStatus })); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-yellow-500 animate-pulse uppercase tracking-[0.5em]">Establishing Connection...</div>;
  
  if (!session || !ADMIN_IDS.includes((session.user as any)?.id)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8">
        <Shield size={64} className="text-red-500 mb-6" />
        <h1 className="text-white font-black uppercase tracking-widest text-2xl">Access Denied</h1>
        <button onClick={() => router.push('/')} className="mt-8 px-6 py-2 border border-white/20 rounded-lg text-neutral-400 text-xs uppercase font-black hover:bg-white/5 transition-all">Return to Hub</button>
      </div>
    );
  }

  const filteredApps = applications.filter(app => 
    app.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-500 selection:text-black relative cursor-none antialiased">
      
      {/* CURSOR */}
      <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference" style={{ x: cursorX, y: cursorY }}>
        <Hexagon fill="currentColor" size={24} className="opacity-80" />
      </motion.div>

      {/* NAV */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <Hexagon className="text-yellow-500 fill-yellow-500" size={24} />
          <h1 className="text-lg font-black tracking-widest uppercase italic">Hive Command Hub</h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={fetchData} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="text-right">
             <div className="text-[9px] font-black text-green-500 uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Linked</div>
             <div className="text-xs font-bold text-neutral-400">{session.user?.name}</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* RECRUITMENT CONTROLS */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-neutral-600 mb-6 flex items-center gap-2"><Power size={12} /> Recruitment Channels</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {staticRoleData.map(role => {
              const isOpen = roleSettings[role.id] !== false; 
              return (
                <button key={role.id} onClick={() => toggleRole(role.id, isOpen)} className={`p-4 border rounded-xl text-left transition-all ${isOpen ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 grayscale opacity-50'}`}>
                  <div className="text-[9px] font-black uppercase text-neutral-500 mb-1 truncate">{role.title}</div>
                  <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isOpen ? 'text-green-500' : 'text-red-500'}`}>{isOpen ? <Unlock size={10} /> : <Lock size={10} />} {isOpen ? 'Open' : 'Locked'}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* LOGS TABLE */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Intelligence Data Feed</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
              <input type="text" placeholder="FILTER ENTRIES..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] focus:border-yellow-500 outline-none transition-all" />
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] font-black uppercase text-neutral-500 tracking-widest border-b border-white/5">
                <th className="p-6">Identity</th>
                <th className="p-6">Objective (Role)</th>
                <th className="p-6">System Status</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6">
                    <div className="font-black text-sm uppercase italic">{app.username}</div>
                    <a href={`https://discord.com/users/${app.discord_id}`} target="_blank" className="text-[9px] text-neutral-600 hover:text-blue-400 flex items-center gap-1 mt-1">{app.discord_id} <ExternalLink size={10} /></a>
                  </td>
                  <td className="p-6">
                    <span className="bg-white/5 border border-white/5 px-3 py-1 rounded text-[10px] text-yellow-500/70 font-black uppercase tracking-widest">{app.role_title}</span>
                  </td>
                  <td className="p-6">
                    <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'approved' ? 'bg-green-500' : app.status === 'declined' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                       {app.status}
                    </div>
                    <div className="text-[8px] text-neutral-700 italic mt-1">{app.audit_note || 'Awaiting Review'}</div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setSelectedApp(app)} className="px-5 py-2 border border-white/10 hover:border-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all">Review Dossier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && <div className="py-24 text-center text-neutral-800 uppercase font-black tracking-widest text-xs">Zero Records Found in Local Node</div>}
        </div>
      </main>

      {/* --- ENLARGED DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <button onClick={() => setSelectedApp(null)} className="absolute top-8 right-8 text-neutral-600 hover:text-white transition-colors"><XCircle size={28} /></button>
              
              <div className="mb-12 flex justify-between items-end border-b border-white/5 pb-8">
                <div>
                  <div className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><Shield size={14} /> Confidential Recruitment Dossier</div>
                  <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2">{selectedApp.username}</h2>
                  <div className="flex gap-4">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Target Objective: <span className="text-white">{selectedApp.role_title}</span></span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Hash ID: <span className="text-neutral-400">#{selectedApp.id}</span></span>
                  </div>
                </div>
              </div>
              
              {/* EXPANDED ANSWERS SECTION */}
              <div className="grid grid-cols-1 gap-6 mb-12">
                {selectedApp.answers && Object.entries(selectedApp.answers).map(([key, value]) => {
                   const roleConfig = staticRoleData.find(r => r.title === selectedApp.role_title);
                   const allQuestions = roleConfig ? getQuestions(roleConfig.id) : [];
                   const questionLabel = allQuestions.find(q => q.id === key)?.label || key;
                   return (
                    <div key={key} className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl group hover:border-yellow-500/20 transition-all">
                      <div className="text-[10px] font-black uppercase text-yellow-500/50 mb-4 tracking-[0.2em] flex items-center gap-2">
                        <Zap size={10} /> {questionLabel}
                      </div>
                      <div className="text-white text-lg leading-relaxed font-bold italic border-l-2 border-white/10 pl-6 group-hover:border-yellow-500 transition-colors">
                        "{String(value)}"
                      </div>
                    </div>
                   );
                })}
              </div>
              
              {/* --- ACTION ZONE --- */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-10">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'approved')} 
                    className="py-5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-green-500 hover:text-black transition-all shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                  >
                    <CheckCircle2 size={20}/> Approve Recuit
                  </button>
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'declined')} 
                    className="py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                  >
                    <XSquare size={20}/> Decline Recruit
                  </button>
                </div>

                {/* THE RESET BUTTON (Found at the bottom for any decided app) */}
                {selectedApp.status !== 'pending' && (
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'reset')} 
                    className="w-full py-4 bg-white/5 text-neutral-500 border border-white/10 rounded-xl font-black uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/50 transition-all group"
                  >
                    <RefreshCw size={16} className={processingId === selectedApp.id ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}/> 
                    Reset Handshake Protocol (Clear Log)
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}