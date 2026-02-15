"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Hexagon, Shield, Clock, Search, XCircle } from 'lucide-react';

// Ensure your Discord ID is exactly this
const ADMIN_IDS = ["1208908529411301387"]; 

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  // 1. Fetch data from your new .vercel.app domain
  useEffect(() => {
    async function fetchApps() {
      try {
        const response = await fetch('/api/admin/applications');
        if (response.ok) {
          const data = await response.json();
          setApplications(data);
        }
      } catch (err) {
        console.error("Failed to load apps", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (status === "authenticated") fetchApps();
  }, [status]);

  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin" size={48} />
    </div>
  );

  // Security Check
  if (!session || !ADMIN_IDS.includes((session.user as any).id)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Shield size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">ACCESS RESTRICTED</h1>
        <p className="text-gray-500">Your ID: {(session?.user as any)?.id || "Not Logged In"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black text-yellow-400 tracking-tighter uppercase italic">Hive Command</h1>
          <div className="text-xs font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Encrypted Link Active
          </div>
        </div>

        {/* Table View */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10 text-xs font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="p-6">Applicant</th>
                <th className="p-6">Position</th>
                <th className="p-6">Date</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-white">{app.discord_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{app.discord_id}</div>
                  </td>
                  <td className="p-6">
                    <span className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/20">
                      {app.role}
                    </span>
                  </td>
                  <td className="p-6 text-sm text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setSelectedApp(app)}
                      className="text-xs font-black uppercase tracking-widest text-white hover:text-yellow-400 underline decoration-yellow-400/30 underline-offset-8 transition-all"
                    >
                      Review File
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {applications.length === 0 && (
            <div className="p-20 text-center text-gray-600 uppercase font-bold tracking-widest">No Transmissions Found</div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-neutral-900 border border-yellow-400/20 p-8 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><XCircle /></button>
            <h2 className="text-3xl font-black text-yellow-400 uppercase italic mb-1">{selectedApp.discord_name}</h2>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-8">Role: {selectedApp.role}</p>
            
            <div className="space-y-8">
              {Object.entries(selectedApp.answers).map(([question, answer]: any) => (
                <div key={question} className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-black uppercase text-yellow-400/50 mb-2 tracking-widest">{question.replace(/_/g, ' ')}</div>
                  <div className="text-white text-sm leading-relaxed">{answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}