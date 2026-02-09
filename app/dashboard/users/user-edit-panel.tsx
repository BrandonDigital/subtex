"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Key, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  adminUpdateUser,
  adminSendPasswordResetLink,
  adminGeneratePassword,
  type UserWithOrderCount,
} from "@/server/actions/users";
import { toast } from "@/components/ui/toast";

interface UserEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithOrderCount | null;
  currentUserId: string;
}

export function UserEditPanel({
  isOpen,
  onClose,
  user,
  currentUserId,
}: UserEditPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user" as "user" | "admin",
  });

  // Handle open/close animations and form data initialization
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || "",
        email: user.email,
        phone: "",
        role: user.role,
      });
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, user]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await adminUpdateUser(user.id, {
        name: formData.name || undefined,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
      });

      toast.success("User updated successfully");
      router.refresh();
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user) return;

    setIsSendingReset(true);
    try {
      await adminSendPasswordResetLink(user.id);
      toast.success("Password reset link sent to " + user.email);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset link"
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleGeneratePassword = async () => {
    if (!user) return;

    setIsGeneratingPassword(true);
    try {
      await adminGeneratePassword(user.id);
      toast.success("New password generated and sent to " + user.email);
      setShowGenerateConfirm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate password"
      );
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const isCurrentUser = user?.id === currentUserId;

  if (!isVisible || !user) return null;

  return (
    <>
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
              <h1 className="text-xl font-semibold">Edit User</h1>
              <p className="text-sm text-muted-foreground">
                Update user profile and manage access
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
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+61 4XX XXX XXX"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "user" | "admin") =>
                      handleChange("role", value)
                    }
                    disabled={isCurrentUser}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCurrentUser && (
                    <p className="text-xs text-muted-foreground">
                      You cannot change your own role.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Password Management */}
                <div className="space-y-4">
                  <Label className="text-base">Password Management</Label>
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendResetLink}
                      disabled={isSendingReset}
                      className="justify-start h-auto py-4"
                    >
                      {isSendingReset ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      ) : (
                        <Mail className="mr-3 h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">Send Password Reset Link</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          Sends an email with a link for the user to set their own password
                        </div>
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGenerateConfirm(true)}
                      disabled={isGeneratingPassword}
                      className="justify-start h-auto py-4"
                    >
                      {isGeneratingPassword ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      ) : (
                        <Key className="mr-3 h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">Generate New Password</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          Creates a random password and emails it to the user
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-background">
              <div className="max-w-2xl mx-auto flex items-center justify-end gap-3 px-6 py-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !formData.email}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog for Generate Password */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Generate New Password?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the user&apos;s current password with a randomly
              generated one. The new password will be emailed to{" "}
              <strong>{user?.email}</strong>.
              <br />
              <br />
              The user will need to use this new password to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGeneratePassword}
              disabled={isGeneratingPassword}
            >
              {isGeneratingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
