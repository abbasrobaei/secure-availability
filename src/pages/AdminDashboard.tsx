import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Download, Trash2, Search, Filter, Calendar, Clock, UserPlus, Mail, Lock, User, MessageCircle, X, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterShiftType, setFilterShiftType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterMobile, setFilterMobile] = useState("all");
  const [filterRecurring, setFilterRecurring] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchEntries();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterData();
  }, [entries, searchTerm, filterShiftType, filterLocation, filterMobile, filterRecurring, searchDate, searchTime]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user has admin role
    const { data: isAdmin, error } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });

    if (error || !isAdmin) {
      toast.error("Access denied - Admin privileges required");
      navigate("/");
    }
  };

  const fetchEntries = async () => {
    try {
      // Fetch availability entries
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("availability")
        .select("*")
        .order("created_at", { ascending: false });

      if (availabilityError) throw availabilityError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone_number, guard_id_number, e_pin_number");

      if (profilesError) throw profilesError;

      // Create a map of profiles by user_id for quick lookup
      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

      // Merge availability with profile data
      const mergedData = availabilityData?.map(entry => {
        const profile = profilesMap.get(entry.user_id || '');
        return {
          ...entry,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          phone_number: profile?.phone_number || '',
          guard_id_number: profile?.guard_id_number || '',
          e_pin_number: profile?.e_pin_number || ''
        };
      }) || [];

      setEntries(mergedData);
      
      const uniqueLocations = Array.from(new Set(mergedData?.map((entry) => entry.location) || []));
      setLocations(uniqueLocations as string[]);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...entries];

    if (searchTerm) {
      filtered = filtered.filter((entry) =>
        `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.phone_number.includes(searchTerm) ||
        entry.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterShiftType !== "all") {
      filtered = filtered.filter((entry) => entry.shift_type === filterShiftType);
    }

    if (filterLocation !== "all") {
      filtered = filtered.filter((entry) => entry.location === filterLocation);
    }

    if (filterMobile !== "all") {
      filtered = filtered.filter((entry) => entry.mobile_deployable === filterMobile);
    }

    if (filterRecurring !== "all") {
      const isRecurring = filterRecurring === "yes";
      filtered = filtered.filter((entry) => entry.is_recurring === isRecurring);
    }

    if (searchDate) {
      filtered = filtered.filter((entry) => {
        const entryStartDate = new Date(entry.date);
        const entryEndDate = new Date(entry.end_date || entry.date);
        const searchDateObj = new Date(searchDate);
        return searchDateObj >= entryStartDate && searchDateObj <= entryEndDate;
      });
    }

    if (searchTime) {
      filtered = filtered.filter((entry) => {
        return searchTime >= entry.start_time && searchTime <= entry.end_time;
      });
    }

    setFilteredEntries(filtered);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return;

    try {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw error;
      toast.success(t("toast.deleteSuccess"));
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error(t("toast.deleteError"));
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Phone", "Date Range", "Recurring", "Time", "Shift", "Days", "Location", "Mobile", "Notes"];
    const csvData = filteredEntries.map((entry) => [
      `${entry.first_name} ${entry.last_name}`,
      entry.phone_number,
      `${entry.date} - ${entry.end_date || entry.date}`,
      entry.is_recurring ? "Yes" : "No",
      `${entry.start_time} - ${entry.end_time}`,
      entry.shift_type || "",
      entry.weekdays || "",
      entry.location,
      entry.mobile_deployable || "",
      entry.notes || "",
    ]);

    const csv = [headers, ...csvData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `availability-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getShiftTypeLabel = (shiftType: string | null) => {
    if (!shiftType) return "-";
    return t(`form.${shiftType}`);
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setFilterShiftType("all");
    setFilterLocation("all");
    setFilterMobile("all");
    setFilterRecurring("all");
    setSearchDate("");
    setSearchTime("");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filterShiftType !== "all") count++;
    if (filterLocation !== "all") count++;
    if (filterMobile !== "all") count++;
    if (filterRecurring !== "all") count++;
    if (searchDate) count++;
    if (searchTime) count++;
    return count;
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminFormData.password.length < 6) {
      toast.error(t("admin.passwordTooShort"));
      return;
    }

    setCreatingAdmin(true);
    try {
      // Create the admin user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminFormData.email,
        password: adminFormData.password,
        options: {
          data: {
            first_name: adminFormData.firstName,
            last_name: adminFormData.lastName,
            phone_number: adminFormData.phoneNumber,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error(t("auth.emailAlreadyRegistered"));
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      if (!signUpData.user) {
        toast.error(t("admin.createAdminError"));
        return;
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: signUpData.user.id,
          role: "admin"
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        toast.error(t("admin.roleAssignmentError"));
        return;
      }

      toast.success(t("admin.adminCreated"));
      setShowCreateAdmin(false);
      setAdminFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
      });
    } catch (error) {
      console.error("Create admin error:", error);
      toast.error(t("admin.createAdminError"));
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("admin.title")}</h1>
            <a 
              href="https://parsec-sicherheitsdienst.de/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-lg mt-2 inline-block"
            >
              {t("companyName")}
            </a>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Button 
              variant="secondary" 
              onClick={() => setShowCreateAdmin(!showCreateAdmin)}
              className="bg-secondary hover:bg-secondary/90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t("admin.createAdmin")}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-border">
              <LogOut className="mr-2 h-4 w-4" />
              {t("admin.logout")}
            </Button>
          </div>
        </div>

        {showCreateAdmin && (
          <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)] mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t("admin.createNewAdmin")}</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-firstName" className="text-foreground flex items-center">
                    <User className="w-4 h-4 mr-2 text-secondary" />
                    {t("form.firstName")}
                  </Label>
                  <Input
                    id="admin-firstName"
                    type="text"
                    value={adminFormData.firstName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, firstName: e.target.value })}
                    className="bg-muted border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-lastName" className="text-foreground flex items-center">
                    <User className="w-4 h-4 mr-2 text-secondary" />
                    {t("form.lastName")}
                  </Label>
                  <Input
                    id="admin-lastName"
                    type="text"
                    value={adminFormData.lastName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, lastName: e.target.value })}
                    className="bg-muted border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-foreground flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-secondary" />
                    {t("auth.email")}
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    className="bg-muted border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-phone" className="text-foreground flex items-center">
                    <User className="w-4 h-4 mr-2 text-secondary" />
                    {t("form.phoneNumber")}
                  </Label>
                  <Input
                    id="admin-phone"
                    type="tel"
                    value={adminFormData.phoneNumber}
                    onChange={(e) => setAdminFormData({ ...adminFormData, phoneNumber: e.target.value })}
                    className="bg-muted border-border"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="admin-password" className="text-foreground flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-secondary" />
                    {t("auth.password")}
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    className="bg-muted border-border"
                    required
                    minLength={6}
                  />
                  <p className="text-sm text-muted-foreground">{t("admin.passwordMinLength")}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={creatingAdmin}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {creatingAdmin ? t("admin.creating") : t("admin.createAdmin")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateAdmin(false);
                    setAdminFormData({
                      email: "",
                      password: "",
                      firstName: "",
                      lastName: "",
                      phoneNumber: "",
                    });
                  }}
                  className="border-border"
                >
                  {t("form.back")}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)] mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t("admin.search")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {getActiveFiltersCount() > 0 && (
                  <Button 
                    onClick={resetAllFilters} 
                    variant="outline" 
                    className="border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Filter zurücksetzen ({getActiveFiltersCount()})
                  </Button>
                )}
                <Button onClick={exportToCSV} variant="outline" className="border-border">
                  <Download className="mr-2 h-4 w-4" />
                  {t("admin.export")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{t("admin.filter")}</span>
                </div>
                <Select value={filterShiftType} onValueChange={setFilterShiftType}>
                  <SelectTrigger className={`bg-muted border-border ${filterShiftType !== "all" ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allShiftTypes")}</SelectItem>
                    <SelectItem value="earlyShift">{t("form.earlyShift")}</SelectItem>
                    <SelectItem value="lateShift">{t("form.lateShift")}</SelectItem>
                    <SelectItem value="nightShift">{t("form.nightShift")}</SelectItem>
                    <SelectItem value="flexible">{t("form.flexible")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{t("form.location")}</span>
                </div>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className={`bg-muted border-border ${filterLocation !== "all" ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allLocations")}</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Mobile</span>
                </div>
                <Select value={filterMobile} onValueChange={setFilterMobile}>
                  <SelectTrigger className={`bg-muted border-border ${filterMobile !== "all" ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="yes">✓ Ja</SelectItem>
                    <SelectItem value="no">✗ Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Recurring</span>
                </div>
                <Select value={filterRecurring} onValueChange={setFilterRecurring}>
                  <SelectTrigger className={`bg-muted border-border ${filterRecurring !== "all" ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="yes">✓ Ja</SelectItem>
                    <SelectItem value="no">Einmalig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{t("admin.searchByDate")}</span>
                </div>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className={`bg-muted border-border ${searchDate ? "border-primary ring-2 ring-primary/20" : ""}`}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{t("admin.searchByTime")}</span>
                </div>
                <Input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className={`bg-muted border-border ${searchTime ? "border-primary ring-2 ring-primary/20" : ""}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Suche: "{searchTerm}"
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                </Badge>
              )}
              {filterShiftType !== "all" && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Schicht: {getShiftTypeLabel(filterShiftType)}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilterShiftType("all")} />
                </Badge>
              )}
              {filterLocation !== "all" && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Standort: {filterLocation}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilterLocation("all")} />
                </Badge>
              )}
              {filterMobile !== "all" && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Mobile: {filterMobile === "yes" ? "Ja" : "Nein"}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilterMobile("all")} />
                </Badge>
              )}
              {filterRecurring !== "all" && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Recurring: {filterRecurring === "yes" ? "Ja" : "Einmalig"}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilterRecurring("all")} />
                </Badge>
              )}
              {searchDate && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Datum: {new Date(searchDate).toLocaleDateString('de-DE')}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setSearchDate("")} />
                </Badge>
              )}
              {searchTime && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  Zeit: {searchTime}
                  <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setSearchTime("")} />
                </Badge>
              )}
            </div>

            {getActiveFiltersCount() > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {filteredEntries.length} {filteredEntries.length === 1 ? "Ergebnis" : "Ergebnisse"} gefunden
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      von {entries.length} gesamt
                    </p>
                  </div>
                  <Badge variant="default" className="bg-primary text-primary-foreground text-lg px-4 py-2">
                    {filteredEntries.length}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Lädt...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.noEntries")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">{t("admin.name")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.phone")}</TableHead>
                    <TableHead className="text-foreground">Guard ID</TableHead>
                    <TableHead className="text-foreground">e-Pin</TableHead>
                    <TableHead className="text-foreground">{t("admin.dateRange")}</TableHead>
                    <TableHead className="text-foreground">Recurring</TableHead>
                    <TableHead className="text-foreground">{t("admin.time")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.shift")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.days")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.location")}</TableHead>
                    <TableHead className="text-foreground">Mobile</TableHead>
                    <TableHead className="text-foreground">{t("admin.notes")}</TableHead>
                    <TableHead className="text-foreground">WhatsApp</TableHead>
                    <TableHead className="text-foreground text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border">
                      <TableCell className="text-foreground font-semibold">
                        {entry.first_name} {entry.last_name}
                      </TableCell>
                      <TableCell className="text-foreground">{entry.phone_number}</TableCell>
                      <TableCell className="text-foreground text-sm">{entry.guard_id_number || "-"}</TableCell>
                      <TableCell className="text-foreground text-sm">{entry.e_pin_number || "-"}</TableCell>
                      <TableCell className="text-foreground font-medium">
                        {new Date(entry.date).toLocaleDateString('de-DE')}
                        {entry.end_date && entry.end_date !== entry.date && (
                          <> - {new Date(entry.end_date).toLocaleDateString('de-DE')}</>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {entry.is_recurring ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">
                            ✓
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {entry.start_time?.substring(0, 5)} - {entry.end_time?.substring(0, 5)}
                      </TableCell>
                      <TableCell>
                        {entry.shift_type && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {getShiftTypeLabel(entry.shift_type)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground text-sm">{entry.weekdays || "-"}</TableCell>
                      <TableCell className="text-foreground">{entry.location}</TableCell>
                      <TableCell>
                        {entry.mobile_deployable === "yes" ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
                            ✓ Ja
                          </Badge>
                        ) : entry.mobile_deployable === "no" ? (
                          <Badge variant="outline" className="border-red-500/20 text-red-600 dark:text-red-400">
                            ✗ Nein
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground text-sm max-w-xs truncate">
                        {entry.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {entry.phone_number ? (
                          <a
                            href={`https://wa.me/${entry.phone_number.replace(/\D/g, '')}?text=Ich%20möchte%20einen%20Termin%20vereinbaren.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-green-500 bg-background px-3 py-2 text-sm text-green-600 hover:bg-green-500/10 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(entry.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
