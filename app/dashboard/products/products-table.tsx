"use client";

import { useState } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { VariantFormDialog } from "@/components/dashboard/variant-form-dialog";
import { deleteVariant } from "@/server/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Variant {
  id: string;
  productId: string;
  sku: string;
  color: "white" | "black";
  material: "gloss" | "matte";
  size: "standard" | "xl";
  priceInCents: number;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  active: boolean;
}

interface ProductsTableProps {
  variants: Variant[];
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

// Default product ID for the single ACM product
const DEFAULT_PRODUCT_ID = "00000000-0000-0000-0000-000000000001";

export function ProductsTable({ variants }: ProductsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<Variant | null>(null);

  const filteredVariants = variants.filter(
    (v) =>
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.material.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedVariant(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (variant: Variant) => {
    setSelectedVariant(variant);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!variantToDelete) return;
    
    try {
      await deleteVariant(variantToDelete.id);
      toast.success("Variant deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete variant");
    } finally {
      setDeleteDialogOpen(false);
      setVariantToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Product Variants</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU..."
                  className="pl-9 w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVariants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {variants.length === 0
                  ? "No variants yet. Create your first variant to get started."
                  : "No variants match your search."}
              </p>
              {variants.length === 0 && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Variant
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded-full border ${
                            variant.color === "white"
                              ? "bg-white border-gray-300"
                              : "bg-gray-900 border-gray-700"
                          }`}
                        />
                        <span className="capitalize">{variant.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{variant.material}</TableCell>
                    <TableCell className="capitalize">{variant.size}</TableCell>
                    <TableCell className="text-right">{formatPrice(variant.priceInCents)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          variant.stock === 0
                            ? "destructive"
                            : variant.stock <= variant.lowStockThreshold
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {variant.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.active ? "default" : "secondary"}>
                        {variant.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(variant)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setVariantToDelete(variant);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VariantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={selectedVariant?.productId || DEFAULT_PRODUCT_ID}
        variant={selectedVariant}
        mode={dialogMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant ({variantToDelete?.sku})? This action
              cannot be undone.
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
