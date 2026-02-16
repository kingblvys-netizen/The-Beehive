"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, FileText, User, 
  Calendar, AlertTriangle, CheckCircle2, XSquare, 
  Lock, Unlock, RefreshCw 
} from 'lucide-react';
import { roles as roleData } from '../data';

// --- AUTHORIZED ADMIN LIST ---
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Records
  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Link Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchApps();
  }, [status]);

  // 2. Decision Logic (Approve/Decline)
  const handleDecision = async (id: number, decision: 'approved' | 'declined') => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, status: decision }),
      });
      if (res.ok) {
        setSelectedApp(null);
        fetchApps();
      }
    } catch (error) {
      alert("Database sync failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Security Check
  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Hexagon className="text-yellow-400 animate-spin" size={64} />
      <p className="text-yellow-400 font-mono text-[10px] animate-pulse uppercase tracking-[0.5em]">Establishing Secure Link...</p>
    </div>
  );

  if (!session || !ADMIN_IDS.includes((session.user as any).id)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={80} className="text-red-600 mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]" />
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">Neural Link Denied</h1>
        <p className="text-neutral-600 font-mono text-xs mb-8 uppercase tracking-widest">Unauthorized Signature Identified</p>
        <button onClick={() => router.push('/')} className="px-10 py-4 bg-white/5 border border-white/10 hover:bg-yellow-400 hover:text-black transition-all font-black uppercase text-[10px] tracking-widest rounded-xl">Return to Base</button>
      </div>
    );
  }

  const filteredApps = applications.filter(app => 
    app.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.discord_id?.includes(searchTerm) ||
    app.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/')}>
            <Hexagon className="text-yellow-400 fill-yellow-400 group-hover:rotate-90 transition-transform" size={28} />
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">Hive Command</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={fetchApps} className="p-2 text-neutral-500 hover:text-white transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Link Secure
              </span>
              <span className="text-xs text-neutral-500 font-mono italic">{session.user?.name}</span>
            </div>
            <img src={session.user?.image || ""} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" alt="Admin" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* HEADER & SEARCH */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <h2 className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3">Administrator Overview</h2>
            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">Recruitment Logs</div>
          </div>
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-yellow-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Filter by Username or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-yellow-400 outline-none transition-all placeholder:text-neutral-700 text-white"
            />
          </div>
        </div>

        {/* RECRUITMENT STATUS CONTROL */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-6 flex items-center gap-2">
            <Lock size={12} /> Direct Recruitment Control
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {roleData.map(role => (
              <div key={role.id} className={`p-4 rounded-2xl border transition-all ${role.isOpen ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 grayscale'}`}>
                <div className="text-[9px] font-black uppercase tracking-tighter text-neutral-400 mb-2 truncate">{role.title}</div>
                <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${role.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                  {role.isOpen ? <Unlock size={10} /> : <Lock size={10} />} {role.isOpen ? 'Open' : 'Locked'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LOGS TABLE */}
        <div className="bg-neutral-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Identity</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Assignment</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Status</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.03] transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-white/5 flex items-center justify-center text-yellow-400 font-black group-hover:border-yellow-400 transition-all">
                        {app.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-black text-white tracking-tight">{app.username}</div>
                        <div className="text-[10px] text-neutral-600 font-mono tracking-widest">{app.discord_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-8 hidden md:table-cell">
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-neutral-400 uppercase tracking-widest">{app.role_title}</span>
                  </td>
                  <td className="p-8 hidden md:table-cell">
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${
                      app.status === 'approved' ? 'text-green-500' : 
                      app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'
                    }`}>● {app.status}</span>
                  </td>
                  <td className="p-8 text-right">
                    <button onClick={() => setSelectedApp(app)} className="px-6 py-3 bg-transparent border border-white/10 hover:border-yellow-400 hover:text-yellow-400 text-neutral-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic">Read Intel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-neutral-800">
              <AlertTriangle size={48} className="mb-4 opacity-10" />
              <div className="uppercase font-black tracking-[0.5em] text-xs">Zero Records found</div>
            </div>
          )}
        </div>
      </main>

      {/* INTEL MODAL */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0c0c0c] border border-white/10 p-8 md:p-12 rounded-[3rem] max-w-3xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl">
              <button onClick={() => setSelectedApp(null)} className="absolute top-10 right-10 text-neutral-600 hover:text-white transition-colors"><XCircle size={32} /></button>
              
              <div className="mb-12">
                <div className="flex items-center gap-3 text-yellow-500 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">Candidate Dossier</span>
                  <div className="h-[1px] flex-1 bg-yellow-500/20" />
                </div>
                <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-6">{selectedApp.username}</h2>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-neutral-900 rounded-xl border border-white/5 text-[10px] font-black text-neutral-500 uppercase flex items-center gap-2"><User size={12}/> {selectedApp.discord_id}</div>
                  <div className="px-4 py-2 bg-neutral-900 rounded-xl border border-white/5 text-[10px] font-black text-neutral-500 uppercase flex items-center gap-2"><FileText size={12}/> {selectedApp.role_title}</div>
                  <div className="px-4 py-2 bg-neutral-900 rounded-xl border border-white/5 text-[10px] font-black text-neutral-500 uppercase flex items-center gap-2"><Calendar size={12}/> {new Date(selectedApp.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="space-y-6 mb-12">
                {selectedApp.answers && Object.entries(selectedApp.answers).map(([q, a]: any) => (
                  <div key={q} className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                    <div className="text-[9px] font-black uppercase text-yellow-500/40 mb-3 tracking-widest">{q.replace(/_/g, ' ')}</div>
                    <div className="text-white text-lg leading-relaxed font-medium italic">"{a}"</div>
                  </div>
                ))}
              </div>
              
              {/* ACTION ZONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  disabled={isUpdating}
                  onClick={() => handleDecision(selectedApp.id, 'approved')}
                  className="py-5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-green-500 hover:text-black transition-all"
                >
                  <CheckCircle2 size={16}/> {isUpdating ? 'Syncing...' : 'Approve Candidate'}
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleDecision(selectedApp.id, 'declined')}
                  className="py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all"
                >
                  <XSquare size={16}/> {isUpdating ? 'Syncing...' : 'Decline Entry'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}