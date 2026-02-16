"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, FileText, User, 
  CheckCircle2, XSquare, Lock, Unlock, RefreshCw, 
  Power, Activity, Target, PieChart, ExternalLink, Zap,
  Terminal, Trash2, Info, ScrollText
} from 'lucide-react';
import { roles as staticRoleData, getQuestions } from '../data';

// --- CONFIGURATION: AUTHORIZED ADMIN IDS ---
const ADMIN_IDS = ["1208908529411301387", "1406555930769756161", "1241945084346372247", "845669772926779392", "417331086369226752"];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [roleSettings, setRoleSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- SURGICAL PRECISION CURSOR ---
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { damping: 40, stiffness: 1000, mass: 0.1 });
  const cursorY = useSpring(mouseY, { damping: 40, stiffness: 1000, mass: 0.1 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => { mouseX.set(e.clientX - 16); mouseY.set(e.clientY - 16); };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

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

  const handleDecision = async (id: number, decision: string) => {
    if (decision === 'purge' && !confirm("CRITICAL: This will permanently delete the application record. The user will be able to apply again. Proceed?")) return;
    
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, status: decision }),
      });
      
      if (res.ok) {
        if (decision === 'purge') {
          setApplications(prev => prev.filter(app => app.id !== id));
        } else {
          const finalStatus = decision === 'reset' ? 'pending' : decision;
          setApplications(prev => prev.map(app => app.id === id ? { ...app, status: finalStatus } : app));
        }
        if (selectedApp?.id === id) setSelectedApp(null);
      } else {
        alert("Satellite uplink rejected the decision.");
      }
    } catch (error) { alert("Action Failed."); } finally { setProcessingId(null); }
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
          <h1 className="text-lg font-black tracking-widest uppercase italic">Hive Command</h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={fetchData} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-l border-white/10 pl-6">{session.user?.name}</div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Recruitment Channels */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-neutral-600 mb-6 flex items-center gap-2 tracking-[0.2em]"><Power size={12} /> Active Channels</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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

        {/* Intelligence Table */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.01]">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-400">Application Database</h2>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-yellow-500" size={14} />
              <input type="text" placeholder="FILTER..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="text-[9px] font-black uppercase text-neutral-500 tracking-widest bg-white/[0.01]">
              <tr>
                <th className="p-6">Identity</th>
                <th className="p-6">Objective</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6"><div className="font-black text-sm uppercase italic">{app.username}</div><div className="text-[9px] text-neutral-600">{app.discord_id}</div></td>
                  <td className="p-6"><span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] text-yellow-500/80 font-black uppercase tracking-widest">{app.role_title}</span></td>
                  <td className="p-6">
                    <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'approved' ? 'bg-green-500' : app.status === 'declined' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                      {app.status}
                    </div>
                  </td>
                  <td className="p-6 text-right"><button onClick={() => setSelectedApp(app)} className="px-5 py-2.5 border border-white/10 hover:border-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg">Review Dossier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- ENLARGED FULL-SCREEN DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row relative">
              
              {/* STICKY SIDEBAR (CANDIDATE INFO) */}
              <div className="md:w-1/3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/5 md:sticky md:top-0 h-fit md:h-screen flex flex-col">
                <button onClick={() => setSelectedApp(null)} className="mb-12 text-neutral-500 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"><XCircle size={20} /> Close Dossier</button>
                
                <div className="mb-12">
                   <div className="text-yellow-500 text-[9px] font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2"><Shield size={14} /> CONFIDENTIAL</div>
                   <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">{selectedApp.username}</h2>
                   <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Target size={14} className="text-yellow-500" /> Target: <span className="text-white">{selectedApp.role_title}</span></div>
                   <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Terminal size={14} className="text-yellow-500" /> ID: <span className="text-neutral-400">#{selectedApp.id}</span></div>
                   <a href={`https://discord.com/users/${selectedApp.discord_id}`} target="_blank" className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-neutral-300"><ExternalLink size={12} /> View Discord Profile</a>
                </div>

                <div className="mt-auto space-y-3">
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="text-[9px] font-black uppercase text-neutral-600 mb-2">Transmission Log</div>
                      <div className="text-[10px] font-bold text-neutral-400 italic">"{selectedApp.audit_note || 'Awaiting Command Decision'}"</div>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3 pt-6 border-t border-white/5">
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'approved')} className="w-full py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-green-500 hover:text-black transition-all">Authorize</button>
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'declined')} className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all">Terminate</button>
                      
                      {selectedApp.status !== 'pending' && (
                        <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'reset')} className="w-full py-3 bg-yellow-500/5 text-yellow-500/50 border border-yellow-500/10 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-yellow-500/10 hover:text-yellow-500 transition-all">Reset Decision</button>
                      )}
                      
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'purge')} className="w-full py-3 bg-red-900/5 text-red-900/50 border border-red-900/10 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all group"><Trash2 size={14} className="group-hover:animate-pulse" /> Purge Record</button>
                   </div>
                </div>
              </div>

              {/* MAIN CONTENT AREA (SCROLLABLE RESPONSES) */}
              <div className="md:w-2/3 p-8 md:p-12 md:py-24">
                <div className="flex items-center gap-2 mb-10 text-neutral-500">
                   <ScrollText size={16} />
                   <span className="text-[10px] font-black uppercase tracking-[0.4em]">Decrypted Candidate Data</span>
                </div>
                
                <div className="space-y-12">
                  {selectedApp.answers && Object.entries(selectedApp.answers).map(([key, value]) => {
                     const roleEntry = staticRoleData.find(r => r.title === selectedApp.role_title);
                     const allQuestions = roleEntry ? getQuestions(roleEntry.id) : [];
                     const questionLabel = allQuestions.find(q => q.id === key)?.label || key;

                     return (
                      <div key={key} className="group relative">
                        <div className="text-[10px] font-black uppercase text-yellow-500/40 mb-4 tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-2">
                          <Zap size={12} /> {questionLabel}
                        </div>
                        <div className="text-white text-xl md:text-2xl leading-relaxed font-bold italic pl-4 border-l border-yellow-500/20 group-hover:border-yellow-500 transition-colors whitespace-pre-wrap">
                          "{String(value)}"
                        </div>
                      </div>
                     );
                  })}
                </div>

                <div className="mt-32 pt-12 border-t border-white/5 text-center">
                   <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-neutral-600 text-[9px] font-black uppercase tracking-widest">
                      <Info size={12} /> End of Intelligence Dossier
                   </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}