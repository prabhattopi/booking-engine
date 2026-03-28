// src/app/admin/DashboardClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle2, Lock, Unlock } from "lucide-react";

// Define the shape of our data
type AdminRoom = {
  id: string;
  name: string;
  price: number;
  currentStatus: string;
};

export default function DashboardClient({ initialRooms }: { initialRooms: AdminRoom[] }) {
  const [rooms, setRooms] = useState<AdminRoom[]>(initialRooms);

  // --- THE REAL-TIME LISTENER ---
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Instantly update the table row when anyone in the world books or locks a room!
      setRooms((currentRooms) => 
        currentRooms.map((room) => 
          room.id === data.roomId ? { ...room, currentStatus: data.status } : room
        )
      );
    };

    return () => eventSource.close();
  }, []);

  // Helper to render beautiful status badges
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
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-blue-400" /> Live Inventory
        </h2>
        <span className="flex items-center gap-2 text-sm text-slate-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          System Online
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