"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/hooks/use-sidebar-store";

interface MobileSidebarTriggerProps {
  disabled?: boolean;
}

export function MobileSidebarTrigger({ disabled }: MobileSidebarTriggerProps) {
  const toggle = useSidebarStore((state) => state.toggle);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={disabled ? undefined : toggle}
      className="h-9 w-9"
      disabled={disabled}
    >
      <PanelLeft className={`h-4 w-4 ${disabled ? "text-muted-foreground" : ""}`} />
      <span className="sr-only">Toggle Admin Sidebar</span>
    </Button>
  );
}
