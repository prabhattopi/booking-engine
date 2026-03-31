// src/components/RoomCard.tsx
"use client";

import { motion } from "motion/react";
import { BedDouble, Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { lockRoom } from "@/actions/booking";

type RoomProps = {
  room: { id: string; name: string; description: string; price: number; imageUrl: string; };
  initialAvailable: boolean;
  index: number;
};

export default function RoomCard({ room, initialAvailable, index }: RoomProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the lock state based on what the server told us!
  const [isLockedByOther, setIsLockedByOther] = useState(!initialAvailable); 

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(room.price / 100);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.roomId === room.id && (data.status === 'LOCKED' || data.status === 'BOOKED')) {
        setIsLockedByOther(true);
      }
      
      if (data.roomId === room.id && data.status === 'AVAILABLE') {
        setIsLockedByOther(false);
        setError(null);
      }
    };

    // Vercel will eventually sever the connection. 
    // This silently handles the reconnect so the user never notices.
    eventSource.onerror = () => {
      console.log("Stream refreshing...");
      // EventSource automatically attempts to reconnect on its own!
    };

    return () => eventSource.close();
  }, [room.id]);

  const handleBooking = async () => {
    setIsPending(true);
    setError(null);
    const result = await lockRoom(room.id);
    
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
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
        
        {/* Locked Overlay */}
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