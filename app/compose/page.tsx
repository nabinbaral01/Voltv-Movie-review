"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompose } from "@/components/compose/ComposeProvider";

export default function ComposePage() {
  const { openCompose } = useCompose();
  const router = useRouter();

  useEffect(() => {
    openCompose();
    router.back();
  }, [openCompose, router]);

  return null;
}
