"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Hexagon, Shield, Search, XCircle, FileText, User, Calendar, AlertTriangle } from 'lucide-react';

// --- SECURITY CONFIGURATION ---
// REPLACE THIS WITH YOUR EXACT DISCORD ID
const ADMIN_IDS = ["1208908529411301387"]; 

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State for data and UI
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Real Data from API
  useEffect(() => {
    async function fetchApps() {
      try {
        const response = await fetch('/api/admin/applications');
        if (response.ok) {
          const data = await response.json();
          // Ensure data is an array before setting state
          setApplications(Array.isArray(data) ? data : []);
        } else {
          console.error("Failed to fetch applications");
        }
      } catch (err) {
        console.error("Transmission error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (status === "authenticated") {
      fetchApps();
    }
  }, [status]);

  // 2. Loading State
  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Hexagon className="text-yellow-400 animate-spin" size={64} />
      <p className="text-yellow-400/50 font-mono text-xs animate-pulse uppercase tracking-widest">
        Establishing Secure Link...
      </p>
    </div>
  );

  // 3. Security Check (Redirect or Show Access Denied)
  if (!session || !ADMIN_IDS.includes((session.user as any).id)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={80} className="text-red-600 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">Neural Link Denied</h1>
        <p className="text-neutral-500 font-mono text-sm mb-8 uppercase">
          Access unauthorized for ID: <span className="text-white">{(session?.user as any)?.id || "ANONYMOUS"}</span>
        </p>
        <button 
          onClick={() => router.push('/')} 
          className="px-10 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold uppercase text-[10px] tracking-widest"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  // Filter logic for the search bar
  const filteredApps = applications.filter(app => 
    app.discord_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.discord_id?.includes(searchTerm) ||
    app.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Hexagon className="text-yellow-400 fill-yellow-400" size={32} />
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white hidden md:block">
              Hive Command
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Link Secure
              </span>
              <span className="text-xs text-neutral-500 font-mono italic">{session.user?.name}</span>
            </div>
            <img 
              src={session.user?.image || ""} 
              className="w-10 h-10 rounded-full border border-white/10 shadow-lg" 
              alt="Admin" 
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <h2 className="text-neutral-500 text-xs font-black uppercase tracking-[0.3em] mb-3">Operational Overview</h2>
            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
              Recruitment Logs
            </div>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-yellow-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search Name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-yellow-400 outline-none transition-all placeholder:text-neutral-700 text-white"
            />
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm shadow-2xl min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Identity</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Assignment</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hidden md:table-cell">Timestamp</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.03] transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                        {app.discord_name ? app.discord_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <div className="font-black text-white text-base tracking-tight">{app.discord_name}</div>
                        <div className="text-[10px] text-neutral-600 font-mono tracking-widest">{app.discord_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-8 hidden md:table-cell">
                    <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                      {app.role}
                    </span>
                  </td>
                  <td className="p-8 hidden md:table-cell text-sm text-neutral-500 font-mono uppercase italic">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-8 text-right">
                    <button 
                      onClick={() => setSelectedApp(app)}
                      className="px-6 py-3 bg-transparent border border-white/10 hover:border-yellow-400 hover:text-yellow-400 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic"
                    >
                      Read Intel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Empty State */}
          {filteredApps.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-neutral-700">
              <AlertTriangle size={48} className="mb-4 opacity-20" />
              <div className="uppercase font-black tracking-[0.3em] text-xs">No Records Found</div>
            </div>
          )}
        </div>
      </main>

      {/* READING MODAL (The Popup) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 z-50 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/5 p-8 md:p-10 rounded-[2.5rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setSelectedApp(null)} 
              className="absolute top-8 right-8 text-neutral-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
              <XCircle size={32} />
            </button>
            
            {/* Modal Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 text-yellow-500 mb-2">
                <div className="h-[2px] w-8 bg-yellow-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Candidate File</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-6">
                {selectedApp.discord_name}
              </h2>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-xl border border-white/5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <User size={12} className="text-yellow-500" /> {selectedApp.discord_id}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-xl border border-white/5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <FileText size={12} className="text-yellow-500" /> {selectedApp.role}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-xl border border-white/5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <Calendar size={12} className="text-yellow-500" /> {new Date(selectedApp.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* Answers Grid */}
            <div className="grid gap-6">
              {selectedApp.answers && Object.entries(selectedApp.answers).map(([question, answer]: any) => (
                <div key={question} className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="text-[10px] font-black uppercase text-yellow-500/50 mb-3 tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-yellow-500" />
                    {question.replace(/_/g, ' ')}
                  </div>
                  <div className="text-neutral-200 text-base md:text-lg leading-relaxed font-medium italic">
                    "{answer}"
                  </div>
                </div>
              ))}
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedApp(null)}
              className="mt-10 w-full py-5 bg-yellow-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-300 transition-all shadow-[0_0_30px_rgba(250,204,21,0.2)] active:scale-[0.98]"
            >
              Close Intel File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}