"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplicationForm() {
  const [roleTitle, setRoleTitle] = useState("Server Manager"); // Default or dynamic
  const [answers, setAnswers] = useState({ q1: "", q2: "" });
  const [status, setStatus] = useState("IDLE");
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus("TRANSMITTING");

    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleTitle, answers }),
    });

    if (res.ok) {
      setStatus("SUCCESS");
      setTimeout(() => router.push("/"), 2000);
    } else {
      setStatus("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Hex Pattern (Optional CSS) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="max-w-2xl w-full border border-yellow-900/50 bg-neutral-900/80 p-8 rounded-lg shadow-[0_0_30px_rgba(250,204,21,0.1)] backdrop-blur-sm relative z-10">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-yellow-800/30 pb-4">
          <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
          <h1 className="text-2xl font-bold tracking-widest text-yellow-500 uppercase">
            Recruitment Protocol
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs text-yellow-500/70 uppercase tracking-widest">Target Position</label>
            <select 
              value={roleTitle} 
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full bg-black/50 border border-yellow-900/50 text-white p-3 rounded focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all uppercase"
            >
              <option>Server Manager</option>
              <option>Head Staff</option>
              <option>Twitch Partner</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-yellow-500/70 uppercase tracking-widest">Why do you want this role?</label>
            <textarea 
              className="w-full bg-black/50 border border-yellow-900/50 text-white p-3 h-32 rounded focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
              placeholder="Enter data..."
              onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
            />
          </div>

          {/* Status & Button */}
          <div className="pt-4 border-t border-yellow-800/30 flex justify-between items-center">
            <span className={`text-xs tracking-widest uppercase ${status === 'ERROR' ? 'text-red-500' : 'text-neutral-500'}`}>
              Status: {status}
            </span>

            <button 
              type="submit"
              disabled={status === "TRANSMITTING" || status === "SUCCESS"}
              className="px-8 py-3 bg-yellow-600/20 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all uppercase font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "TRANSMITTING" ? "SENDING..." : status === "SUCCESS" ? "ARCHIVED" : "INITIATE UPLOAD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}