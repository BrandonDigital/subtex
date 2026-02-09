"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AddressFormDialog } from "@/components/address-form-dialog";
import { deleteAddress, setDefaultAddress } from "@/server/actions/addresses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Address } from "@/server/schemas/users";

interface AddressBookProps {
  addresses: Address[];
  userName?: string;
  userPhone?: string;
}

export function AddressBook({
  addresses,
  userName = "",
  userPhone = "",
}: AddressBookProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddNew = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAddressId) return;

    setIsDeleting(true);
    try {
      await deleteAddress(deletingAddressId);
      toast.success("Address deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete address"
      );
    } finally {
      setIsDeleting(false);
      setDeletingAddressId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId);
      toast.success("Default address updated");
      router.refresh();
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to set default address"
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between space-y-0'>
          <div>
            <CardTitle>My Addresses</CardTitle>
            <CardDescription>Manage your shipping addresses</CardDescription>
          </div>
          <Button onClick={handleAddNew} className='gap-2'>
            <Plus className='h-4 w-4' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='space-y-4'>
          {addresses.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>No saved addresses yet.</p>
              <p className='text-sm mt-1'>
                Add a shipping address for faster checkout.
              </p>
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-lg transition-colors",
                  address.isDefault && "border-foreground"
                )}
              >
                {/* Radio button for default selection */}
                <button
                  type='button'
                  onClick={() =>
                    !address.isDefault && handleSetDefault(address.id)
                  }
                  className='mt-1 shrink-0'
                  aria-label={
                    address.isDefault
                      ? "Default address"
                      : "Set as default address"
                  }
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      address.isDefault
                        ? "border-foreground"
                        : "border-muted-foreground/50 hover:border-muted-foreground"
                    )}
                  >
                    {address.isDefault && (
                      <div className='w-3 h-3 rounded-full bg-foreground' />
                    )}
                  </div>
                </button>

                {/* Address details */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-semibold'>
                      {address.recipientName || address.label || "Address"}
                    </span>
                    {address.isDefault && (
                      <span className='text-xs bg-muted px-2 py-0.5 rounded border'>
                        Default
                      </span>
                    )}
                    {address.label && (
                      <span className='text-xs bg-muted px-2 py-0.5 rounded border'>
                        {address.label}
                      </span>
                    )}
                  </div>
                  <div className='mt-2 text-sm text-muted-foreground space-y-0.5'>
                    <p>
                      {address.unit && `${address.unit}, `}
                      {address.street}
                    </p>
                    <p>
                      {address.suburb}, {address.state} {address.postcode}
                    </p>
                    <p>{address.country}</p>
                    {address.phone && <p className='mt-1'>{address.phone}</p>}
                  </div>
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='shrink-0 h-8 w-8'
                    >
                      <MoreVertical className='h-4 w-4' />
                      <span className='sr-only'>Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => handleEdit(address)}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant='destructive'
                      onClick={() => setDeletingAddressId(address.id)}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Address Form Dialog */}
      <AddressFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        address={editingAddress}
        defaultRecipientName={userName}
        defaultPhone={userPhone}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingAddressId}
        onOpenChange={(open) => !open && setDeletingAddressId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
