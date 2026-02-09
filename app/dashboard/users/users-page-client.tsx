"use client";

import { useState, useCallback } from "react";
import { UsersTable } from "./users-table";
import { UserEditPanel } from "./user-edit-panel";
import { type UserWithOrderCount } from "@/server/actions/users";

interface UsersPageClientProps {
  users: UserWithOrderCount[];
  currentUserId: string;
  stats: {
    totalUsers: number;
    adminCount: number;
    userCount: number;
  };
}

export function UsersPageClient({
  users,
  currentUserId,
  stats,
}: UsersPageClientProps) {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editUser, setEditUser] = useState<UserWithOrderCount | null>(null);

  const handleOpenEdit = useCallback((user: UserWithOrderCount) => {
    setEditUser(user);
    setShowEditPanel(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setShowEditPanel(false);
    setEditUser(null);
  }, []);

  return (
    <>
      <UsersTable
        users={users}
        currentUserId={currentUserId}
        stats={stats}
        onEditUser={handleOpenEdit}
      />

      {/* Edit User Panel Overlay */}
      <UserEditPanel
        isOpen={showEditPanel}
        onClose={handleCloseEdit}
        user={editUser}
        currentUserId={currentUserId}
      />
    </>
  );
}
