// src/app/checkout/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm"; // <-- Import the new component

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: true }
  });

  if (!booking) return notFound();

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(booking.priceAtBooking / 100);

  return (
    <main className="min-h-screen p-8 md:p-24 max-w-4xl mx-auto flex items-center justify-center">
      <div className="w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Left Column: Room Details */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Checkout</h2>
            <p className="text-slate-400 mb-8">Complete your reservation securely.</p>
            
            <div className="bg-slate-900/50 rounded-2xl p-6 mb-6">
              <img src={booking.room.imageUrl} alt="Room" className="w-full h-48 object-cover rounded-xl mb-4" />
              <h3 className="text-xl font-bold text-white">{booking.room.name}</h3>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                <span className="text-slate-400">Total Price</span>
                <span className="text-2xl font-bold text-emerald-400">{formattedPrice}</span>
              </div>
            </div>
          </div>

          {/* Right Column: The Interactive React Component */}
          <CheckoutForm bookingId={booking.id} lockedUntil={booking.lockedUntil} />
          
        </div>
      </div>
    </main>
  );
}