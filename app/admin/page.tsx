"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, FileText, User, 
  Calendar, CheckCircle2, XSquare, Lock, Unlock, RefreshCw, 
  AlertTriangle, Power, Filter, Activity, Target, PieChart, ExternalLink
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
  // Re-tuned for instant hardware tracking
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

  // --- 2. DATA FETCHING (SATELLITE SYNC) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Apps
      const appRes = await fetch('/api/admin/applications');
      const apps = await appRes.json();
      if (Array.isArray(apps)) setApplications(apps);

      // Fetch Role Locks
      const roleRes = await fetch('/api/admin/toggle-role');
      const roleData = await roleRes.json();
      const settingsMap: Record<string, boolean> = {};
      if (Array.isArray(roleData)) {
        roleData.forEach((r: any) => settingsMap[r.role_id] = r.is_open);
      }
      setRoleSettings(settingsMap);
    } catch (err) {
      console.error("Fetch Error:", err);
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

  // --- 4. ACTIONS (APPROVE, DECLINE, RESET) ---
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
        alert("Satellite uplink rejected the decision.");
      }
    } catch (error) {
      alert("Action Failed: Connection to Hive Core lost.");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleRole = async (roleId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setRoleSettings(prev => ({ ...prev, [roleId]: !currentStatus }));
    try {
      await fetch('/api/admin/toggle-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, isOpen: !currentStatus }),
      });
    } catch (error) {
      setRoleSettings(prev => ({ ...prev, [roleId]: currentStatus }));
      alert("Failed to update recruitment channel.");
    }
  };

  // ACCESS GATE
  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <RefreshCw className="text-yellow-500 animate-spin" size={48} />
      <span className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Tactical Data...</span>
    </div>
  );

  if (!session || !ADMIN_IDS.includes((session.user as any)?.id)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black uppercase tracking-widest">Access Forbidden</h1>
        <button onClick={() => router.push('/')} className="mt-8 px-8 py-3 border border-white/10 rounded font-bold uppercase text-[10px]">Exit Hub</button>
      </div>
    );
  }

  const filteredApps = applications.filter(app => 
    app.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.discord_id?.includes(searchTerm) ||
    app.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-500 selection:text-black relative cursor-none antialiased">
      
      {/* CURSOR */}
      <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference" style={{ x: cursorX, y: cursorY }}>
        <Hexagon fill="currentColor" size={24} className="opacity-80" />
      </motion.div>

      {/* NAV */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <Hexagon className="text-yellow-500 fill-yellow-500" size={24} />
            <h1 className="text-lg font-black tracking-widest uppercase italic">Hive Command Hub</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={fetchData} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="text-right">
              <div className="text-[9px] font-black text-green-500 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Connected
              </div>
              <div className="text-xs font-bold text-neutral-400">{session.user?.name}</div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* --- TACTICAL HUD --- */}
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
              <div className="text-lg font-black truncate max-w-[150px] uppercase">{stats.mostPopular}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">High Interest Role</div>
            </div>
          </div>
        </div>

        {/* RECRUITMENT CHANNEL CONTROLS */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-6 flex items-center gap-2">
            <Power size={12} /> Recruitment Channels (Lock/Unlock)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {staticRoleData.map(role => {
              const isOpen = roleSettings[role.id] !== false; 
              return (
                <button key={role.id} onClick={() => toggleRole(role.id, isOpen)} className={`p-4 border rounded-xl text-left transition-all ${isOpen ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 grayscale opacity-50'}`}>
                  <div className="text-[9px] font-black uppercase text-neutral-500 mb-1 truncate">{role.title}</div>
                  <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                    {isOpen ? <Unlock size={10} /> : <Lock size={10} />} {isOpen ? 'Open' : 'Locked'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH & TABLE */}
        <div className="mb-8 relative max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input 
            type="text" 
            placeholder="SEARCH DATABASE..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-6 text-sm focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700 text-white font-bold uppercase tracking-widest"
          />
        </div>

        {/* DATA TABLE */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                <th className="p-6">Identity</th>
                <th className="p-6">Assignment</th>
                <th className="p-6">Decision Log</th>
                <th className="p-6 text-right">Intel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-white text-sm uppercase italic">{app.username}</div>
                    <a href={`https://discord.com/users/${app.discord_id}`} target="_blank" className="text-[10px] text-neutral-600 hover:text-blue-400 flex items-center gap-1 mt-1 transition-colors">
                      {app.discord_id} <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="p-6">
                    <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px] text-neutral-400 font-bold uppercase">{app.role_title}</span>
                  </td>
                  <td className="p-6">
                    <div className={`text-[10px] font-bold uppercase mb-1 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>{app.status}</div>
                    <div className="text-[8px] text-neutral-600 italic font-medium">{app.audit_note || 'Awaiting Command Review'}</div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setSelectedApp(app)} className="px-4 py-2 border border-white/10 hover:border-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && <div className="py-24 text-center text-neutral-700 uppercase font-black tracking-widest text-xs opacity-50">Zero Records Found</div>}
        </div>
      </main>

      {/* --- DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl">
              <button onClick={() => setSelectedApp(null)} className="absolute top-8 right-8 text-neutral-600 hover:text-white"><XCircle size={24} /></button>
              
              <div className="mb-10">
                <div className="text-yellow-500 text-[9px] font-black uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><Shield size={12} /> Confidential Intelligence</div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">{selectedApp.username}</h2>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Applying for: <span className="text-white">{selectedApp.role_title}</span></div>
              </div>
              
              <div className="space-y-4 mb-10">
                {(() => {
                  const answersObj = normalizeAnswers(
                    selectedApp.answers ?? selectedApp.responses ?? selectedApp.application_answers
                  );
                  const answerEntries = Object.entries(answersObj);

                  const roleConfig = staticRoleData.find((r) =>
                    (selectedApp.role_id && r.id === selectedApp.role_id) ||
                    r.title.trim().toLowerCase() === String(selectedApp.role_title ?? '').trim().toLowerCase()
                  );
                  const allQuestions = roleConfig ? getQuestions(roleConfig.id) : [];

                  if (answerEntries.length === 0) {
                    return (
                      <div className="text-xs text-neutral-500 uppercase tracking-widest">
                        No answer payload found for this application.
                      </div>
                    );
                  }

                  return answerEntries.map(([key, value]) => {
                    const questionLabel = allQuestions.find((q) => q.id === key)?.label || key;
                    return (
                      <div key={key} className="bg-white/[0.02] border border-white/5 p-6 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-neutral-500 mb-2 tracking-widest">{questionLabel}</div>
                        <div className="text-white text-sm leading-relaxed font-medium">"{String(value)}"</div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* --- ACTION ZONE --- */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-8">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'approved')} 
                    className="py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black transition-all"
                  >
                    <CheckCircle2 size={16}/> Approve Entry
                  </button>
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'declined')} 
                    className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <XSquare size={16}/> Decline Entry
                  </button>
                </div>

                {/* THE RESET BUTTON (SECOND CHANCE) */}
                {selectedApp.status !== 'pending' && (
                  <button 
                    disabled={processingId === selectedApp.id} 
                    onClick={() => handleDecision(selectedApp.id, 'reset')} 
                    className="w-full py-4 bg-white/5 text-neutral-500 border border-white/10 rounded-xl font-black uppercase text-[9px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/50 transition-all group"
                  >
                    <RefreshCw size={14} className={processingId === selectedApp.id ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}/> 
                    Reset Protocol (Second Chance)
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

const normalizeAnswers = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
};