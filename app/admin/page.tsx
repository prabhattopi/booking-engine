// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Unlock, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { getActiveBookings, forceReleaseBooking, cancelBooking, getAdminRooms } from "@/actions/admin";
import { toast } from "react-hot-toast";
import DashboardClient from "./DashboardClient"; // <-- Import your Live Inventory!

type BookingWithRoom = {
  id: string;
  status: string;
  lockedUntil: Date;
  room: { name: string; price: number };
};

type AdminRoom = {
  id: string;
  name: string;
  price: number;
  currentStatus: string;
};

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingWithRoom[]>([]);
  const [adminRooms, setAdminRooms] = useState<AdminRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    // Fetch BOTH the God Mode data and the Live Inventory data
    const [bookingsData, roomsData] = await Promise.all([
      getActiveBookings(),
      getAdminRooms()
    ]);
    
    setBookings(bookingsData as any);
    setAdminRooms(roomsData as any);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleForceRelease = async (bookingId: string) => {
    setActionId(bookingId);
    const res = await forceReleaseBooking(bookingId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Room forcefully unlocked!");
      loadData(); 
    }
    setActionId(null);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this confirmed booking?")) return;
    
    setActionId(bookingId);
    const res = await cancelBooking(bookingId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Booking cancelled & refunded.");
      loadData(); 
    }
    setActionId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={32} />
            <h1 className="text-3xl font-bold">Admin God Mode</h1>
          </div>
          <button 
            onClick={loadData} 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p>Connecting to distributed systems...</p>
          </div>
        ) : (
          <>
            {/* 1. TOP SECTION: The Live Inventory Dashboard */}
            <DashboardClient initialRooms={adminRooms} />

            {/* 2. BOTTOM SECTION: The God Mode Kill Switches */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-red-950/20">
                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <ShieldAlert size={20} /> Active Checkouts & Kicks
                </h2>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Room</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Time Remaining</th>
                    <th className="p-4 font-semibold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No active checkouts or bookings right now.</td>
                    </tr>
                  )}
                  
                  {bookings.map((booking) => {
                    const isPending = booking.status === "PENDING";
                    const timeLeft = Math.max(0, Math.floor((new Date(booking.lockedUntil).getTime() - Date.now()) / 1000));
                    
                    return (
                      <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-medium">{booking.room.name}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isPending ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {isPending ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s` : "Sold permanently"}
                        </td>
                        <td className="p-4 flex justify-end gap-2">
                          {isPending ? (
                            <button 
                              onClick={() => handleForceRelease(booking.id)}
                              disabled={actionId === booking.id}
                              className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-4 py-2 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50"
                            >
                              <Unlock size={16} /> Force Unlock
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleCancel(booking.id)}
                              disabled={actionId === booking.id}
                              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50"
                            >
                              <Trash2 size={16} /> Cancel & Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}