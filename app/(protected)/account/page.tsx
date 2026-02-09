import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { User, MapPin, Bell, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { ProfileForm } from "@/components/profile-form";
import { PasskeyManagement } from "@/components/passkey-management";
import { AddressBook } from "@/components/address-book";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users, addresses as addressesTable, passkeys } from "@/server/schemas";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your Subtex account settings, addresses, and notification preferences.",
};

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Fetch user details from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  const user = {
    name: dbUser.name || "",
    email: dbUser.email,
    phone: dbUser.phone || "",
    image: dbUser.image || "",
  };

  // Fetch user's addresses
  const addresses = await db.query.addresses.findMany({
    where: eq(addressesTable.userId, session.user.id),
    orderBy: (addr, { desc }) => [desc(addr.isDefault), desc(addr.createdAt)],
  });

  // Fetch user's passkeys
  const userPasskeys = await db.query.passkeys.findMany({
    where: eq(passkeys.userId, session.user.id),
    orderBy: (pk, { desc }) => [desc(pk.createdAt)],
  });

  return (
    <div className='py-12'>
      <div className='container mx-auto px-4'>
        <div className='max-w-4xl mx-auto'>
          <h1 className='text-3xl font-bold mb-8'>Account Settings</h1>

          <Tabs defaultValue='profile' className='space-y-6'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='profile' className='flex items-center gap-2'>
                <User className='h-4 w-4' />
                <span className='hidden sm:inline'>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value='addresses'
                className='flex items-center gap-2'
              >
                <MapPin className='h-4 w-4' />
                <span className='hidden sm:inline'>Addresses</span>
              </TabsTrigger>
              <TabsTrigger
                value='notifications'
                className='flex items-center gap-2'
              >
                <Bell className='h-4 w-4' />
                <span className='hidden sm:inline'>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value='security' className='flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                <span className='hidden sm:inline'>Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value='profile'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileForm
                    initialName={user.name}
                    initialEmail={user.email}
                    initialPhone={user.phone}
                    initialImage={user.image}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value='addresses'>
              <AddressBook
                addresses={addresses}
                userName={user.name}
                userPhone={user.phone}
              />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value='notifications'>
              <NotificationPreferencesForm />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value='security'>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your passkeys, password, and account security.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <PasskeyManagement
                    initialPasskeys={userPasskeys.map((pk) => ({
                      id: pk.id,
                      name: pk.name,
                      deviceType: pk.deviceType,
                      createdAt: pk.createdAt,
                    }))}
                  />

                  <Separator />

                  <div className='space-y-4'>
                    <h3 className='font-medium'>Change Password</h3>
                    <div className='space-y-2'>
                      <Label htmlFor='currentPassword'>Current Password</Label>
                      <Input id='currentPassword' type='password' />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='newPassword'>New Password</Label>
                      <Input id='newPassword' type='password' />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='confirmNewPassword'>
                        Confirm New Password
                      </Label>
                      <Input id='confirmNewPassword' type='password' />
                    </div>
                    <Button>Update Password</Button>
                  </div>

                  <Separator />

                  <div className='space-y-4'>
                    <h3 className='font-medium text-destructive'>
                      Danger Zone
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      Once you delete your account, there is no going back.
                      Please be certain.
                    </p>
                    <Button variant='destructive'>Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
