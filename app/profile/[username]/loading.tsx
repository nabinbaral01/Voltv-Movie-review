import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-3xl mx-auto pb-24 lg:pb-8">
          {/* Banner */}
          <div className="w-full h-36 sm:h-48 bg-[#1A1A28] animate-pulse" />

          <div className="px-4 sm:px-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#0A0A0F] bg-[#1A1A28] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-[#1A1A28] rounded animate-pulse" />
                <div className="h-3 w-24 bg-[#1A1A28] rounded animate-pulse" />
              </div>
              <div className="h-9 w-28 rounded-[8px] bg-[#1A1A28] animate-pulse" />
            </div>

            <div className="h-3 w-full bg-[#1A1A28] rounded animate-pulse mb-6" />

            <div className="grid grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-3 h-16 animate-pulse" />
              ))}
            </div>

            <div className="card p-4 h-40 mb-6 animate-pulse" />
            <div className="card p-4 h-60 mb-6 animate-pulse" />
            <div className="card p-4 h-40 mb-6 animate-pulse" />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
