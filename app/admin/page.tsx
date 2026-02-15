"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Hexagon, Shield, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

const ADMIN_IDS = ["1208908529411301387"]; 

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<any>(null); // State to hold the app you're reading

  // 1. Fetch Real Data from your new API
  useEffect(() => {
    async function fetchApps() {
      const response = await fetch('/api/admin/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
      setLoading(false);
    }
    
    if (status === "authenticated") {
      fetchApps();
    }
  }, [status]);

  if (status === "loading" || loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Hexagon className="text-yellow-400 animate-spin" size={48} />
    </div>
  );

  if (!session || !ADMIN_IDS.includes((session.user as any).id)) {
    return <div className="text-white text-center mt-20">Access Denied</div>;
  }

  const filteredApps = filter === "all" 
    ? applications 
    : applications.filter(app => app.status === filter);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-8">Hive Command</h1>

      {/* Main Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-xs uppercase text-gray-400">
            <tr>
              <th className="p-6">Applicant</th>
              <th className="p-6">Role</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((app) => (
              <tr key={app.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-6">
                  <div className="font-bold">{app.discord_name}</div>
                  <div className="text-xs text-gray-500">{app.discord_id}</div>
                </td>
                <td className="p-6">{app.role}</td>
                <td className="p-6 uppercase text-xs font-bold text-yellow-400">{app.status}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setSelectedApp(app)}
                    className="text-yellow-400 hover:underline text-xs font-bold"
                  >
                    REVIEW ANSWERS
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* READING MODAL: This allows you to read the application */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-yellow-400/30 p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">{selectedApp.discord_name}'s Application</h2>
            <p className="text-gray-400 mb-6">Position: {selectedApp.role}</p>
            
            <div className="space-y-6">
              {Object.entries(selectedApp.answers).map(([question, answer]: any) => (
                <div key={question} className="border-b border-white/5 pb-4">
                  <div className="text-xs font-black uppercase text-gray-500 mb-1">{question.replace(/_/g, ' ')}</div>
                  <div className="text-white">{answer}</div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSelectedApp(null)}
              className="mt-8 w-full py-3 bg-yellow-400 text-black font-bold rounded-xl"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}