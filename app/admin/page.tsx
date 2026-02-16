"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, FileText, User, 
  Calendar, CheckCircle2, XSquare, Lock, Unlock, RefreshCw, AlertTriangle
} from 'lucide-react';
// Import data to translate Question IDs to Real Text
import { roles as roleData, getQuestions } from '../data';

// --- ADMIN ACCESS LIST ---
const ADMIN_IDS = [
  "1208908529411301387", 
  "1406555930769756161", 
  "1241945084346372247"
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Data
  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchApps();
  }, [status]);

  // 2. Decision Handler
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
      alert("Sync Failed");
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Security & Loading
  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Hexagon className="text-yellow-500 animate-spin" size={64} />
      <p className="text-yellow-500 font-mono text-[10px] animate-pulse uppercase tracking-[0.5em]">Establishing Secure Link...</p>
    </div>
  );

  if (!session || !ADMIN_IDS.includes((session.user as any)?.id)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={80} className="text-red-600 mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
        <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2">Access Denied</h1>
        <p className="text-neutral-500 font-mono text-xs mb-8 uppercase tracking-widest">Biometric Mismatch Detected</p>
        <button onClick={() => router.push('/')} className="px-10 py-4 border border-white/10 hover:bg-yellow-500 hover:text-black transition-all font-bold uppercase text-[10px] tracking-widest rounded">Return to Hub</button>
      </div>
    );
  }

  // Filter Logic
  const filteredApps = applications.filter(app => 
    app.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.discord_id?.includes(searchTerm) ||
    app.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-yellow-500 selection:text-black relative overflow-x-hidden">
      
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-yellow-900/20 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => router.push('/')}>
            <Hexagon className="text-yellow-500 fill-yellow-500 group-hover:rotate-90 transition-transform" size={28} />
            <h1 className="text-xl font-bold tracking-widest uppercase text-yellow-500">Hive Command</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={fetchApps} className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-green-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"/> Link Secure
              </span>
              <span className="text-xs text-neutral-500 font-bold uppercase">{session.user?.name}</span>
            </div>
            <img src={session.user?.image || ""} className="w-10 h-10 rounded border border-yellow-500/30" alt="Admin" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <h2 className="text-yellow-500/50 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Admin Clearance Level 5</h2>
            <div className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase">Recruitment <span className="text-yellow-500">Logs</span></div>
          </div>
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-yellow-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH DATABASE..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded py-4 pl-12 pr-6 text-sm focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700 text-white font-bold tracking-widest uppercase"
            />
          </div>
        </div>

        {/* --- STATUS GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
          {roleData.map(role => (
            <div key={role.id} className={`p-4 border transition-all ${role.isOpen ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 grayscale opacity-50'}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-2 truncate">{role.title}</div>
              <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${role.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                {role.isOpen ? <Unlock size={10} /> : <Lock size={10} />} {role.isOpen ? 'ACTIVE' : 'LOCKED'}
              </div>
            </div>
          ))}
        </div>

        {/* --- APPLICATIONS TABLE --- */}
        <div className="bg-neutral-900/30 border border-white/5 backdrop-blur-sm min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Agent Identity</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Target Role</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Status</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-yellow-500/5 transition-all">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-800 border border-white/10 flex items-center justify-center text-yellow-500 font-bold group-hover:border-yellow-500 transition-all">
                        {app.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white tracking-wide uppercase text-sm">{app.username}</div>
                        <div className="text-[10px] text-neutral-600 tracking-widest">{app.discord_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 hidden md:table-cell">
                    <span className="bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{app.role_title}</span>
                  </td>
                  <td className="p-6 hidden md:table-cell">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      app.status === 'approved' ? 'text-green-500' : 
                      app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setSelectedApp(app)} className="px-6 py-2 border border-white/10 hover:border-yellow-500 hover:bg-yellow-500 hover:text-black text-neutral-500 text-[10px] font-bold uppercase tracking-widest transition-all">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredApps.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-neutral-700">
              <AlertTriangle size={32} className="mb-4 opacity-20" />
              <div className="uppercase font-bold tracking-[0.5em] text-xs">No Signal Detected</div>
            </div>
          )}
        </div>
      </main>

      {/* --- DOSSIER MODAL (Fixed "Black Box" Look) --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
              className="bg-neutral-900/90 border border-yellow-500/20 p-8 md:p-12 max-w-3xl w-full max-h-[85vh] overflow-y-auto relative shadow-[0_0_50px_rgba(250,204,21,0.1)]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 text-neutral-600 hover:text-red-500 transition-colors">
                <XCircle size={24} />
              </button>
              
              {/* Header */}
              <div className="mb-10 border-b border-white/5 pb-8">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Shield size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Candidate Dossier</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-6">{selectedApp.username}</h2>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-black border border-white/10 text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2">
                    <User size={12} className="text-yellow-500"/> {selectedApp.discord_id}
                  </div>
                  <div className="px-4 py-2 bg-black border border-white/10 text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2">
                    <FileText size={12} className="text-yellow-500"/> {selectedApp.role_title}
                  </div>
                  <div className="px-4 py-2 bg-black border border-white/10 text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2">
                    <Calendar size={12} className="text-yellow-500"/> {new Date(selectedApp.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* QUESTIONS & ANSWERS (The Translator Logic) */}
              <div className="space-y-6 mb-12">
                {selectedApp.answers && Object.entries(selectedApp.answers).map(([key, value]) => {
                   // 1. Find the Role Config based on the Application's Title
                   const roleConfig = roleData.find(r => r.title === selectedApp.role_title);
                   // 2. Get Questions for that role
                   const allQuestions = roleConfig ? getQuestions(roleConfig.id) : [];
                   // 3. Find the matching question label
                   const questionLabel = allQuestions.find(q => q.id === key)?.label || key;

                   return (
                    <div key={key} className="bg-black/40 p-6 border-l-2 border-yellow-500/50">
                      <div className="text-[9px] font-bold uppercase text-neutral-500 mb-2 tracking-widest">
                        {questionLabel} {/* SHOWS FULL TEXT NOW */}
                      </div>
                      <div className="text-white text-sm leading-relaxed font-mono">
                        "{String(value)}"
                      </div>
                    </div>
                   );
                })}
              </div>
              
              {/* DECISION BUTTONS */}
              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5">
                <button 
                  disabled={isUpdating}
                  onClick={() => handleDecision(selectedApp.id, 'approved')}
                  className="py-4 bg-green-500/10 text-green-500 border border-green-500/20 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black transition-all"
                >
                  <CheckCircle2 size={16}/> {isUpdating ? 'SYNCING...' : 'APPROVE'}
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleDecision(selectedApp.id, 'declined')}
                  className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                >
                  <XSquare size={16}/> {isUpdating ? 'SYNCING...' : 'DECLINE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}