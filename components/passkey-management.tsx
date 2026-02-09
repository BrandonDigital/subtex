"use client";

import { useState, useEffect } from "react";
import {
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  Smartphone,
  Laptop,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface Passkey {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: Date | null;
}

interface PasskeyManagementProps {
  initialPasskeys: Passkey[];
}

export function PasskeyManagement({ initialPasskeys }: PasskeyManagementProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isDeletingPasskey, setIsDeletingPasskey] = useState<string | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if WebAuthn is supported
    if (typeof window !== "undefined") {
      setIsSupported(
        window.PublicKeyCredential !== undefined &&
          typeof window.PublicKeyCredential === "function"
      );
    }
  }, []);

  const handleAddPasskey = async () => {
    if (!isSupported) {
      toast.error("Passkeys are not supported on this device");
      return;
    }

    setIsAddingPasskey(true);
    try {
      const result = await authClient.passkey.addPasskey({
        name: passkeyName || undefined,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to add passkey");
      }

      toast.success("Passkey added successfully");
      setIsDialogOpen(false);
      setPasskeyName("");

      // Refresh the page to get updated passkeys
      window.location.reload();
    } catch (error) {
      console.error("Error adding passkey:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          toast.error("Passkey registration was cancelled");
        } else if (error.name === "InvalidStateError") {
          toast.error("This passkey is already registered");
        } else {
          toast.error(error.message || "Failed to add passkey");
        }
      } else {
        toast.error("Failed to add passkey");
      }
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    setIsDeletingPasskey(passkeyId);
    try {
      const result = await authClient.passkey.deletePasskey({
        id: passkeyId,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to delete passkey");
      }

      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
      toast.success("Passkey removed successfully");
    } catch (error) {
      console.error("Error deleting passkey:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete passkey"
      );
    } finally {
      setIsDeletingPasskey(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "singledevice":
        return <Smartphone className='h-5 w-5' />;
      case "multidevice":
        return <Key className='h-5 w-5' />;
      default:
        return <Laptop className='h-5 w-5' />;
    }
  };

  const formatDeviceType = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "singledevice":
        return "Platform authenticator";
      case "multidevice":
        return "Synced passkey";
      default:
        return deviceType;
    }
  };

  if (!isSupported) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <Fingerprint className='h-5 w-5' />
          <h3 className='font-medium'>Passkeys</h3>
        </div>
        <p className='text-sm text-muted-foreground'>
          Passkeys are not supported on this browser or device. Try using a
          modern browser like Chrome, Safari, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Fingerprint className='h-5 w-5' />
          <h3 className='font-medium'>Passkeys</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant='outline' size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              Add Passkey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Passkey</DialogTitle>
              <DialogDescription>
                Passkeys let you sign in securely without a password using your
                device&apos;s biometrics or security key.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='passkeyName'>Passkey Name (optional)</Label>
                <Input
                  id='passkeyName'
                  placeholder='e.g., MacBook Pro, iPhone'
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                />
                <p className='text-xs text-muted-foreground'>
                  Give your passkey a name to help you identify it later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                disabled={isAddingPasskey}
              >
                Cancel
              </Button>
              <Button onClick={handleAddPasskey} disabled={isAddingPasskey}>
                {isAddingPasskey ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Registering...
                  </>
                ) : (
                  <>
                    <Fingerprint className='h-4 w-4 mr-2' />
                    Register Passkey
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className='text-sm text-muted-foreground'>
        Sign in faster and more securely with passkeys. They use your
        device&apos;s biometrics or security key instead of a password.
      </p>

      {passkeys.length === 0 ? (
        <div className='text-center py-8 border rounded-lg bg-muted/50'>
          <Fingerprint className='h-12 w-12 mx-auto text-muted-foreground mb-3' />
          <p className='text-sm text-muted-foreground'>
            No passkeys registered yet.
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            Add a passkey to enable passwordless sign-in.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className='flex items-center justify-between p-4 border rounded-lg'
            >
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-muted rounded-lg'>
                  {getDeviceIcon(passkey.deviceType)}
                </div>
                <div>
                  <p className='font-medium'>
                    {passkey.name || "Unnamed Passkey"}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatDeviceType(passkey.deviceType)}
                    {passkey.createdAt && (
                      <>
                        {" "}
                        · Added{" "}
                        {new Date(passkey.createdAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                    disabled={isDeletingPasskey === passkey.id}
                  >
                    {isDeletingPasskey === passkey.id ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Passkey</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove &quot;
                      {passkey.name || "this passkey"}&quot;? You won&apos;t be
                      able to sign in with it anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeletePasskey(passkey.id)}
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
