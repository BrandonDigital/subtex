"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminUpdateCompany,
  type CompanyWithMemberCount,
} from "@/server/actions/companies";
import { toast } from "@/components/ui/toast";

interface EditCompanyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyWithMemberCount | null;
}

export function EditCompanyPanel({
  isOpen,
  onClose,
  company,
}: EditCompanyPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
  });

  useEffect(() => {
    if (isOpen && company) {
      setFormData({
        name: company.name,
        url: company.url || "",
      });
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, company]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsLoading(true);
    try {
      await adminUpdateCompany(company.id, {
        name: formData.name,
        url: formData.url || null,
      });

      toast.success("Company updated successfully");
      router.refresh();
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update company"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || !company) return null;

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
            <h1 className="text-xl font-semibold">Edit Company</h1>
            <p className="text-sm text-muted-foreground">
              Update company details
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
              <div className="space-y-2">
                <Label htmlFor="edit-name">Company Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">Website URL</Label>
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. The company&apos;s website address.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-background">
            <div className="max-w-2xl mx-auto flex items-center justify-end gap-3 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !formData.name}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
