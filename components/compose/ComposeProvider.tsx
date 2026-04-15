"use client";

import { createContext, useContext, useState, useCallback } from "react";
import ComposeOverlay from "./ComposeOverlay";

interface ComposeCtx {
  openCompose: () => void;
}

const Ctx = createContext<ComposeCtx>({ openCompose: () => {} });

export function useCompose() {
  return useContext(Ctx);
}

export default function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCompose = useCallback(() => setOpen(true), []);

  return (
    <Ctx.Provider value={{ openCompose }}>
      {children}
      {open && <ComposeOverlay onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}
