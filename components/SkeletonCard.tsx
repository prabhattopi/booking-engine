// src/components/SkeletonCard.tsx
export default function SkeletonCard() {
    return (
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/30 animate-pulse shadow-xl h-[450px]">
        {/* Image Placeholder */}
        <div className="h-64 bg-slate-700/50 relative">
          {/* Price Tag Placeholder */}
          <div className="absolute top-4 right-4 h-6 w-24 bg-slate-600/50 rounded-full" />
        </div>
  
        <div className="flex flex-col flex-grow p-6">
          {/* Category Placeholder */}
          <div className="h-4 w-24 bg-slate-700/50 rounded mb-4" />
          
          {/* Title Placeholder */}
          <div className="h-8 w-3/4 bg-slate-700/50 rounded mb-4" />
          
          {/* Description Placeholder */}
          <div className="space-y-2 mb-6 flex-grow">
            <div className="h-4 w-full bg-slate-700/50 rounded" />
            <div className="h-4 w-5/6 bg-slate-700/50 rounded" />
          </div>
          
          {/* Button Placeholder */}
          <div className="h-12 w-full bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    );
  }