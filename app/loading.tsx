import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title row */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-40 bg-[#1A1A28] rounded animate-pulse" />
              <div className="h-4 w-24 bg-[#1A1A28] rounded animate-pulse" />
            </div>

            {/* Filter row */}
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-[#1A1A28] rounded-full animate-pulse" />
              ))}
            </div>

            {/* Hero / banner placeholder */}
            <div className="h-48 sm:h-64 w-full bg-[#1A1A28] rounded-xl animate-pulse" />

            {/* Poster grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-[2/3] w-full bg-[#1A1A28] rounded-lg animate-pulse" />
                  <div className="h-3 w-3/4 bg-[#1A1A28] rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-[#1A1A28] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
