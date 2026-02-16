"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, CheckCircle2, XSquare, 
  RefreshCw, Power, Target, ExternalLink, Zap, Trash2, User, Lock, Unlock 
} from 'lucide-react';
import { roles as staticRoleData, getQuestions } from '../data';

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

  // Snappy Cursor Logic
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { damping: 40, stiffness: 1000, mass: 0.1 });
  const cursorY = useSpring(mouseY, { damping: 40, stiffness: 1000, mass: 0.1 });

  useEffect(() => {
    const move = (e: MouseEvent) => { mouseX.set(e.clientX - 16); mouseY.set(e.clientY - 16); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
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
      if (Array.isArray(roleData)) roleData.forEach((r: any) => settingsMap[r.role_id] = r.is_open);
      setRoleSettings(settingsMap);
    } catch (err) { console.error("Sync Error"); } finally { setLoading(false); }
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const handleDecision = async (id: number, decision: string) => {
    if (decision === 'purge' && !confirm("Permanently delete this record? User can re-apply immediately.")) return;
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, status: decision }),
      });
      if (res.ok) {
        if (decision === 'purge') setApplications(prev => prev.filter(app => app.id !== id));
        else {
          const finalS = decision === 'reset' ? 'pending' : decision;
          setApplications(prev => prev.map(app => app.id === id ? { ...app, status: finalS } : app));
        }
        setSelectedApp(null);
      }
    } catch (error) { alert("Link Error"); } finally { setProcessingId(null); }
  };

  const toggleRole = async (roleId: string, currentStatus: boolean) => {
    setRoleSettings(prev => ({ ...prev, [roleId]: !currentStatus }));
    fetch('/api/admin/toggle-role', { method: 'POST', body: JSON.stringify({ roleId, isOpen: !currentStatus }) });
  };

  if (status === "loading" || loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-yellow-500 animate-pulse uppercase tracking-widest">Neural Link Connecting...</div>;
  if (!session || !ADMIN_IDS.includes((session.user as any)?.id)) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-500 selection:text-black relative cursor-none antialiased">
      <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference" style={{ x: cursorX, y: cursorY }}><Hexagon fill="currentColor" size={24} /></motion.div>

      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}><Hexagon className="text-yellow-500 fill-yellow-400" size={20} /><h1 className="text-sm font-black tracking-widest uppercase italic">Hive Command</h1></div>
        <button onClick={fetchData} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
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

        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-400">Intelligence Data Feed</h2>
            <input type="text" placeholder="FILTER BY IDENTITY..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 bg-black border border-white/10 rounded-xl py-2 px-4 text-[10px] focus:border-yellow-500 outline-none" />
          </div>
          <table className="w-full text-left">
            <thead className="text-[9px] font-black uppercase text-neutral-500 tracking-widest bg-white/[0.01] border-b border-white/5">
              <tr><th className="p-6">Identity</th><th className="p-6">Objective</th><th className="p-6">System Status</th><th className="p-6 text-right">Intel</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {applications.filter(app => app.username?.toLowerCase().includes(searchTerm.toLowerCase())).map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6"><div className="font-black text-sm uppercase italic tracking-tight">{app.username}</div><div className="text-[9px] text-neutral-600">{app.discord_id}</div></td>
                  <td className="p-6"><span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] text-yellow-500/80 font-black uppercase tracking-widest">{app.role_title}</span></td>
                  <td className="p-6">
                    <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'approved' ? 'bg-green-500' : app.status === 'declined' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                       {app.status}
                    </div>
                  </td>
                  <td className="p-6 text-right"><button onClick={() => setSelectedApp(app)} className="px-5 py-2.5 border border-white/10 hover:border-yellow-500 text-[10px] font-black uppercase rounded-lg transition-all shadow-lg">Review Dossier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/98 z-50 flex overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row relative">
              
              {/* SIDEBAR: ACTION ZONE */}
              <div className="md:w-1/3 p-12 border-r border-white/5 h-fit md:h-screen md:sticky md:top-0 bg-black flex flex-col">
                <button onClick={() => setSelectedApp(null)} className="mb-12 text-neutral-600 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"><XCircle size={20} /> Close Dossier</button>
                <div className="mb-12">
                   <div className="text-yellow-500 text-[9px] font-black uppercase tracking-[0.5em] mb-4">Confidential Intel</div>
                   <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">{selectedApp.username}</h2>
                   <div className="space-y-2">
                     <div className="flex items-center gap-3 text-neutral-500 text-[11px] font-bold uppercase tracking-widest"><Target size={14} className="text-yellow-500" /> Target: <span className="text-white">{selectedApp.role_title}</span></div>
                     <div className="flex items-center gap-3 text-neutral-500 text-[11px] font-bold uppercase tracking-widest"><User size={14} className="text-yellow-500" /> ID: <span className="text-neutral-300">#{selectedApp.id}</span></div>
                   </div>
                   <a href={`https://discord.com/users/${selectedApp.discord_id}`} target="_blank" className="mt-8 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"><ExternalLink size={12} /> View Identity</a>
                </div>

                <div className="mt-auto space-y-3 pt-12 border-t border-white/5">
                   <div className="grid grid-cols-1 gap-3">
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'approved')} className="w-full py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-black uppercase text-[11px] hover:bg-green-500 hover:text-black transition-all">Authorize</button>
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'declined')} className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[11px] hover:bg-red-500 hover:text-white transition-all">Terminate</button>
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'reset')} className="w-full py-3 bg-yellow-500/5 text-yellow-500/50 border border-yellow-500/10 rounded-xl font-black uppercase text-[10px] hover:bg-yellow-500/20 hover:text-yellow-500 transition-all">Reset Status</button>
                      <button disabled={processingId === selectedApp.id} onClick={() => handleDecision(selectedApp.id, 'purge')} className="w-full py-3 bg-red-900/5 text-red-900/50 border border-red-900/10 rounded-xl font-black uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"><Trash2 size={14} /> Purge Record</button>
                   </div>
                </div>
              </div>

              {/* MAIN CONTENT: FULL QUESTIONS */}
              <div className="md:w-2/3 p-12 md:p-24 bg-[#080808]">
                <div className="space-y-16">
                  {selectedApp.answers && Object.entries(selectedApp.answers).map(([key, value]) => {
                     // 1. Map role title to role ID
                     const roleMatch = staticRoleData.find(r => r.title === selectedApp.role_title);
                     // 2. Fetch full question labels using role ID
                     const allQs = roleMatch ? getQuestions(roleMatch.id) : [];
                     // 3. Find specific label or fallback to key
                     const questionLabel = allQs.find(q => q.id === key)?.label || key.replace(/_/g, ' ');

                     return (
                      <div key={key} className="group border-l-2 border-white/5 pl-8 hover:border-yellow-500 transition-all">
                        <div className="text-[11px] font-black uppercase text-yellow-500/40 mb-6 tracking-[0.3em] flex items-center gap-3 italic">
                          <Zap size={12} /> {questionLabel}
                        </div>
                        <div className="text-white text-2xl font-bold italic opacity-90 whitespace-pre-wrap leading-relaxed group-hover:opacity-100 transition-opacity">
                          "{String(value)}"
                        </div>
                      </div>
                     );
                  })}
                  
                  <div className="pt-24 border-t border-white/5 text-center text-[10px] font-black uppercase text-neutral-700 tracking-widest">
                    End of Confidential Intelligence Log
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