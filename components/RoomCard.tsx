// src/components/RoomCard.tsx
"use client";

import { motion } from "motion/react";
import { BedDouble, Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react"; 
import { lockRoom, checkRoomStatus } from "@/actions/booking";
import { toast } from "react-hot-toast"; 

// 🛑 THE ULTIMATE FIX: Module-level sets live completely outside React.
// They survive Strict Mode, re-renders, and page transitions!
const myBookedRooms = new Set<string>();
const recentlyToasted = new Set<string>();

type RoomProps = {
  room: { id: string; name: string; description: string; price: number; imageUrl: string; };
  initialAvailable: boolean;
  index: number;
};

export default function RoomCard({ room, initialAvailable, index }: RoomProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLockedByOther, setIsLockedByOther] = useState(!initialAvailable); 
  const [isTabActive, setIsTabActive] = useState(true);

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(room.price / 100);

  // --- 1. THE VISIBILITY TRACKER ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // --- 2. THE BULLETPROOF REAL-TIME LISTENER ---
  useEffect(() => {
    if (!isTabActive) return;

    const syncStatus = async () => {
      const status = await checkRoomStatus(room.id, Date.now());
      const shouldBeLocked = status !== 'AVAILABLE';
      setIsLockedByOther(shouldBeLocked);
    };
    
    syncStatus(); 
    const healingInterval = setInterval(syncStatus, 10000);

    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.roomId === room.id) {
        if (data.status === 'LOCKED' || data.status === 'BOOKED') {
          
          // 🛑 FIX: Only toast if WE didn't click it, AND we haven't toasted it already!
          if (!myBookedRooms.has(room.id) && !recentlyToasted.has(room.id)) {
            recentlyToasted.add(room.id); // Lock the toast globally
            
            toast(`Someone just started booking the ${room.name}!`, {
              id: room.id, 
              icon: '🔥',
              style: {
                borderRadius: '10px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155'
              },
            });
          }
          setIsLockedByOther(true);
        }
        
        if (data.status === 'AVAILABLE') {
          // Room is free again! Clear the global locks so it can trigger in the future.
          recentlyToasted.delete(room.id);
          myBookedRooms.delete(room.id);
          setIsLockedByOther(false);
          setError(null);
        }
      }
    };

    eventSource.onerror = () => {
      console.log("Stream refreshing...");
    };

    return () => {
      eventSource.close();
      clearInterval(healingInterval); 
    };
  }, [room.id, isTabActive]);

  const handleBooking = async () => {
    setIsPending(true);
    setError(null);

    // 🛑 FIX: Tag this room ID as "mine" instantly before contacting the server
    myBookedRooms.add(room.id);

    const result = await lockRoom(room.id);
    
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
      myBookedRooms.delete(room.id); // If booking failed, remove the tag!
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={!isLockedByOther ? { y: -8 } : {}}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-500 shadow-xl ${
        isLockedByOther ? "bg-slate-900/80 border-slate-800 opacity-60 grayscale" : "bg-slate-800/50 border-slate-700"
      }`}
    >
      <div className="relative h-64 overflow-hidden">
        <motion.img 
          whileHover={!isLockedByOther ? { scale: 1.05 } : {}} 
          src={room.imageUrl} alt={room.name} className="h-full w-full object-cover" 
        />
        <div className="absolute top-4 right-4 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-white backdrop-blur-md">
          {formattedPrice} / night
        </div>
        
        {isLockedByOther && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-900/90 text-red-400 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-red-900/50 shadow-2xl">
              <Lock size={16} /> Sold Out / Locked
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-2 mb-2">
          <BedDouble size={20} className={isLockedByOther ? "text-slate-600" : "text-primary"} />
          <span className={`text-sm font-medium tracking-wider uppercase ${isLockedByOther ? "text-slate-500" : "text-blue-400"}`}>Luxury</span>
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${isLockedByOther ? "text-slate-400" : "text-white"}`}>{room.name}</h3>
        <p className="text-slate-500 mb-6 flex-grow">{room.description}</p>
        
        {error && <p className="text-red-400 text-sm mb-4 font-medium bg-red-950/30 p-2 rounded-md">{error}</p>}
        
        <button 
          onClick={handleBooking}
          disabled={isPending || isLockedByOther}
          className={`w-full flex justify-center items-center rounded-xl py-3 font-semibold text-white transition-all 
            ${isLockedByOther 
              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
              : "bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-500 active:scale-95"
            } disabled:opacity-50`}
        >
          {isPending ? <Loader2 className="animate-spin mr-2" size={20} /> : (isLockedByOther ? "Unavailable" : "Book Now")}
        </button>
      </div>
    </motion.div>
  );
}