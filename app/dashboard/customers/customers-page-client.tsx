"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  UserX,
  DollarSign,
  TrendingUp,
  Repeat,
  Eye,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CustomerWithAnalytics,
  type CustomerStats,
  type GuestCustomer,
} from "@/server/actions/customers";
import { CustomerDetailPanel } from "./customer-detail-panel";
import { GuestCustomerDetailPanel } from "./guest-customer-detail-panel";

interface CustomersPageClientProps {
  customers: CustomerWithAnalytics[];
  stats: CustomerStats;
  guestCustomers: GuestCustomer[];
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

type SortField = "orders" | "spent" | "lastOrder" | "avgOrder";
type SortDirection = "asc" | "desc";

export function CustomersPageClient({
  customers,
  stats,
  guestCustomers,
}: CustomersPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("orders");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [guestSortField, setGuestSortField] = useState<SortField>("orders");
  const [guestSortDirection, setGuestSortDirection] =
    useState<SortDirection>("desc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [selectedGuestEmail, setSelectedGuestEmail] = useState<string | null>(
    null,
  );
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showGuestDetailPanel, setShowGuestDetailPanel] = useState(false);

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.name?.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        customerFilter === "all" ||
        (customerFilter === "repeat" && customer.isRepeatCustomer) ||
        (customerFilter === "single" &&
          customer.orderCount === 1) ||
        (customerFilter === "none" && customer.orderCount === 0);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "orders":
          comparison = a.orderCount - b.orderCount;
          break;
        case "spent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "avgOrder":
          comparison = a.averageOrderValue - b.averageOrderValue;
          break;
        case "lastOrder":
          const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          comparison = aDate - bDate;
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleViewCustomer = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowDetailPanel(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailPanel(false);
    setSelectedCustomerId(null);
  }, []);

  const handleViewGuest = useCallback((email: string) => {
    setSelectedGuestEmail(email);
    setShowGuestDetailPanel(true);
  }, []);

  const handleCloseGuestDetail = useCallback(() => {
    setShowGuestDetailPanel(false);
    setSelectedGuestEmail(null);
  }, []);

  const filteredGuests = guestCustomers
    .filter((guest) => {
      const matchesSearch =
        guest.name?.toLowerCase().includes(guestSearch.toLowerCase()) ||
        guest.email.toLowerCase().includes(guestSearch.toLowerCase()) ||
        guest.phone?.toLowerCase().includes(guestSearch.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (guestSortField) {
        case "orders":
          comparison = a.orderCount - b.orderCount;
          break;
        case "spent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "avgOrder":
          comparison = a.averageOrderValue - b.averageOrderValue;
          break;
        case "lastOrder":
          const aDate = a.lastOrderDate
            ? new Date(a.lastOrderDate).getTime()
            : 0;
          const bDate = b.lastOrderDate
            ? new Date(b.lastOrderDate).getTime()
            : 0;
          comparison = aDate - bDate;
          break;
      }
      return guestSortDirection === "desc" ? -comparison : comparison;
    });

  const handleGuestSort = (field: SortField) => {
    if (guestSortField === field) {
      setGuestSortDirection(guestSortDirection === "desc" ? "asc" : "desc");
    } else {
      setGuestSortField(field);
      setGuestSortDirection("desc");
    }
  };

  const guestTotalSpent = guestCustomers.reduce(
    (sum, g) => sum + g.totalSpent,
    0
  );
  const guestTotalOrders = guestCustomers.reduce(
    (sum, g) => sum + g.orderCount,
    0
  );

  const repeatCustomers = customers.filter((c) => c.isRepeatCustomer);
  const repeatRate =
    stats.customersWithOrders > 0
      ? Math.round((stats.repeatCustomers / stats.customersWithOrders) * 100)
      : 0;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            View customer analytics and identify repeat customers
          </p>
        </div>

        <Tabs defaultValue="registered" className="space-y-6">
          <TabsList>
            <TabsTrigger value="registered" className="gap-2">
              <Users className="h-4 w-4" />
              Registered
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs">
                {customers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="guest" className="gap-2">
              <UserX className="h-4 w-4" />
              Guest
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs">
                {guestCustomers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Registered Customers Tab */}
          <TabsContent value="registered" className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Customers
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.totalCustomers}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Repeat Customers
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.repeatCustomers}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({repeatRate}%)
                        </span>
                      </p>
                    </div>
                    <Repeat className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(stats.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg. Order Value
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(stats.averageOrderValue)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={customerFilter}
                    onValueChange={setCustomerFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="repeat">Repeat Customers</SelectItem>
                      <SelectItem value="single">Single Order</SelectItem>
                      <SelectItem value="none">No Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Customers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers ({filteredCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {customers.length === 0
                      ? "No customers yet"
                      : "No customers match your filters"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleSort("orders")}
                          >
                            Orders
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleSort("spent")}
                          >
                            Total Spent
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleSort("avgOrder")}
                          >
                            Avg. Order
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleSort("lastOrder")}
                          >
                            Last Order
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={customer.image || ""} />
                                <AvatarFallback>
                                  {getInitials(customer.name, customer.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {customer.name || "No name"}
                                  </p>
                                  {customer.isRepeatCustomer && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      <Repeat className="h-3 w-3 mr-1" />
                                      Repeat
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {customer.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {customer.orderCount}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatPrice(customer.totalSpent)}
                          </TableCell>
                          <TableCell>
                            {customer.orderCount > 0
                              ? formatPrice(customer.averageOrderValue)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(customer.lastOrderDate)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCustomer(customer.id)}
                              disabled={customer.orderCount === 0}
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
          </TabsContent>

          {/* Guest Customers Tab */}
          <TabsContent value="guest" className="space-y-6">
            {/* Guest Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Guest Customers
                      </p>
                      <p className="text-2xl font-bold">
                        {guestCustomers.length}
                      </p>
                    </div>
                    <UserX className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Guest Orders
                      </p>
                      <p className="text-2xl font-bold">{guestTotalOrders}</p>
                    </div>
                    <Repeat className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Guest Revenue
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(guestTotalSpent)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg. Order Value
                      </p>
                      <p className="text-2xl font-bold">
                        {guestTotalOrders > 0
                          ? formatPrice(
                              Math.round(guestTotalSpent / guestTotalOrders)
                            )
                          : formatPrice(0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Guest Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    className="pl-9"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guest Customers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Guest Customers ({filteredGuests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredGuests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {guestCustomers.length === 0
                      ? "No guest orders yet"
                      : "No guests match your search"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleGuestSort("orders")}
                          >
                            Orders
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleGuestSort("spent")}
                          >
                            Total Spent
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleGuestSort("avgOrder")}
                          >
                            Avg. Order
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                            onClick={() => handleGuestSort("lastOrder")}
                          >
                            Last Order
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGuests.map((guest) => (
                        <TableRow key={guest.email}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getInitials(guest.name, guest.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {guest.name || "No name"}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-muted-foreground"
                                  >
                                    Guest
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {guest.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {guest.orderCount}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatPrice(guest.totalSpent)}
                          </TableCell>
                          <TableCell>
                            {formatPrice(guest.averageOrderValue)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(guest.lastOrderDate)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewGuest(guest.email)}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer Detail Panel */}
      <CustomerDetailPanel
        isOpen={showDetailPanel}
        onClose={handleCloseDetail}
        customerId={selectedCustomerId}
      />

      {/* Guest Customer Detail Panel */}
      <GuestCustomerDetailPanel
        isOpen={showGuestDetailPanel}
        onClose={handleCloseGuestDetail}
        guestEmail={selectedGuestEmail}
      />
    </>
  );
}
