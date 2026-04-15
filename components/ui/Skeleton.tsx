import { cn } from "@/utils/formatters";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-full aspect-[2/3] rounded-[10px]" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function MovieHeroSkeleton() {
  return (
    <div className="w-full h-[500px] rounded-none">
      <Skeleton className="w-full h-full" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full h-48" />
      <div className="px-4 space-y-3">
        <div className="flex items-end gap-4 -mt-12">
          <Skeleton className="w-24 h-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pb-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 space-y-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-[12px]" />
      </div>
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export function DebateCardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-3/4 mx-auto" />
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-32 rounded-[10px]" />
        <div className="flex items-center"><Skeleton className="w-8 h-8 rounded-full" /></div>
        <Skeleton className="flex-1 h-32 rounded-[10px]" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
  );
}
