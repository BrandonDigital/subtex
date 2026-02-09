"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Announcement } from "@/server/schemas/announcements";
import {
  createAnnouncement,
  updateAnnouncement,
} from "@/server/actions/announcements";

interface AnnouncementFormData {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  link: string;
  linkText: string;
  dismissible: boolean;
  startDate: string;
  endDate: string;
}

const defaultFormData: AnnouncementFormData = {
  title: "",
  message: "",
  type: "info",
  link: "",
  linkText: "",
  dismissible: true,
  startDate: "",
  endDate: "",
};

function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

interface AnnouncementEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  mode: "create" | "edit";
}

export function AnnouncementEditPanel({
  isOpen,
  onClose,
  announcement,
  mode,
}: AnnouncementEditPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>(defaultFormData);

  const isEditing = mode === "edit";

  // Handle open/close animations and form data initialization
  useEffect(() => {
    if (isOpen) {
      if (announcement && mode === "edit") {
        setFormData({
          title: announcement.title,
          message: announcement.message,
          type: announcement.type,
          link: announcement.link || "",
          linkText: announcement.linkText || "",
          dismissible: announcement.dismissible,
          startDate: formatDateForInput(announcement.startDate),
          endDate: formatDateForInput(announcement.endDate),
        });
      } else {
        setFormData(defaultFormData);
      }
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, announcement, mode]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleChange = (
    field: keyof AnnouncementFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast.error("Message is required");
      return;
    }

    setIsLoading(true);

    try {
      const data = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        link: formData.link.trim() || null,
        linkText: formData.linkText.trim() || null,
        dismissible: formData.dismissible,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
      };

      if (isEditing && announcement) {
        await updateAnnouncement(announcement.id, data);
        toast.success("Announcement updated");
      } else {
        await createAnnouncement(data);
        toast.success("Announcement created");
      }

      router.refresh();
      handleClose();
    } catch {
      toast.error(
        isEditing ? "Failed to update announcement" : "Failed to create announcement"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-16 bottom-0 left-0 right-0 z-40 bg-background transition-transform duration-300 ease-in-out ${
        isClosing ? "translate-x-full" : "translate-x-0"
      } ${!isClosing && isOpen ? "animate-in slide-in-from-right" : ""}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b bg-background">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {isEditing ? "Edit Announcement" : "Create Announcement"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Update the announcement banner details"
                : "Create a new banner to display across the site"}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    handleChange("type", value as AnnouncementFormData["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Info
                      </div>
                    </SelectItem>
                    <SelectItem value="warning">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Warning
                      </div>
                    </SelectItem>
                    <SelectItem value="success">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Success
                      </div>
                    </SelectItem>
                    <SelectItem value="error">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Error
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g., Sale Alert"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Enter your announcement message..."
                  rows={4}
                />
              </div>

              <Separator />

              {/* Link Section */}
              <div className="space-y-4">
                <Label className="text-base">Link (optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="link" className="text-sm text-muted-foreground">
                      URL
                    </Label>
                    <Input
                      id="link"
                      type="url"
                      value={formData.link}
                      onChange={(e) => handleChange("link", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkText" className="text-sm text-muted-foreground">
                      Link Text
                    </Label>
                    <Input
                      id="linkText"
                      value={formData.linkText}
                      onChange={(e) => handleChange("linkText", e.target.value)}
                      placeholder="Learn more"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Schedule Section */}
              <div className="space-y-4">
                <Label className="text-base">Schedule</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to start immediately
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no end date
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dismissible Option */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="dismissible" className="cursor-pointer text-base">
                    Dismissible
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to close this announcement
                  </p>
                </div>
                <Switch
                  id="dismissible"
                  checked={formData.dismissible}
                  onCheckedChange={(checked) => handleChange("dismissible", checked)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-background">
            <div className="max-w-2xl mx-auto flex items-center justify-end gap-3 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !formData.message.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Announcement" : "Create Announcement"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
