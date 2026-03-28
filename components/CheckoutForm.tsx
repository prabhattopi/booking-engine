// src/components/CheckoutForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Clock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { processPayment, expireBooking } from "@/actions/booking";

type Props = {
  bookingId: string;
  lockedUntil: Date;
};

export default function CheckoutForm({ bookingId, lockedUntil }: Props) {
  // 1. Put the expiration time in state so we can change it dynamically
  const [expirationTime, setExpirationTime] = useState<Date>(lockedUntil);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cvv, setCvv] = useState("");
  const [status, setStatus] = useState<"typing" | "processing" | "failed" | "expired" | "success">("typing");
  const [errorMessage, setErrorMessage] = useState("");

  // 2. The timer now listens to `expirationTime`
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expirationTime).getTime() - new Date().getTime();
      if (difference <= 0) {
        setStatus("expired");
        expireBooking(bookingId);
        return 0;
      }
      return Math.floor(difference / 1000);
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);

    return () => clearInterval(timer);
  }, [expirationTime, bookingId]); // <-- Dependency updated

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  const handlePay = async () => {
    setStatus("processing");
    setErrorMessage(""); // Clear old errors
    
    const result = await processPayment(bookingId, cvv);

    if (result.error) {
      setStatus("typing"); // Put them back in typing mode, not a hard failure!
      setErrorMessage(result.error);
      
      // 3. THE MAGIC: If the backend gave us a grace period, update the clock!
      if (result.newLockedUntil) {
        setExpirationTime(result.newLockedUntil);
      }
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in">
        <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-slate-400">Your room is confirmed. Pack your bags!</p>
        <a href="/" className="mt-8 text-blue-400 hover:text-blue-300 underline">Return to Home</a>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in">
        <AlertCircle size={80} className="text-red-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Time Expired</h2>
        <p className="text-slate-400 max-w-sm mb-8">Your hold has ended. The room has been released to the public.</p>
        <a href="/" className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">Search Again</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-3 bg-blue-950/40 text-blue-300 p-4 rounded-xl border border-blue-900 mb-6 shadow-inner transition-all">
        <Clock className={`${timeLeft < 120 ? "text-red-400 animate-pulse" : "text-blue-400"} shrink-0`} size={24} />
        <div className="flex-grow">
          <p className="font-semibold text-lg flex justify-between">
            <span>Room locked for you</span>
            <span className={`font-mono text-xl ${timeLeft < 120 ? "text-red-400 font-bold" : "text-emerald-400"}`}>
              {minutes}:{seconds}
            </span>
          </p>
        </div>
      </div>

      {/* Show the smart error message without destroying the form */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl flex items-start gap-3 text-red-300 animate-in slide-in-from-top-2">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="h-12 bg-slate-900 rounded-lg border border-slate-700 flex items-center px-4 text-slate-500 font-mono">
          4111 1111 1111 1111
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-slate-900 rounded-lg border border-slate-700 flex items-center px-4 text-slate-500">12/28</div>
          <input 
            type="text" 
            placeholder="CVV (Try 999)" 
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            maxLength={3}
            className="h-12 bg-slate-900 rounded-lg border border-slate-700 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />
        </div>

        <button 
          onClick={handlePay}
          disabled={status === "processing" || cvv.length < 3}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-transform active:scale-95 flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {status === "processing" ? "Processing..." : <><ShieldCheck size={20} /> Confirm & Pay</>}
        </button>
      </div>
    </div>
  );
}