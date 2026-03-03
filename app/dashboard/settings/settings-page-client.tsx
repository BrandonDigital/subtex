"use client";

import { useState } from "react";
import { ArrowRight, History, Loader2, Save, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { updateCuttingFeePerSheet } from "@/server/actions/settings";
import { useRouter } from "next/navigation";

interface HistoryEntry {
  id: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
  changedByName: string | null;
  changedByEmail: string | null;
}

interface SettingsPageClientProps {
  cuttingFeeInCents: number;
  cuttingFeeHistory: HistoryEntry[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatCentsValue(value: string | null): string {
  if (value === null) return "—";
  const cents = parseInt(value, 10);
  if (isNaN(cents)) return value;
  return `$${formatDollars(cents)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SettingsPageClient({
  cuttingFeeInCents,
  cuttingFeeHistory,
}: SettingsPageClientProps) {
  const router = useRouter();
  const [cuttingFee, setCuttingFee] = useState(formatDollars(cuttingFeeInCents));
  const [isSaving, setIsSaving] = useState(false);
  const [savedValue, setSavedValue] = useState(cuttingFeeInCents);

  const currentValueInCents = Math.round(parseFloat(cuttingFee || "0") * 100);
  const hasChanges = currentValueInCents !== savedValue;

  const handleSaveCuttingFee = async () => {
    const valueInCents = Math.round(parseFloat(cuttingFee || "0") * 100);

    if (isNaN(valueInCents) || valueInCents < 0) {
      toast.error("Please enter a valid fee amount");
      return;
    }

    setIsSaving(true);
    try {
      await updateCuttingFeePerSheet(valueInCents);
      setSavedValue(valueInCents);
      toast.success("Cutting service fee updated");
      router.refresh();
    } catch {
      toast.error("Failed to update cutting fee");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cutting Service Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Cutting Service Fee
          </CardTitle>
          <CardDescription>
            Set the per-sheet fee charged when a customer requests CNC cutting on
            their order. This fee is applied to each sheet that has a cutting
            specification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="cuttingFee">Fee per sheet (AUD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="cuttingFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cuttingFee}
                  onChange={(e) => setCuttingFee(e.target.value)}
                  className="pl-7"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                GST-inclusive. Currently{" "}
                <strong>${formatDollars(savedValue)}</strong> per sheet.
              </p>
            </div>
            <Button
              onClick={handleSaveCuttingFee}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How it works</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                The cutting fee is added per sheet that has a cutting plan configured
              </li>
              <li>
                It appears as a separate &ldquo;Cutting Service&rdquo; line item in
                the checkout summary
              </li>
              <li>
                Set to $0.00 to disable the cutting fee
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Change History */}
      {cuttingFeeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Change History
            </CardTitle>
            <CardDescription>
              Recent changes to the cutting service fee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cuttingFeeHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-muted-foreground">
                      {formatCentsValue(entry.oldValue)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatCentsValue(entry.newValue)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span>{entry.changedByName || entry.changedByEmail || "Unknown"}</span>
                    <span>{formatDate(entry.changedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
