"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Percent, DollarSign, ShoppingCart, Truck } from "lucide-react";
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
import type { DiscountCode } from "@/server/schemas/discount-codes";
import {
  createDiscountCode,
  updateDiscountCode,
} from "@/server/actions/discount-codes";

interface DiscountCodeFormData {
  code: string;
  description: string;
  discountType: "percentage" | "fixed_amount";
  discountTarget: "subtotal" | "shipping";
  discountValue: string;
  minPurchaseInCents: string;
  maxDiscountInCents: string;
  maxUses: string;
  maxUsesPerUser: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

const defaultFormData: DiscountCodeFormData = {
  code: "",
  description: "",
  discountType: "percentage",
  discountTarget: "subtotal",
  discountValue: "",
  minPurchaseInCents: "",
  maxDiscountInCents: "",
  maxUses: "",
  maxUsesPerUser: "1",
  startDate: "",
  endDate: "",
  active: true,
};

function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface DiscountCodeEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  discountCode: DiscountCode | null;
  mode: "create" | "edit";
}

export function DiscountCodeEditPanel({
  isOpen,
  onClose,
  discountCode,
  mode,
}: DiscountCodeEditPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<DiscountCodeFormData>(defaultFormData);

  const isEditing = mode === "edit";

  // Handle open/close animations and form data initialization
  useEffect(() => {
    if (isOpen) {
      if (discountCode && mode === "edit") {
        setFormData({
          code: discountCode.code,
          description: discountCode.description || "",
          discountType: discountCode.discountType,
          discountTarget: discountCode.discountTarget || "subtotal",
          discountValue:
            discountCode.discountType === "percentage"
              ? discountCode.discountValue.toString()
              : (discountCode.discountValue / 100).toString(),
          minPurchaseInCents: discountCode.minPurchaseInCents
            ? (discountCode.minPurchaseInCents / 100).toString()
            : "",
          maxDiscountInCents: discountCode.maxDiscountInCents
            ? (discountCode.maxDiscountInCents / 100).toString()
            : "",
          maxUses: discountCode.maxUses?.toString() || "",
          maxUsesPerUser: discountCode.maxUsesPerUser?.toString() || "",
          startDate: formatDateForInput(discountCode.startDate),
          endDate: formatDateForInput(discountCode.endDate),
          active: discountCode.active,
        });
      } else {
        setFormData({
          ...defaultFormData,
          code: generateRandomCode(),
        });
      }
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, discountCode, mode]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleChange = (
    field: keyof DiscountCodeFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateCode = () => {
    setFormData((prev) => ({ ...prev, code: generateRandomCode() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Code is required");
      return;
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    if (
      formData.discountType === "percentage" &&
      parseFloat(formData.discountValue) > 100
    ) {
      toast.error("Percentage cannot exceed 100%");
      return;
    }

    setIsLoading(true);

    try {
      const discountValue =
        formData.discountType === "percentage"
          ? parseInt(formData.discountValue)
          : Math.round(parseFloat(formData.discountValue) * 100);

      const data = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discountType: formData.discountType,
        discountTarget: formData.discountTarget,
        discountValue,
        minPurchaseInCents: formData.minPurchaseInCents
          ? Math.round(parseFloat(formData.minPurchaseInCents) * 100)
          : null,
        maxDiscountInCents: formData.maxDiscountInCents
          ? Math.round(parseFloat(formData.maxDiscountInCents) * 100)
          : null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        maxUsesPerUser: formData.maxUsesPerUser
          ? parseInt(formData.maxUsesPerUser)
          : null,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        active: formData.active,
      };

      if (isEditing && discountCode) {
        await updateDiscountCode(discountCode.id, data);
        toast.success("Discount code updated");
      } else {
        await createDiscountCode(data);
        toast.success("Discount code created");
      }

      router.refresh();
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(isEditing ? message : message);
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
              {isEditing ? "Edit Discount Code" : "Create Discount Code"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Update the discount code details"
                : "Create a new promo code for customers"}
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
              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      handleChange("code", e.target.value.toUpperCase())
                    }
                    placeholder="e.g., SAVE10"
                    className="font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateCode}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customers will enter this code at checkout
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (internal)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="e.g., Summer sale 2024 promo"
                  rows={2}
                />
              </div>

              <Separator />

              {/* Discount Type & Value */}
              <div className="space-y-4">
                <Label className="text-base">Discount</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="discountType"
                      className="text-sm text-muted-foreground"
                    >
                      Type
                    </Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) =>
                        handleChange(
                          "discountType",
                          value as "percentage" | "fixed_amount"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Percentage
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed_amount">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fixed Amount
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="discountTarget"
                      className="text-sm text-muted-foreground"
                    >
                      Applies To
                    </Label>
                    <Select
                      value={formData.discountTarget}
                      onValueChange={(value) =>
                        handleChange(
                          "discountTarget",
                          value as "subtotal" | "shipping"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subtotal">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Product Subtotal
                          </div>
                        </SelectItem>
                        <SelectItem value="shipping">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Shipping / Delivery Fee
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="discountValue"
                      className="text-sm text-muted-foreground"
                    >
                      Value *
                    </Label>
                    <div className="relative">
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        step={formData.discountType === "percentage" ? "1" : "0.01"}
                        max={formData.discountType === "percentage" ? "100" : undefined}
                        value={formData.discountValue}
                        onChange={(e) =>
                          handleChange("discountValue", e.target.value)
                        }
                        placeholder={
                          formData.discountType === "percentage" ? "10" : "50.00"
                        }
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {formData.discountType === "percentage" ? "%" : "AUD"}
                      </span>
                    </div>
                  </div>
                </div>

                {formData.discountType === "percentage" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="maxDiscountInCents"
                      className="text-sm text-muted-foreground"
                    >
                      Maximum Discount (optional)
                    </Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="maxDiscountInCents"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maxDiscountInCents}
                        onChange={(e) =>
                          handleChange("maxDiscountInCents", e.target.value)
                        }
                        placeholder="100.00"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cap the discount amount for percentage codes
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Limits */}
              <div className="space-y-4">
                <Label className="text-base">Usage Limits</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="minPurchaseInCents"
                      className="text-sm text-muted-foreground"
                    >
                      Minimum Purchase
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="minPurchaseInCents"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.minPurchaseInCents}
                        onChange={(e) =>
                          handleChange("minPurchaseInCents", e.target.value)
                        }
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="maxUses"
                      className="text-sm text-muted-foreground"
                    >
                      Total Uses (leave blank for unlimited)
                    </Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => handleChange("maxUses", e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label
                    htmlFor="maxUsesPerUser"
                    className="text-sm text-muted-foreground"
                  >
                    Uses Per Customer (leave blank for unlimited)
                  </Label>
                  <Input
                    id="maxUsesPerUser"
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) =>
                      handleChange("maxUsesPerUser", e.target.value)
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-4">
                <Label className="text-base">Schedule</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="startDate"
                      className="text-sm text-muted-foreground"
                    >
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
                    <Label
                      htmlFor="endDate"
                      className="text-sm text-muted-foreground"
                    >
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

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="active" className="cursor-pointer text-base">
                    Active
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this discount code for use at checkout
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => handleChange("active", checked)}
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
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !formData.code.trim() ||
                  !formData.discountValue
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Code" : "Create Code"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
