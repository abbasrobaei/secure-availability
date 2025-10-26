import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut, Download, Filter, Trash2, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AvailabilityEntry {
  id: string;
  phone_number: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AvailabilityEntry[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [editingEntry, setEditingEntry] = useState<AvailabilityEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterDate, filterLocation, entries]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .order("date", { ascending: false })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Fehler beim Laden der Verfügbarkeiten");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    if (filterDate) {
      filtered = filtered.filter((entry) => entry.date === filterDate);
    }

    if (filterLocation) {
      filtered = filtered.filter((entry) =>
        entry.location.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich abgemeldet");
    navigate("/");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return;

    try {
      const { error } = await supabase.from("availability").delete().eq("id", id);

      if (error) throw error;
      toast.success("Eintrag gelöscht");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const handleEdit = (entry: AvailabilityEntry) => {
    setEditingEntry(entry);
    setEditFormData({
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      location: entry.location,
      notes: entry.notes || "",
    });
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const { error } = await supabase
        .from("availability")
        .update(editFormData)
        .eq("id", editingEntry.id);

      if (error) throw error;
      toast.success("Eintrag aktualisiert");
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const exportToCSV = () => {
    const headers = ["Telefonnummer", "Datum", "Startzeit", "Endzeit", "Standort", "Bemerkung"];
    const csvData = filteredEntries.map((entry) => [
      entry.phone_number,
      entry.date,
      entry.start_time,
      entry.end_time,
      entry.location,
      entry.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `verfügbarkeiten_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV-Export erfolgreich");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <p className="text-foreground">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin-Dashboard</h1>
              <p className="text-muted-foreground">Verfügbarkeitsverwaltung</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Filter</h2>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV Export
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterDate" className="text-foreground">
                Datum filtern
              </Label>
              <Input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterLocation" className="text-foreground">
                Standort filtern
              </Label>
              <Input
                id="filterLocation"
                type="text"
                placeholder="Standort eingeben..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Verfügbarkeiten ({filteredEntries.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Telefonnummer</TableHead>
                  <TableHead className="text-foreground">Datum</TableHead>
                  <TableHead className="text-foreground">Startzeit</TableHead>
                  <TableHead className="text-foreground">Endzeit</TableHead>
                  <TableHead className="text-foreground">Standort</TableHead>
                  <TableHead className="text-foreground">Bemerkung</TableHead>
                  <TableHead className="text-foreground text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-border">
                    <TableCell className="text-foreground font-medium">
                      {entry.phone_number}
                    </TableCell>
                    <TableCell className="text-foreground">{entry.date}</TableCell>
                    <TableCell className="text-foreground">{entry.start_time}</TableCell>
                    <TableCell className="text-foreground">{entry.end_time}</TableCell>
                    <TableCell className="text-foreground">{entry.location}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(entry.id)}
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
        </Card>
      </div>

      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Verfügbarkeit bearbeiten</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ändern Sie die Details der Verfügbarkeit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_date" className="text-foreground">
                Datum
              </Label>
              <Input
                id="edit_date"
                type="date"
                value={editFormData.date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, date: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_time" className="text-foreground">
                  Startzeit
                </Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={editFormData.start_time}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, start_time: e.target.value })
                  }
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_time" className="text-foreground">
                  Endzeit
                </Label>
                <Input
                  id="edit_end_time"
                  type="time"
                  value={editFormData.end_time}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, end_time: e.target.value })
                  }
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_location" className="text-foreground">
                Standort
              </Label>
              <Input
                id="edit_location"
                type="text"
                value={editFormData.location}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, location: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes" className="text-foreground">
                Bemerkung
              </Label>
              <Textarea
                id="edit_notes"
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border text-foreground"
              onClick={() => setEditingEntry(null)}
            >
              Abbrechen
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleUpdateEntry}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
