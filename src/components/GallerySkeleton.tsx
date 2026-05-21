export default function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="plaque overflow-hidden animate-pulse">
          <div className="aspect-[3/4] bg-[#1A1A1A]" />
          <div className="p-5 space-y-2">
            <div className="h-2 w-16 bg-[#1A1A1A] rounded" />
            <div className="h-4 w-3/4 bg-[#1A1A1A] rounded" />
            <div className="h-3 w-1/2 bg-[#1A1A1A] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
