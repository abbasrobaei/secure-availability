import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Download, Trash2, Search, Filter, Calendar, Clock } from "lucide-react";
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
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
    fetchEntries();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterData();
  }, [entries, searchTerm, filterShiftType, filterLocation, searchDate, searchTime]);

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
      navigate("/admin/login");
    }
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      
      const uniqueLocations = Array.from(new Set(data?.map((entry) => entry.location) || []));
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
    navigate("/admin/login");
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
    const headers = ["Name", "Phone", "Date Range", "Time", "Shift", "Days", "Location", "Notes"];
    const csvData = filteredEntries.map((entry) => [
      `${entry.first_name} ${entry.last_name}`,
      entry.phone_number,
      `${entry.date} - ${entry.end_date || entry.date}`,
      `${entry.start_time} - ${entry.end_time}`,
      entry.shift_type || "",
      entry.weekdays || "",
      entry.location,
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
            <Button variant="outline" onClick={handleLogout} className="border-border">
              <LogOut className="mr-2 h-4 w-4" />
              {t("admin.logout")}
            </Button>
          </div>
        </div>

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)] mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
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
              <Button onClick={exportToCSV} variant="outline" className="border-border">
                <Download className="mr-2 h-4 w-4" />
                {t("admin.export")}
              </Button>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("admin.filter")}</span>
                </div>
                <Select value={filterShiftType} onValueChange={setFilterShiftType}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allShiftTypes")}</SelectItem>
                    <SelectItem value="dayShift">{t("form.dayShift")}</SelectItem>
                    <SelectItem value="nightShift">{t("form.nightShift")}</SelectItem>
                    <SelectItem value="weekend">{t("form.weekend")}</SelectItem>
                    <SelectItem value="allShifts">{t("form.allShifts")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("form.location")}</span>
                </div>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className="bg-muted border-border">
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
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("admin.searchByDate")}</span>
                </div>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("admin.searchByTime")}</span>
                </div>
                <Input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
            </div>

            {(searchDate || searchTime) && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">
                  {t("admin.availablePeople")}: {filteredEntries.length}
                </h3>
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
                    <TableHead className="text-foreground">{t("admin.dateRange")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.time")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.shift")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.days")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.location")}</TableHead>
                    <TableHead className="text-foreground">{t("admin.notes")}</TableHead>
                    <TableHead className="text-foreground text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border">
                      <TableCell className="text-foreground font-medium">
                        {entry.first_name} {entry.last_name}
                      </TableCell>
                      <TableCell className="text-foreground">{entry.phone_number}</TableCell>
                      <TableCell className="text-foreground">
                        {entry.date} - {entry.end_date || entry.date}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {entry.start_time} - {entry.end_time}
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
                      <TableCell className="text-foreground text-sm max-w-xs truncate">
                        {entry.notes || "-"}
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
