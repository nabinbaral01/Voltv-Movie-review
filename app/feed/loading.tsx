import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";

export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
          <div className="space-y-1">
            <div className="h-6 w-24 bg-[#1A1A28] rounded animate-pulse" />
            <div className="h-3 w-60 bg-[#1A1A28] rounded animate-pulse" />
          </div>

          <div className="card p-4 h-32 animate-pulse" />

          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1A28] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-[#1A1A28] rounded animate-pulse" />
                <div className="h-3 w-full bg-[#1A1A28] rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-[#1A1A28] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
