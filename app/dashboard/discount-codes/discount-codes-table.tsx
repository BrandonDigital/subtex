"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Percent,
  DollarSign,
  Copy,
  Truck,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { DiscountCode } from "@/server/schemas/discount-codes";
import {
  deleteDiscountCode,
  toggleDiscountCodeActive,
} from "@/server/actions/discount-codes";

interface DiscountCodesTableProps {
  discountCodes: DiscountCode[];
  onEdit: (code: DiscountCode) => void;
  onCreate: () => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getCodeStatus(code: DiscountCode): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (!code.active) {
    return { label: "Inactive", variant: "secondary" };
  }

  const now = new Date();
  const startDate = code.startDate ? new Date(code.startDate) : null;
  const endDate = code.endDate ? new Date(code.endDate) : null;

  if (startDate && startDate > now) {
    return { label: "Scheduled", variant: "outline" };
  }

  if (endDate && endDate < now) {
    return { label: "Expired", variant: "secondary" };
  }

  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return { label: "Depleted", variant: "secondary" };
  }

  return { label: "Active", variant: "default" };
}

export function DiscountCodesTable({
  discountCodes,
  onEdit,
  onCreate,
}: DiscountCodesTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<DiscountCode | null>(null);

  const handleDelete = (code: DiscountCode) => {
    setSelectedCode(code);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (code: DiscountCode) => {
    try {
      await toggleDiscountCodeActive(code.id);
      toast.success(code.active ? "Code deactivated" : "Code activated");
      router.refresh();
    } catch {
      toast.error("Failed to update discount code");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCode) return;

    try {
      await deleteDiscountCode(selectedCode.id);
      toast.success(
        selectedCode.usedCount > 0
          ? "Discount code deactivated (has usage history)"
          : "Discount code deleted"
      );
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete discount code");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Discount Codes</CardTitle>
              <CardDescription>
                Create promo codes with percentage or fixed discounts
              </CardDescription>
            </div>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Discount Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {discountCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No discount codes yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first discount code for customers to use at checkout
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead className="text-center">Uses</TableHead>
                  <TableHead>Min. Purchase</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountCodes.map((code) => {
                  const status = getCodeStatus(code);

                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {code.description && (
                          <p className="mt-1 text-xs text-muted-foreground max-w-xs truncate">
                            {code.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {code.discountType === "percentage" ? (
                            <>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {code.discountValue}% off
                              </span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatPrice(code.discountValue)} off
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {code.discountTarget === "shipping" ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Truck className="h-3 w-3" />
                              Shipping
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Subtotal
                            </Badge>
                          )}
                        </div>
                        {code.discountType === "percentage" &&
                          code.maxDiscountInCents && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Max: {formatPrice(code.maxDiscountInCents)}
                            </p>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            <span className="text-muted-foreground">From: </span>
                            {formatDate(code.startDate)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Until: </span>
                            {formatDate(code.endDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{code.usedCount}</span>
                        {code.maxUses !== null && (
                          <span className="text-muted-foreground">
                            {" "}
                            / {code.maxUses}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.minPurchaseInCents
                          ? formatPrice(code.minPurchaseInCents)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(code)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyCode(code.code)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(code)}
                            >
                              {code.active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(code)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCode && selectedCode.usedCount > 0 ? (
                <>
                  This code has been used {selectedCode.usedCount} time(s). It
                  will be deactivated instead of deleted to preserve order history.
                </>
              ) : (
                <>
                  Are you sure you want to delete this discount code? This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {selectedCode && selectedCode.usedCount > 0
                ? "Deactivate"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
