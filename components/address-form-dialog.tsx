"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AddressAutocompleteInput,
  type AddressComponents,
} from "@/components/address-autocomplete-input";
import {
  createAddress,
  updateAddress,
  type AddressInput,
} from "@/server/actions/addresses";
import { toast } from "sonner";
import type { Address } from "@/server/schemas/users";

const AUSTRALIAN_STATES = [
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NSW", label: "New South Wales" },
  { value: "NT", label: "Northern Territory" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "VIC", label: "Victoria" },
  { value: "WA", label: "Western Australia" },
];

const ADDRESS_LABELS = [
  { value: "Home", label: "Home" },
  { value: "Work", label: "Work" },
  { value: "Other", label: "Other" },
];

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: Address | null;
  defaultRecipientName?: string;
  defaultPhone?: string;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  address,
  defaultRecipientName = "",
  defaultPhone = "",
}: AddressFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("Home");
  const [streetInput, setStreetInput] = useState("");
  const [unit, setUnit] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("Australia");
  const [placeId, setPlaceId] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const isEditing = !!address;

  // Reset form when dialog opens/closes or address changes
  useEffect(() => {
    if (open) {
      if (address) {
        setRecipientName(address.recipientName || "");
        setPhone(address.phone || "");
        setLabel(address.label || "Home");
        setStreetInput(address.street || "");
        setUnit(address.unit || "");
        setSuburb(address.suburb || "");
        setState(address.state || "");
        setPostcode(address.postcode || "");
        setCountry(address.country || "Australia");
        setPlaceId(address.placeId || "");
        setIsDefault(address.isDefault || false);
      } else {
        setRecipientName(defaultRecipientName);
        setPhone(defaultPhone);
        setLabel("Home");
        setStreetInput("");
        setUnit("");
        setSuburb("");
        setState("");
        setPostcode("");
        setCountry("Australia");
        setPlaceId("");
        setIsDefault(false);
      }
    }
  }, [open, address, defaultRecipientName, defaultPhone]);

  const handleAddressSelect = (addressComponents: AddressComponents) => {
    setStreetInput(addressComponents.street);
    setUnit(addressComponents.unit);
    setSuburb(addressComponents.suburb);
    setState(addressComponents.state);
    setPostcode(addressComponents.postcode);
    setCountry(addressComponents.country);
    setPlaceId(addressComponents.placeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim()) {
      toast.error("Please enter a recipient name");
      return;
    }

    if (!streetInput.trim()) {
      toast.error("Please enter a street address");
      return;
    }

    if (!suburb.trim()) {
      toast.error("Please enter a suburb");
      return;
    }

    if (!state) {
      toast.error("Please select a state");
      return;
    }

    if (!postcode.trim()) {
      toast.error("Please enter a postcode");
      return;
    }

    setIsSubmitting(true);

    try {
      const addressData: AddressInput = {
        recipientName: recipientName.trim(),
        phone: phone.trim() || undefined,
        label: label || undefined,
        street: streetInput.trim(),
        unit: unit.trim() || undefined,
        suburb: suburb.trim(),
        state,
        postcode: postcode.trim(),
        country,
        placeId: placeId || undefined,
        isDefault,
      };

      if (isEditing && address) {
        await updateAddress(address.id, addressData);
        toast.success("Address updated successfully");
      } else {
        await createAddress(addressData);
        toast.success("Address added successfully");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save address"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Address" : "Add New Address"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your delivery address details."
              : "Add a new delivery address to your address book."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Recipient Name */}
          <div className='space-y-2'>
            <Label htmlFor='recipientName'>Recipient Name *</Label>
            <Input
              id='recipientName'
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder='John Doe'
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Phone */}
          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone Number</Label>
            <Input
              id='phone'
              type='tel'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='04XX XXX XXX'
              disabled={isSubmitting}
            />
          </div>

          {/* Address Label */}
          <div className='space-y-2'>
            <Label htmlFor='label'>Address Label</Label>
            <Select
              value={label}
              onValueChange={setLabel}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a label' />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_LABELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Street Address with Autocomplete */}
          <div className='space-y-2'>
            <Label htmlFor='street'>Street Address *</Label>
            <AddressAutocompleteInput
              value={streetInput}
              onChange={setStreetInput}
              onAddressSelect={handleAddressSelect}
              placeholder='Start typing your address...'
              disabled={isSubmitting}
            />
          </div>

          {/* Unit/Apt */}
          <div className='space-y-2'>
            <Label htmlFor='unit'>Unit / Apt / Suite</Label>
            <Input
              id='unit'
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder='Apt 4B, Suite 100, etc.'
              disabled={isSubmitting}
            />
          </div>

          {/* City/Suburb and State */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='suburb'>Suburb *</Label>
              <Input
                id='suburb'
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder='Suburb'
                disabled={isSubmitting}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='state'>State *</Label>
              <Select
                value={state}
                onValueChange={setState}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select state' />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Postcode and Country */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='postcode'>Postcode *</Label>
              <Input
                id='postcode'
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder='6155'
                disabled={isSubmitting}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='country'>Country</Label>
              <Input
                id='country'
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Set as Default */}
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='isDefault'
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor='isDefault'
              className='text-sm font-normal cursor-pointer'
            >
              Set as default address
            </Label>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Address"
              ) : (
                "Add Address"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
