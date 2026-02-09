"use client";

import { useActionState } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileImagePicker } from "@/components/profile-image-picker";
import {
  updateProfileAction,
  updateProfileImageAction,
  type AuthState,
} from "@/server/actions/auth";
import { toast } from "sonner";

interface ProfileFormProps {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialImage: string;
}

export function ProfileForm({
  initialName,
  initialEmail,
  initialPhone,
  initialImage,
}: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [image, setImage] = useState(initialImage);

  const [state, formAction, isPending] = useActionState<
    AuthState | null,
    FormData
  >(updateProfileAction, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Profile updated successfully");
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const handleImageChange = async (url: string) => {
    setImage(url);
    const result = await updateProfileImageAction(url);
    if (result.success) {
      toast.success("Profile photo updated");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update profile photo");
      setImage(initialImage); // Revert on error
    }
  };

  const handleImageDelete = async () => {
    const result = await updateProfileImageAction(null);
    if (result.success) {
      setImage("");
      toast.success("Profile photo removed");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove profile photo");
    }
  };

  return (
    <div className='space-y-8'>
      {/* Profile Image */}
      <div className='flex flex-col items-center sm:flex-row sm:items-start gap-6'>
        <ProfileImagePicker
          value={image}
          onChange={handleImageChange}
          onDelete={handleImageDelete}
          disabled={isPending}
          userEmail={email}
        />
        <div className='text-center sm:text-left'>
          <h3 className='font-medium'>Profile Photo</h3>
          <p className='text-sm text-muted-foreground mt-1'>
            Upload a photo to personalize your account.
            <br />
            Recommended: Square image, at least 200x200px.
          </p>
        </div>
      </div>

      {/* Profile Details Form */}
      <form action={formAction} className='space-y-6'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Full Name</Label>
            <Input
              id='name'
              name='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              minLength={2}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              name='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='phone'>Phone Number</Label>
          <Input
            id='phone'
            name='phone'
            type='tel'
            placeholder='04XX XXX XXX'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className='flex justify-end'>
          <Button type='submit' disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
