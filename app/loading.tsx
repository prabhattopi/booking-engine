// src/app/loading.tsx
import SkeletonCard from "@/components/SkeletonCard";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Hero Section Placeholder */}
      <div className="py-20 text-center animate-pulse">
        <div className="h-16 w-3/4 md:w-1/2 bg-slate-800/50 rounded-2xl mx-auto mb-4" />
        <div className="h-6 w-2/3 md:w-1/3 bg-slate-800/50 rounded-full mx-auto" />
      </div>

      {/* Grid of Skeleton Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </main>
  );
}