"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createBulkDiscount, updateBulkDiscount, deleteBulkDiscount } from "@/server/actions/admin";
import { toast } from "sonner";

interface BulkDiscount {
  id: string;
  minQuantity: number;
  discountPercent: number;
  productId: string | null;
  active: boolean;
}

interface BulkDiscountsCardProps {
  bulkDiscounts: BulkDiscount[];
}

export function BulkDiscountsCard({ bulkDiscounts }: BulkDiscountsCardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<BulkDiscount | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<BulkDiscount | null>(null);
  const [formData, setFormData] = useState({ minQuantity: 10, discountPercent: 5 });

  const handleCreate = () => {
    setSelectedDiscount(null);
    setFormData({ minQuantity: 10, discountPercent: 5 });
    setDialogOpen(true);
  };

  const handleEdit = (discount: BulkDiscount) => {
    setSelectedDiscount(discount);
    setFormData({ minQuantity: discount.minQuantity, discountPercent: discount.discountPercent });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (selectedDiscount) {
        await updateBulkDiscount(selectedDiscount.id, formData);
        toast.success("Discount updated");
      } else {
        await createBulkDiscount({
          ...formData,
          active: true,
        });
        toast.success("Discount created");
      }
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to save discount");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!discountToDelete) return;
    
    try {
      await deleteBulkDiscount(discountToDelete.id);
      toast.success("Discount deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete discount");
    } finally {
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bulk Discounts</CardTitle>
              <CardDescription>Quantity-based discount tiers</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Discount
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bulkDiscounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No bulk discounts configured. Add your first discount tier.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {bulkDiscounts.map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg group"
                >
                  <span className="text-sm font-medium">{discount.minQuantity}+ sheets</span>
                  <Badge variant="secondary">{discount.discountPercent}% off</Badge>
                  <div className="hidden group-hover:flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEdit(discount)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => {
                        setDiscountToDelete(discount);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedDiscount ? "Edit Discount" : "Add Bulk Discount"}
              </DialogTitle>
              <DialogDescription>
                Set the minimum quantity and discount percentage.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minQuantity">Minimum Quantity</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  min="1"
                  value={formData.minQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Discount Percentage</Label>
                <div className="relative">
                  <Input
                    id="discountPercent"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 1 })
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedDiscount ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this discount tier? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
