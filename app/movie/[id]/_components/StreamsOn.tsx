import Image from "next/image";
import type { WatchProvider } from "@/lib/tmdb";

interface StreamsOnProps {
  providers: WatchProvider[];
  link?: string | null;
}

export default function StreamsOn({ providers, link }: StreamsOnProps) {
  if (!providers || providers.length === 0) return null;
  const unique = Array.from(new Map(providers.map((p) => [p.provider_id, p])).values()).slice(0, 8);

  return (
    <div>
      <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Streams On</h2>
      <div className="flex flex-wrap gap-3">
        {unique.map((p) => {
          const logo = `https://image.tmdb.org/t/p/w92${p.logo_path}`;
          const content = (
            <div className="flex items-center gap-2 bg-[#12121A] border border-white/5 rounded-lg px-3 py-2 hover:border-white/20 transition-colors">
              <Image src={logo} alt={p.provider_name} width={28} height={28} className="rounded-md" />
              <span className="text-sm text-white">{p.provider_name}</span>
            </div>
          );
          return link ? (
            <a key={p.provider_id} href={link} target="_blank" rel="noopener noreferrer">{content}</a>
          ) : (
            <div key={p.provider_id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
