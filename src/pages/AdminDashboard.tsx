import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  LogOut, Download, Trash2, Search, Filter, Calendar, Clock, UserPlus, Mail, Lock, User, 
  MessageCircle, X, RefreshCw, Users, ChevronUp, ChevronDown, MapPin, Phone, Briefcase,
  CalendarDays, RotateCcw, Car, FileText, Eye, EyeOff, ArrowUpDown, LayoutGrid, List
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AvailabilityCalendar } from "@/components/admin/AvailabilityCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortField = "name" | "date" | "location" | "shift_type" | "created_at";
type SortDirection = "asc" | "desc";

interface AvailabilityEntry {
  id: string;
  user_id: string | null;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  shift_type: string | null;
  location: string;
  mobile_deployable: string | null;
  notes: string | null;
  is_recurring: boolean | null;
  weekdays: string | null;
  created_at: string | null;
  first_name: string;
  last_name: string;
  phone_number: string;
  guard_id_number: string;
  e_pin_number: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterShiftType, setFilterShiftType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterMobile, setFilterMobile] = useState("all");
  const [filterRecurring, setFilterRecurring] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // View states
  const [showFilters, setShowFilters] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  
  // Admin creation
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Extracted locations from entries
  const locations = useMemo(() => {
    const allLocations = entries.flatMap(entry => 
      entry.location.split(',').map(loc => loc.trim())
    );
    return Array.from(new Set(allLocations)).sort();
  }, [entries]);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const availableToday = entries.filter(entry => {
      const startDate = new Date(entry.date);
      const endDate = entry.end_date ? new Date(entry.end_date) : startDate;
      return today >= startDate && today <= endDate;
    }).length;
    
    const mobileAvailable = entries.filter(e => e.mobile_deployable === "yes").length;
    const recurringCount = entries.filter(e => e.is_recurring).length;
    const uniqueEmployees = new Set(entries.map(e => e.user_id)).size;
    
    return { availableToday, mobileAvailable, recurringCount, uniqueEmployees, total: entries.length };
  }, [entries]);

  useEffect(() => {
    checkAuth();
    fetchEntries();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('availability-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

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
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("availability")
        .select("*")
        .order("date", { ascending: true });

      if (availabilityError) throw availabilityError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone_number, guard_id_number, e_pin_number");

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

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
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        const searchableFields = [
          `${entry.first_name} ${entry.last_name}`,
          entry.phone_number,
          entry.location,
          entry.notes,
          entry.shift_type,
          entry.weekdays,
          entry.guard_id_number,
          entry.e_pin_number,
        ].map(f => (f || '').toLowerCase());
        
        return searchableFields.some(field => field.includes(search));
      });
    }

    // Shift type filter
    if (filterShiftType !== "all") {
      filtered = filtered.filter((entry) => entry.shift_type === filterShiftType);
    }

    // Location filter (supports multi-location entries)
    if (filterLocation !== "all") {
      filtered = filtered.filter((entry) => 
        entry.location.split(',').map(l => l.trim()).includes(filterLocation)
      );
    }

    // Mobile filter
    if (filterMobile !== "all") {
      filtered = filtered.filter((entry) => entry.mobile_deployable === filterMobile);
    }

    // Recurring filter
    if (filterRecurring !== "all") {
      const isRecurring = filterRecurring === "yes";
      filtered = filtered.filter((entry) => entry.is_recurring === isRecurring);
    }

    // Weekday filter
    if (selectedWeekdays.length > 0) {
      filtered = filtered.filter((entry) => {
        if (!entry.weekdays) return false;
        const entryDays = entry.weekdays.split(',');
        return selectedWeekdays.some(day => entryDays.includes(day));
      });
    }

    // Date filter
    if (searchDate) {
      const searchDateObj = new Date(searchDate);
      filtered = filtered.filter((entry) => {
        const entryStartDate = new Date(entry.date);
        const entryEndDate = new Date(entry.end_date || entry.date);
        return searchDateObj >= entryStartDate && searchDateObj <= entryEndDate;
      });
    }

    // Time filter
    if (searchTime) {
      filtered = filtered.filter((entry) => {
        if (!entry.start_time || !entry.end_time) return true;
        return searchTime >= entry.start_time && searchTime <= entry.end_time;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "location":
          comparison = a.location.localeCompare(b.location);
          break;
        case "shift_type":
          comparison = (a.shift_type || '').localeCompare(b.shift_type || '');
          break;
        case "created_at":
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [entries, searchTerm, filterShiftType, filterLocation, filterMobile, filterRecurring, selectedWeekdays, searchDate, searchTime, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
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
      toast.success("Eintrag gelöscht");
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Telefon", "Guard-ID", "e-Pin", "Von", "Bis", "Wiederkehrend", "Startzeit", "Endzeit", "Schicht", "Wochentage", "Standorte", "Mobil", "Bemerkungen"];
    const csvData = filteredEntries.map((entry) => [
      `${entry.first_name} ${entry.last_name}`,
      entry.phone_number,
      entry.guard_id_number || "",
      entry.e_pin_number || "",
      entry.date,
      entry.end_date || entry.date,
      entry.is_recurring ? "Ja" : "Nein",
      entry.start_time || "",
      entry.end_time || "",
      entry.shift_type || "",
      entry.weekdays || "",
      entry.location,
      entry.mobile_deployable || "",
      entry.notes || "",
    ]);

    const csv = [headers, ...csvData].map((row) => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verfuegbarkeiten-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getShiftTypeLabel = (shiftType: string | null) => {
    const labels: Record<string, string> = {
      earlyShift: "Frühschicht",
      lateShift: "Spätschicht",
      nightShift: "Nachtschicht",
      flexible: "Flexibel"
    };
    return shiftType ? labels[shiftType] || shiftType : "-";
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setFilterShiftType("all");
    setFilterLocation("all");
    setFilterMobile("all");
    setFilterRecurring("all");
    setSearchDate("");
    setSearchTime("");
    setSelectedWeekdays([]);
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
    if (selectedWeekdays.length > 0) count++;
    return count;
  };

  const weekdayOptions = [
    { value: "monday", label: "Mo" },
    { value: "tuesday", label: "Di" },
    { value: "wednesday", label: "Mi" },
    { value: "thursday", label: "Do" },
    { value: "friday", label: "Fr" },
    { value: "saturday", label: "Sa" },
    { value: "sunday", label: "So" },
  ];

  const toggleWeekday = (day: string) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const formatDateRange = (date: string, endDate: string | null) => {
    const start = new Date(date);
    const end = endDate ? new Date(endDate) : start;
    
    if (start.getTime() === end.getTime()) {
      return format(start, 'dd.MM.yyyy', { locale: de });
    }
    return `${format(start, 'dd.MM', { locale: de })} - ${format(end, 'dd.MM.yyyy', { locale: de })}`;
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminFormData.password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben");
      return;
    }

    setCreatingAdmin(true);
    try {
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
        toast.error(signUpError.message.includes("already registered") 
          ? "E-Mail bereits registriert" 
          : signUpError.message);
        return;
      }

      if (!signUpData.user) {
        toast.error("Fehler beim Erstellen des Admins");
        return;
      }

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: signUpData.user.id, role: "admin" });

      if (roleError) {
        toast.error("Fehler bei der Rollenzuweisung");
        return;
      }

      toast.success("Admin erfolgreich erstellt!");
      setShowCreateAdmin(false);
      setAdminFormData({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "" });
    } catch (error) {
      toast.error("Fehler beim Erstellen des Admins");
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("admin.title")}</h1>
                <a 
                  href="https://parsec-sicherheitsdienst.de/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Parsec-Sicherheitsdienst GmbH
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <LanguageSwitcher />
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/employees")} className="border-border">
                  <Users className="mr-2 h-4 w-4" />
                  Mitarbeiter
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCreateAdmin(!showCreateAdmin)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Admin erstellen
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-border">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CalendarDays className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.availableToday}</p>
                  <p className="text-xs text-muted-foreground">Heute verfügbar</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Car className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.mobileAvailable}</p>
                  <p className="text-xs text-muted-foreground">Mobil einsetzbar</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <RotateCcw className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.recurringCount}</p>
                  <p className="text-xs text-muted-foreground">Wiederkehrend</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.uniqueEmployees}</p>
                  <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Create Admin Form */}
          {showCreateAdmin && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Neuen Admin erstellen</h2>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-firstName" className="text-foreground flex items-center text-sm">
                      <User className="w-3 h-3 mr-1 text-muted-foreground" />
                      Vorname
                    </Label>
                    <Input
                      id="admin-firstName"
                      value={adminFormData.firstName}
                      onChange={(e) => setAdminFormData({ ...adminFormData, firstName: e.target.value })}
                      className="bg-muted border-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-lastName" className="text-foreground flex items-center text-sm">
                      <User className="w-3 h-3 mr-1 text-muted-foreground" />
                      Nachname
                    </Label>
                    <Input
                      id="admin-lastName"
                      value={adminFormData.lastName}
                      onChange={(e) => setAdminFormData({ ...adminFormData, lastName: e.target.value })}
                      className="bg-muted border-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-foreground flex items-center text-sm">
                      <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                      E-Mail
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
                    <Label htmlFor="admin-phone" className="text-foreground flex items-center text-sm">
                      <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                      Telefon
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
                  <div className="space-y-2">
                    <Label htmlFor="admin-password" className="text-foreground flex items-center text-sm">
                      <Lock className="w-3 h-3 mr-1 text-muted-foreground" />
                      Passwort
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
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={creatingAdmin} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {creatingAdmin ? "Erstelle..." : "Admin erstellen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateAdmin(false)} className="border-border">
                    Abbrechen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Search & Filters */}
          <Card className="p-4 bg-card border-border">
            <div className="space-y-4">
              {/* Search bar and controls */}
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Suche nach Name, Telefon, Standort, Bemerkung..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-muted border-border"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="flex border border-border rounded-md overflow-hidden">
                    <Button 
                      variant={viewMode === "table" ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className={`rounded-none ${viewMode === "table" ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={viewMode === "calendar" ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      className={`rounded-none ${viewMode === "calendar" ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`border-border ${showFilters ? 'bg-primary/10 border-primary' : ''}`}
                  >
                    {showFilters ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    Filter {showFilters ? 'ausblenden' : 'anzeigen'}
                  </Button>
                  {viewMode === "table" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCompactView(!compactView)}
                      className="border-border"
                    >
                      {compactView ? 'Normale Ansicht' : 'Kompakte Ansicht'}
                    </Button>
                  )}
                  {getActiveFiltersCount() > 0 && (
                    <Button 
                      onClick={resetAllFilters} 
                      variant="outline" 
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Zurücksetzen ({getActiveFiltersCount()})
                    </Button>
                  )}
                  <Button onClick={exportToCSV} variant="outline" size="sm" className="border-border">
                    <Download className="mr-2 h-4 w-4" />
                    CSV Export
                  </Button>
                </div>
              </div>

              {/* Filter controls */}
              {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-border">
                  {/* Shift Type */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Schicht
                    </Label>
                    <Select value={filterShiftType} onValueChange={setFilterShiftType}>
                      <SelectTrigger className={`bg-muted border-border h-9 text-sm ${filterShiftType !== "all" ? "border-primary ring-1 ring-primary/20" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Schichten</SelectItem>
                        <SelectItem value="earlyShift">Frühschicht</SelectItem>
                        <SelectItem value="lateShift">Spätschicht</SelectItem>
                        <SelectItem value="nightShift">Nachtschicht</SelectItem>
                        <SelectItem value="flexible">Flexibel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Standort
                    </Label>
                    <Select value={filterLocation} onValueChange={setFilterLocation}>
                      <SelectTrigger className={`bg-muted border-border h-9 text-sm ${filterLocation !== "all" ? "border-primary ring-1 ring-primary/20" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Standorte</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mobile */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Car className="h-3 w-3" /> Mobil
                    </Label>
                    <Select value={filterMobile} onValueChange={setFilterMobile}>
                      <SelectTrigger className={`bg-muted border-border h-9 text-sm ${filterMobile !== "all" ? "border-primary ring-1 ring-primary/20" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="yes">✓ Ja</SelectItem>
                        <SelectItem value="no">✗ Nein</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recurring */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Art
                    </Label>
                    <Select value={filterRecurring} onValueChange={setFilterRecurring}>
                      <SelectTrigger className={`bg-muted border-border h-9 text-sm ${filterRecurring !== "all" ? "border-primary ring-1 ring-primary/20" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="yes">Wiederkehrend</SelectItem>
                        <SelectItem value="no">Einmalig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Datum
                    </Label>
                    <Input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className={`bg-muted border-border h-9 text-sm ${searchDate ? "border-primary ring-1 ring-primary/20" : ""}`}
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Zeit
                    </Label>
                    <Input
                      type="time"
                      value={searchTime}
                      onChange={(e) => setSearchTime(e.target.value)}
                      className={`bg-muted border-border h-9 text-sm ${searchTime ? "border-primary ring-1 ring-primary/20" : ""}`}
                    />
                  </div>

                  {/* Weekdays */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Wochentage</Label>
                    <div className="flex gap-1 flex-wrap">
                      {weekdayOptions.map((day) => (
                        <Badge
                          key={day.value}
                          variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                          className={`cursor-pointer text-xs px-2 py-1 ${
                            selectedWeekdays.includes(day.value) 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                          onClick={() => toggleWeekday(day.value)}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Active filters badges */}
              {getActiveFiltersCount() > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Aktive Filter:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      Suche: "{searchTerm}"
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                    </Badge>
                  )}
                  {filterShiftType !== "all" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      {getShiftTypeLabel(filterShiftType)}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setFilterShiftType("all")} />
                    </Badge>
                  )}
                  {filterLocation !== "all" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      {filterLocation}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setFilterLocation("all")} />
                    </Badge>
                  )}
                  {filterMobile !== "all" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      Mobil: {filterMobile === "yes" ? "Ja" : "Nein"}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setFilterMobile("all")} />
                    </Badge>
                  )}
                  {filterRecurring !== "all" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      {filterRecurring === "yes" ? "Wiederkehrend" : "Einmalig"}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setFilterRecurring("all")} />
                    </Badge>
                  )}
                  {searchDate && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      {format(new Date(searchDate), 'dd.MM.yyyy', { locale: de })}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSearchDate("")} />
                    </Badge>
                  )}
                  {searchTime && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      {searchTime}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSearchTime("")} />
                    </Badge>
                  )}
                  {selectedWeekdays.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      Tage: {selectedWeekdays.map(d => weekdayOptions.find(w => w.value === d)?.label).join(', ')}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedWeekdays([])} />
                    </Badge>
                  )}
                </div>
              )}

              {/* Results summary */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredEntries.length}</span> von {entries.length} Einträgen
                </p>
              </div>
            </div>
          </Card>

          {/* View Content */}
          {viewMode === "calendar" ? (
            <Card className="p-6 bg-card border-border">
              <AvailabilityCalendar entries={filteredEntries} />
            </Card>
          ) : (
            <Card className="bg-card border-border overflow-hidden">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Lädt...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Keine Einträge gefunden</p>
                  {getActiveFiltersCount() > 0 && (
                    <Button variant="link" onClick={resetAllFilters} className="mt-2 text-primary">
                      Filter zurücksetzen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/50">
                        <TableHead 
                          className="text-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Name <SortIcon field="name" />
                          </div>
                        </TableHead>
                        <TableHead className="text-foreground">Kontakt</TableHead>
                        <TableHead 
                          className="text-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort("date")}
                        >
                          <div className="flex items-center gap-1">
                            Zeitraum <SortIcon field="date" />
                          </div>
                        </TableHead>
                        {!compactView && <TableHead className="text-foreground">Zeit</TableHead>}
                        <TableHead 
                          className="text-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort("shift_type")}
                        >
                          <div className="flex items-center gap-1">
                            Schicht <SortIcon field="shift_type" />
                          </div>
                        </TableHead>
                        {!compactView && <TableHead className="text-foreground">Wochentage</TableHead>}
                        <TableHead 
                          className="text-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort("location")}
                        >
                          <div className="flex items-center gap-1">
                            Standort <SortIcon field="location" />
                          </div>
                        </TableHead>
                        <TableHead className="text-foreground text-center">Mobil</TableHead>
                        {!compactView && <TableHead className="text-foreground">Bemerkungen</TableHead>}
                        <TableHead className="text-foreground text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id} className="border-border hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {entry.first_name} {entry.last_name}
                            </div>
                            {entry.guard_id_number && (
                              <div className="text-xs text-muted-foreground">ID: {entry.guard_id_number}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-foreground">{entry.phone_number}</span>
                              {entry.phone_number && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://wa.me/${entry.phone_number.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-500 hover:text-green-400"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>WhatsApp öffnen</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {formatDateRange(entry.date, entry.end_date)}
                              </span>
                              {entry.is_recurring && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                                      <RotateCcw className="h-3 w-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Wiederkehrend</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          {!compactView && (
                            <TableCell className="text-sm text-foreground">
                              {entry.start_time && entry.end_time 
                                ? `${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}`
                                : <span className="text-muted-foreground">-</span>
                              }
                            </TableCell>
                          )}
                          <TableCell>
                            {entry.shift_type && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  entry.shift_type === 'earlyShift' ? 'bg-yellow-500/10 text-yellow-500' :
                                  entry.shift_type === 'lateShift' ? 'bg-orange-500/10 text-orange-500' :
                                  entry.shift_type === 'nightShift' ? 'bg-indigo-500/10 text-indigo-400' :
                                  'bg-primary/10 text-primary'
                                }`}
                              >
                                {getShiftTypeLabel(entry.shift_type)}
                              </Badge>
                            )}
                          </TableCell>
                          {!compactView && (
                            <TableCell>
                              {entry.weekdays ? (
                                <div className="flex gap-1 flex-wrap">
                                  {entry.weekdays.split(',').map((day: string) => {
                                    const dayLabel = weekdayOptions.find(d => d.value === day)?.label || day;
                                    return (
                                      <Badge key={day} variant="outline" className="text-xs px-1.5 py-0">
                                        {dayLabel}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {entry.location.split(',').map((loc: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {loc.trim()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.mobile_deployable === "yes" ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                <Car className="h-3 w-3" />
                              </Badge>
                            ) : entry.mobile_deployable === "no" ? (
                              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                                ✗
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {!compactView && (
                            <TableCell className="max-w-[200px]">
                              {entry.notes ? (
                                <Tooltip>
                                  <TooltipTrigger className="text-left">
                                    <span className="text-sm text-muted-foreground truncate block">
                                      {entry.notes.length > 30 ? entry.notes.substring(0, 30) + '...' : entry.notes}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">{entry.notes}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default AdminDashboard;
