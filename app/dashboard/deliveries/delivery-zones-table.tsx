"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from "@/server/actions/admin";
import { toast } from "sonner";

interface DeliveryZone {
  id: string;
  name: string;
  radiusKm: number;
  baseFeeInCents: number;
  perSheetFeeInCents: number;
  minOrderSheets: number;
  active: boolean;
}

interface DeliveryZonesTableProps {
  zones: DeliveryZone[];
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function DeliveryZonesTable({ zones }: DeliveryZonesTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    radiusKm: 25,
    baseFeeInCents: 5000,
    perSheetFeeInCents: 0,
    minOrderSheets: 1,
    active: true,
  });

  const handleCreate = () => {
    setSelectedZone(null);
    setFormData({
      name: "",
      radiusKm: 25,
      baseFeeInCents: 5000,
      perSheetFeeInCents: 0,
      minOrderSheets: 1,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      radiusKm: zone.radiusKm,
      baseFeeInCents: zone.baseFeeInCents,
      perSheetFeeInCents: zone.perSheetFeeInCents,
      minOrderSheets: zone.minOrderSheets,
      active: zone.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (selectedZone) {
        await updateDeliveryZone(selectedZone.id, formData);
        toast.success("Delivery zone updated");
      } else {
        await createDeliveryZone(formData);
        toast.success("Delivery zone created");
      }
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to save delivery zone");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!zoneToDelete) return;
    
    try {
      await deleteDeliveryZone(zoneToDelete.id);
      toast.success("Delivery zone deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete delivery zone");
    } finally {
      setDeleteDialogOpen(false);
      setZoneToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Delivery Zones</CardTitle>
              <CardDescription>Configure local delivery areas and pricing</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No delivery zones configured yet.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Zone
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead className="text-center">Radius</TableHead>
                  <TableHead className="text-right">Base Fee</TableHead>
                  <TableHead className="text-right">Per Sheet</TableHead>
                  <TableHead className="text-center">Min. Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="text-center">{zone.radiusKm} km</TableCell>
                    <TableCell className="text-right">{formatPrice(zone.baseFeeInCents)}</TableCell>
                    <TableCell className="text-right">
                      {zone.perSheetFeeInCents > 0
                        ? formatPrice(zone.perSheetFeeInCents)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">{zone.minOrderSheets} sheet(s)</TableCell>
                    <TableCell>
                      <Badge variant={zone.active ? "default" : "secondary"}>
                        {zone.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(zone)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            setZoneToDelete(zone);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
              </DialogTitle>
              <DialogDescription>
                Configure the delivery area and pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Perth Metro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="radiusKm">Radius (km)</Label>
                  <Input
                    id="radiusKm"
                    type="number"
                    min="1"
                    value={formData.radiusKm}
                    onChange={(e) =>
                      setFormData({ ...formData, radiusKm: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minOrderSheets">Min. Sheets</Label>
                  <Input
                    id="minOrderSheets"
                    type="number"
                    min="1"
                    value={formData.minOrderSheets}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderSheets: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseFee">Base Fee (inc. GST)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="baseFee"
                      type="number"
                      step="0.01"
                      value={(formData.baseFeeInCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          baseFeeInCents: Math.round(parseFloat(e.target.value) * 100),
                        })
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perSheetFee">Per Sheet Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="perSheetFee"
                      type="number"
                      step="0.01"
                      value={(formData.perSheetFeeInCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          perSheetFeeInCents: Math.round(parseFloat(e.target.value) * 100),
                        })
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedZone ? "Save Changes" : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{zoneToDelete?.name}&quot;? This action cannot be
              undone.
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
