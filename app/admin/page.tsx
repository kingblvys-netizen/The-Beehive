"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signIn } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Hexagon, Shield, AlertTriangle, CheckCircle, XCircle, Clock, User, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

// --- SECURITY CONFIG ---
// REPLACE THIS WITH YOUR REAL DISCORD ID
const ADMIN_IDS = ["1208908529411301387", "ANOTHER_ADMIN_ID"]; 

// --- MOCK DATA (Replace with Real DB later) ---
const mockApps = [
  { id: 1, user: "KingB", role: "Server Manager", status: "pending", date: "2024-02-15", discordId: "123456789" },
  { id: 2, user: "SpeedyRogue", role: "Twitch Partner", status: "accepted", date: "2024-02-14", discordId: "987654321" },
  { id: 3, user: "PixelArtist", role: "Content Creator", status: "rejected", date: "2024-02-10", discordId: "456123789" },
  { id: 4, user: "ModWannabe", role: "Staff Team", status: "pending", date: "2024-02-15", discordId: "321654987" },
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  // 1. Security Check
  if (status === "loading") return (
    <div className="min-h-screen bg-bee-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin" size={48} />
    </div>
  );

  // If not logged in, or logged in but NOT an admin
  if (!session || !session.user || !ADMIN_IDS.includes((session.user as any).id)) {
    return (
      <div className="min-h-screen bg-bee-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={80} className="text-red-500 mb-6" />
        <h1 className="text-4xl font-black uppercase mb-4">Restricted Access</h1>
        <p className="text-gray-500 max-w-md mb-8">
          This frequency is encrypted. Your neural link ({session?.user?.name || "Unknown"}) is not authorized for High Command.
        </p>
        <button onClick={() => router.push('/')} className="px-8 py-3 rounded-xl border border-bee-gray hover:bg-white/5 transition font-bold uppercase text-xs tracking-widest">
          Return to Safety
        </button>
      </div>
    );
  }

  // 2. Filter Logic
  const filteredApps = filter === "all" 
    ? mockApps 
    : mockApps.filter(app => app.status === filter);

  return (
    <div className="min-h-screen bg-bee-black text-white font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Navbar */}
      <nav className="border-b border-bee-gray bg-bee-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hexagon className="text-yellow-400 fill-yellow-400" size={28} />
            <span className="font-bold text-xl tracking-tight uppercase">Hive Command</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Secure Connection
            </div>
            <img src={session.user.image || ""} alt="Avatar" className="w-8 h-8 rounded-full border border-bee-gray" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-bee-dark border border-bee-gray p-6 rounded-2xl">
            <div className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total Applications</div>
            <div className="text-3xl font-black text-white">1,248</div>
          </div>
          <div className="bg-bee-dark border border-bee-gray p-6 rounded-2xl">
            <div className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Pending Review</div>
            <div className="text-3xl font-black text-yellow-400">42</div>
          </div>
          <div className="bg-bee-dark border border-bee-gray p-6 rounded-2xl">
            <div className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Accepted</div>
            <div className="text-3xl font-black text-green-500">156</div>
          </div>
          <div className="bg-bee-dark border border-bee-gray p-6 rounded-2xl">
            <div className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Rejected</div>
            <div className="text-3xl font-black text-red-500">1,050</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-2 bg-bee-dark border border-bee-gray p-1 rounded-lg">
            {['all', 'pending', 'accepted', 'rejected'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                  filter === f ? 'bg-bee-gray text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search by Discord ID..." 
              className="bg-bee-dark border border-bee-gray rounded-xl pl-12 pr-4 py-3 text-sm focus:border-yellow-400 outline-none w-64 transition-all"
            />
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-bee-dark/50 border border-bee-gray rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-bee-gray bg-white/5">
                <th className="p-6 text-xs font-black uppercase tracking-widest text-gray-500">Applicant</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-gray-500">Role</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-gray-500">Date</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app.id} className="border-b border-bee-gray/50 hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-black font-bold text-xs">
                        {app.user.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{app.user}</div>
                        <div className="text-xs text-gray-500 font-mono">{app.discordId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="bg-bee-gray/50 px-3 py-1 rounded text-xs font-bold text-gray-300 border border-white/10">
                      {app.role}
                    </span>
                  </td>
                  <td className="p-6 text-sm text-gray-400 font-mono">{app.date}</td>
                  <td className="p-6">
                    {app.status === 'pending' && <span className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-widest"><Clock size={14}/> Pending</span>}
                    {app.status === 'accepted' && <span className="flex items-center gap-2 text-xs font-bold text-green-500 uppercase tracking-widest"><CheckCircle size={14}/> Accepted</span>}
                    {app.status === 'rejected' && <span className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest"><XCircle size={14}/> Rejected</span>}
                  </td>
                  <td className="p-6 text-right">
                    <button className="text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest underline decoration-dashed underline-offset-4">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No applications found matching your filters.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}