import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Download, Search, Users, FileText, CheckCircle, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  guard_id_number: string | null;
  e_pin_number: string | null;
  onboarding_completed: boolean | null;
  personal_data_completed: boolean | null;
  rules_acknowledged: boolean | null;
  created_at: string | null;
}

const AdminEmployees = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: isAdmin, error } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });

    if (error || !isAdmin) {
      toast.error("Access denied - Admin privileges required");
      navigate("/");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number, guard_id_number, e_pin_number, onboarding_completed, personal_data_completed, rules_acknowledged, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Fehler beim Laden der Mitarbeiter");
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = employees.filter(emp => 
      `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase().includes(search) ||
      emp.email.toLowerCase().includes(search) ||
      (emp.phone_number || "").includes(search) ||
      (emp.guard_id_number || "").toLowerCase().includes(search)
    );
    setFilteredEmployees(filtered);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const downloadPdf = async (userId: string, type: "personalstammdaten" | "strafe_katalog", firstName: string | null, lastName: string | null) => {
    setDownloadingPdf(`${userId}-${type}`);
    try {
      const name = `${firstName || ""} ${lastName || ""}`.trim();
      const fileName = type === "personalstammdaten" 
        ? `${userId}/Personalstammdaten_${name}.pdf`
        : `${userId}/Strafe_${name}.pdf`;
      
      const { data, error } = await supabase.storage
        .from("onboarding-documents")
        .download(fileName);

      if (error) {
        if (error.message.includes("not found") || error.message.includes("Object not found")) {
          toast.error("PDF nicht gefunden");
        } else {
          throw error;
        }
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "personalstammdaten" 
        ? `Personalstammdaten_${name}.pdf`
        : `Strafe_${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("PDF heruntergeladen");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Fehler beim Herunterladen");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const getOnboardingStatus = (emp: Employee) => {
    if (emp.onboarding_completed) {
      return { label: "Abgeschlossen", color: "bg-green-500", icon: CheckCircle };
    }
    if (emp.personal_data_completed && !emp.rules_acknowledged) {
      return { label: "Schritt 2 ausstehend", color: "bg-yellow-500", icon: Clock };
    }
    if (!emp.personal_data_completed) {
      return { label: "Nicht gestartet", color: "bg-red-500", icon: AlertCircle };
    }
    return { label: "Unbekannt", color: "bg-gray-500", icon: AlertCircle };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Mitarbeiter-Übersicht
            </h1>
            <p className="text-muted-foreground mt-2">
              Onboarding-Status und Dokumente verwalten
            </p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Button
              variant="outline"
              onClick={() => navigate("/admin/dashboard")}
              className="border-border"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-border">
              <LogOut className="mr-2 h-4 w-4" />
              {t("admin.logout")}
            </Button>
          </div>
        </div>

        {/* Search & Stats */}
        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted border-border"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{employees.length}</div>
                <div className="text-xs text-muted-foreground">Gesamt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {employees.filter(e => e.onboarding_completed).length}
                </div>
                <div className="text-xs text-muted-foreground">Abgeschlossen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {employees.filter(e => !e.onboarding_completed && e.personal_data_completed).length}
                </div>
                <div className="text-xs text-muted-foreground">In Bearbeitung</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {employees.filter(e => !e.personal_data_completed).length}
                </div>
                <div className="text-xs text-muted-foreground">Nicht gestartet</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Employees Table */}
        <Card className="p-6 bg-card border-border">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Lädt...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Mitarbeiter gefunden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">E-Mail</TableHead>
                    <TableHead className="text-muted-foreground">Telefon</TableHead>
                    <TableHead className="text-muted-foreground">Guard ID</TableHead>
                    <TableHead className="text-muted-foreground">Onboarding-Status</TableHead>
                    <TableHead className="text-muted-foreground">Dokumente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const status = getOnboardingStatus(emp);
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={emp.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">
                          {emp.first_name} {emp.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.phone_number || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.guard_id_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${status.color} text-white border-none flex items-center gap-1 w-fit`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPdf(emp.id, "personalstammdaten", emp.first_name, emp.last_name)}
                              disabled={!emp.personal_data_completed || downloadingPdf === `${emp.id}-personalstammdaten`}
                              className="border-border text-xs"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {downloadingPdf === `${emp.id}-personalstammdaten` ? "..." : "Personal"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPdf(emp.id, "strafe_katalog", emp.first_name, emp.last_name)}
                              disabled={!emp.rules_acknowledged || downloadingPdf === `${emp.id}-strafe_katalog`}
                              className="border-border text-xs"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {downloadingPdf === `${emp.id}-strafe_katalog` ? "..." : "Strafe"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminEmployees;
