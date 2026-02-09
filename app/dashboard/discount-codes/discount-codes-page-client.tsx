"use client";

import { useState, useCallback } from "react";
import { Ticket } from "lucide-react";
import { DiscountCodesTable } from "./discount-codes-table";
import { DiscountCodeEditPanel } from "./discount-code-edit-panel";
import type { DiscountCode } from "@/server/schemas/discount-codes";

interface DiscountCodesPageClientProps {
  discountCodes: DiscountCode[];
  stats: {
    total: number;
    active: number;
    expired: number;
    totalUsed: number;
  };
}

export function DiscountCodesPageClient({
  discountCodes,
  stats,
}: DiscountCodesPageClientProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [selectedCode, setSelectedCode] = useState<DiscountCode | null>(null);

  const handleCreate = useCallback(() => {
    setSelectedCode(null);
    setPanelMode("create");
    setShowPanel(true);
  }, []);

  const handleEdit = useCallback((code: DiscountCode) => {
    setSelectedCode(code);
    setPanelMode("edit");
    setShowPanel(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setShowPanel(false);
    setSelectedCode(null);
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Discount Codes</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes for customers to use at checkout
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Codes</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-sm font-medium">Expired</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.expired}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Total Uses</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalUsed}</p>
          </div>
        </div>

        <DiscountCodesTable
          discountCodes={discountCodes}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </div>

      {/* Create/Edit Panel Overlay */}
      <DiscountCodeEditPanel
        isOpen={showPanel}
        onClose={handleClosePanel}
        discountCode={selectedCode}
        mode={panelMode}
      />
    </>
  );
}
