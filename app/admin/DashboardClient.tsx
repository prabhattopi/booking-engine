// src/app/admin/DashboardClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle2, Lock, Unlock } from "lucide-react";

type AdminRoom = {
  id: string;
  name: string;
  price: number;
  currentStatus: string;
};

export default function DashboardClient({ initialRooms }: { initialRooms: AdminRoom[] }) {
  const [rooms, setRooms] = useState<AdminRoom[]>(initialRooms);
  
  // 🛑 THE OPTIMIZATION: Track if the Admin is actually looking at the dashboard
  const [isTabActive, setIsTabActive] = useState(true);

  // --- 1. THE VISIBILITY TRACKER ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // --- 2. THE DISTRIBUTED SSE LISTENER ---
  useEffect(() => {
    // If Admin tab is in the background, pause the network to save Upstash limits!
    if (!isTabActive) return;

    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setRooms((currentRooms) => 
        currentRooms.map((room) => 
          room.id === data.roomId ? { ...room, currentStatus: data.status } : room
        )
      );
    };

    // Vercel auto-reconnect handling
    eventSource.onerror = () => {
      console.log("Admin stream refreshing...");
    };

    return () => eventSource.close();
  }, [isTabActive]); // <-- Dependency added here!

  const renderStatus = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-sm font-semibold border border-emerald-400/20"><Unlock size={14} /> Available</span>;
      case "PENDING":
      case "LOCKED":
        return <span className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-sm font-semibold border border-amber-400/20 animate-pulse"><Lock size={14} /> In Checkout</span>;
      case "CONFIRMED":
      case "BOOKED":
        return <span className="flex items-center gap-2 text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full text-sm font-semibold border border-blue-400/20"><CheckCircle2 size={14} /> Sold</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl mb-8">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-blue-400" /> Live Inventory
        </h2>
        <span className="flex items-center gap-2 text-sm text-slate-400">
          <span className="relative flex h-3 w-3">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isTabActive ? "animate-ping bg-emerald-400" : "bg-slate-500"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isTabActive ? "bg-emerald-500" : "bg-slate-500"}`}></span>
          </span>
          {isTabActive ? "System Online" : "Paused (Background)"}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Room Name</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Live Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-semibold text-white">{room.name}</td>
                <td className="p-4 text-slate-300">${(room.price / 100).toFixed(2)}</td>
                <td className="p-4">{renderStatus(room.currentStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}