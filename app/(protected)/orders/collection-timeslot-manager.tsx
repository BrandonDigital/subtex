"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { bookCollectionTimeslot } from "@/server/actions/orders";

const WA_PUBLIC_HOLIDAYS = new Set([
  "2025-01-01", "2025-01-27", "2025-03-03", "2025-04-18", "2025-04-19",
  "2025-04-21", "2025-04-25", "2025-06-02", "2025-09-29", "2025-12-25",
  "2025-12-26",
  "2026-01-01", "2026-01-26", "2026-03-02", "2026-04-03", "2026-04-04",
  "2026-04-06", "2026-06-01", "2026-09-28", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-01-26", "2027-03-01", "2027-03-26", "2027-03-27",
  "2027-03-29", "2027-04-26", "2027-06-07", "2027-09-27", "2027-12-27",
  "2027-12-28",
]);

interface CollectionDay {
  dateKey: string;
  dayLabel: string;
  dateLabel: string;
  morningAvailable: boolean;
  afternoonAvailable: boolean;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getAvailableCollectionDays(): CollectionDay[] {
  const perthNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
  const isAfterNoon = perthNow.getHours() >= 12;

  const days: CollectionDay[] = [];
  let daysAdded = 0;
  let dayOffset = 1;

  while (daysAdded < 20) {
    const date = new Date(perthNow);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const dateKey = toDateKey(date);

    if (date.getDay() === 0 || date.getDay() === 6) {
      dayOffset++;
      continue;
    }

    if (WA_PUBLIC_HOLIDAYS.has(dateKey)) {
      dayOffset++;
      continue;
    }

    const morningAvailable = daysAdded === 0 ? !isAfterNoon : true;

    days.push({
      dateKey,
      dayLabel: date.toLocaleDateString("en-AU", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      }),
      morningAvailable,
      afternoonAvailable: true,
    });

    daysAdded++;
    dayOffset++;
  }

  return days;
}

interface CollectionTimeslotManagerProps {
  orderId: string;
  currentDate: string | null;
  currentSlot: string | null;
  orderStatus: string;
  hasBackorderItems: boolean | null;
}

export function CollectionTimeslotManager({
  orderId,
  currentDate,
  currentSlot,
  orderStatus,
  hasBackorderItems,
}: CollectionTimeslotManagerProps) {
  const [isEditing, setIsEditing] = useState(!currentDate);
  const [selectedDate, setSelectedDate] = useState(currentDate || "");
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | "">(
    (currentSlot as "morning" | "afternoon") || ""
  );
  const [datePageIndex, setDatePageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const availableDays = useMemo(() => getAvailableCollectionDays(), []);

  const canEdit = ["paid", "processing"].includes(orderStatus);

  // Check if the current date is in the past (missed pickup)
  const isPastDate = useMemo(() => {
    if (!currentDate) return false;
    const perthNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
    );
    const todayKey = toDateKey(perthNow);
    return currentDate < todayKey;
  }, [currentDate]);

  const handleSave = async () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and timeslot");
      return;
    }

    setIsSaving(true);
    try {
      const result = await bookCollectionTimeslot(
        orderId,
        selectedDate,
        selectedSlot
      );

      if (result.success) {
        toast.success(
          currentDate ? "Collection rescheduled" : "Collection booked"
        );
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update timeslot");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit && currentDate) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          {currentDate && !isEditing ? "Collection Appointment" : "Book Collection"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missed pickup warning */}
        {isPastDate && !isEditing && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Missed pickup
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Your collection appointment has passed. Please reschedule below.
            </p>
          </div>
        )}

        {/* Backorder notice */}
        {hasBackorderItems && !currentDate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              Backorder items are now ready for collection. Book a timeslot below.
            </p>
          </div>
        )}

        {/* Current timeslot display */}
        {currentDate && !isEditing && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-semibold">
                {new Intl.DateTimeFormat("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(currentDate + "T00:00:00"))}
              </p>
              {currentSlot && (
                <p className="text-sm text-muted-foreground">
                  {currentSlot === "morning"
                    ? "Morning (8:00 AM - 11:30 AM)"
                    : "Afternoon (1:00 PM - 3:30 PM)"}
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsEditing(true)}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                {isPastDate ? "Reschedule Pickup" : "Change Date"}
              </Button>
            )}
          </div>
        )}

        {/* Date/slot picker */}
        {isEditing && (
          <div className="space-y-4">
            {/* Date selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Collection Date
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={datePageIndex === 0}
                    onClick={() => setDatePageIndex((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={
                      datePageIndex >=
                      Math.ceil(availableDays.length / 5) - 1
                    }
                    onClick={() => setDatePageIndex((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableDays
                  .slice(datePageIndex * 5, datePageIndex * 5 + 5)
                  .map((day) => (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.dateKey);
                        if (
                          selectedSlot === "morning" &&
                          !day.morningAvailable
                        ) {
                          setSelectedSlot("");
                        }
                      }}
                      className={`p-2 text-center border rounded-lg transition-colors text-sm ${
                        selectedDate === day.dateKey
                          ? "bg-foreground text-background border-foreground"
                          : "hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="font-medium">{day.dayLabel}</div>
                      <div
                        className={`text-xs ${
                          selectedDate === day.dateKey
                            ? "text-background/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day.dateLabel}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Timeslot selection */}
            {selectedDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Collection Time
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const day = availableDays.find(
                      (d) => d.dateKey === selectedDate
                    );
                    return (
                      <>
                        <button
                          type="button"
                          disabled={!day?.morningAvailable}
                          onClick={() => setSelectedSlot("morning")}
                          className={`p-3 text-left border rounded-lg transition-colors ${
                            selectedSlot === "morning"
                              ? "bg-foreground text-background border-foreground"
                              : !day?.morningAvailable
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="font-medium text-sm">Morning</div>
                          <div
                            className={`text-xs ${
                              selectedSlot === "morning"
                                ? "text-background/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            8:00 AM &ndash; 11:30 AM
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={!day?.afternoonAvailable}
                          onClick={() => setSelectedSlot("afternoon")}
                          className={`p-3 text-left border rounded-lg transition-colors ${
                            selectedSlot === "afternoon"
                              ? "bg-foreground text-background border-foreground"
                              : !day?.afternoonAvailable
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="font-medium text-sm">Afternoon</div>
                          <div
                            className={`text-xs ${
                              selectedSlot === "afternoon"
                                ? "text-background/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            1:00 PM &ndash; 3:30 PM
                          </div>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!selectedDate || !selectedSlot || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-2" />
                )}
                {currentDate ? "Reschedule" : "Book Collection"}
              </Button>
              {currentDate && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedDate(currentDate);
                    setSelectedSlot(
                      (currentSlot as "morning" | "afternoon") || ""
                    );
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
