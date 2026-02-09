"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenuSeparator,
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
import { toast } from "sonner";
import type { Announcement } from "@/server/schemas/announcements";
import {
  deleteAnnouncement,
  toggleAnnouncementActive,
} from "@/server/actions/announcements";

interface AnnouncementsTableProps {
  announcements: Announcement[];
  onEdit: (announcement: Announcement) => void;
  onCreate: () => void;
}

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
};

const typeLabels = {
  info: "Info",
  warning: "Warning",
  success: "Success",
  error: "Error",
};

const typeColors = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getAnnouncementStatus(announcement: Announcement): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (!announcement.active) {
    return { label: "Inactive", variant: "secondary" };
  }

  const now = new Date();
  const startDate = announcement.startDate ? new Date(announcement.startDate) : null;
  const endDate = announcement.endDate ? new Date(announcement.endDate) : null;

  if (startDate && startDate > now) {
    return { label: "Scheduled", variant: "outline" };
  }

  if (endDate && endDate < now) {
    return { label: "Expired", variant: "secondary" };
  }

  return { label: "Live", variant: "default" };
}

export function AnnouncementsTable({
  announcements,
  onEdit,
  onCreate,
}: AnnouncementsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const handleDelete = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await toggleAnnouncementActive(announcement.id);
      toast.success(
        announcement.active ? "Announcement deactivated" : "Announcement activated"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update announcement");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAnnouncement) return;

    try {
      await deleteAnnouncement(selectedAnnouncement.id);
      toast.success("Announcement deleted");
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Announcements</CardTitle>
              <CardDescription>
                Create and manage banners that appear below the navigation
              </CardDescription>
            </div>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No announcements yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first announcement to display a banner on the site
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Dismissible</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => {
                  const TypeIcon = typeIcons[announcement.type];
                  const status = getAnnouncementStatus(announcement);

                  return (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            typeColors[announcement.type]
                          }`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeLabels[announcement.type]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          {announcement.title && (
                            <p className="font-medium">{announcement.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {announcement.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            <span className="text-muted-foreground">Start: </span>
                            {formatDate(announcement.startDate)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">End: </span>
                            {formatDate(announcement.endDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {announcement.dismissible ? (
                          <Badge variant="outline">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(announcement)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(announcement)}
                            >
                              {announcement.active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(announcement)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
