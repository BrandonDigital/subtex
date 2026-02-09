"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Eye,
  DollarSign,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type UserCartSummary } from "@/server/actions/cart";
import { CartDetailPanel } from "./cart-detail-panel";

interface CartsPageClientProps {
  carts: UserCartSummary[];
  stats: {
    totalCarts: number;
    totalItems: number;
    totalValue: number;
  };
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export function CartsPageClient({ carts, stats }: CartsPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const filteredCarts = carts.filter((cart) => {
    const matchesSearch =
      cart.userName?.toLowerCase().includes(search.toLowerCase()) ||
      cart.userEmail.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleViewCart = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setShowDetailPanel(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailPanel(false);
    setSelectedUserId(null);
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Carts</h1>
          <p className="text-muted-foreground">
            View active shopping carts from logged-in customers
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Carts</p>
                  <p className="text-2xl font-bold">{stats.totalCarts}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Potential Revenue
                  </p>
                  <p className="text-2xl font-bold">
                    {formatPrice(stats.totalValue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Carts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Active Carts ({filteredCarts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCarts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {carts.length === 0
                  ? "No active carts"
                  : "No carts match your search"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Total Qty</TableHead>
                    <TableHead className="text-right">Est. Total</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCarts.map((cart) => (
                    <TableRow key={cart.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cart.userImage || ""} />
                            <AvatarFallback>
                              {getInitials(cart.userName, cart.userEmail)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {cart.userName || "No name"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cart.userEmail}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cart.itemCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {cart.totalItems}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(cart.estimatedTotal)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(cart.lastUpdated)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCart(cart.userId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart Detail Panel */}
      <CartDetailPanel
        isOpen={showDetailPanel}
        onClose={handleCloseDetail}
        userId={selectedUserId}
      />
    </>
  );
}
