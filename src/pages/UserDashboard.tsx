import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { format } from "date-fns";
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

interface Profile {
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean | null;
}

interface Availability {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string | null;
  location: string;
  is_recurring: boolean;
  weekdays: string | null;
  end_date: string | null;
  mobile_deployable: string | null;
  notes: string | null;
}

const UserDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    await loadProfile(session.user.id);
    await loadAvailabilities(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, onboarding_completed")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
    } else {
      // Check if onboarding is completed
      if (!data.onboarding_completed) {
        navigate("/onboarding");
        return;
      }
      setProfile(data);
    }
  };

  const loadAvailabilities = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading availabilities:", error);
      toast.error(t("toast.error"));
    } else {
      setAvailabilities(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("auth.logoutSuccess"));
    navigate("/");
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error(t("dashboard.deleteError"));
    } else {
      toast.success(t("dashboard.deleteSuccess"));
      setAvailabilities(availabilities.filter(a => a.id !== deleteId));
    }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("dashboard.title")}
            </h1>
            {profile && (
              <p className="text-lg text-muted-foreground">
                {t("dashboard.welcome")}, {profile.first_name} {profile.last_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-border"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("auth.logout")}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => navigate("/availability")}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t("dashboard.addNew")}
          </Button>
        </div>

        <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Calendar className="mr-2 h-6 w-6 text-secondary" />
            {t("dashboard.myAvailability")}
          </h2>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">
              {t("admin.loading")}...
            </p>
          ) : availabilities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("dashboard.noEntries")}
            </p>
          ) : (
            <div className="space-y-4">
              {availabilities.map((availability) => (
                <div
                  key={availability.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-semibold text-foreground">
                        {format(new Date(availability.date), "dd.MM.yyyy")}
                      </span>
                      <span className="text-muted-foreground">
                        {availability.start_time} - {availability.end_time}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {availability.shift_type && (
                        <span className="px-2 py-1 bg-secondary/20 text-secondary rounded">
                          {availability.shift_type}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-primary/20 text-primary rounded">
                        {availability.location}
                      </span>
                      {availability.is_recurring && (
                        <span className="px-2 py-1 bg-accent/20 text-accent rounded">
                          {t("form.recurring")}
                        </span>
                      )}
                    </div>
                    {availability.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {availability.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/availability?edit=${availability.id}`)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(availability.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {t("dashboard.confirmDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("dashboard.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">
              {t("form.back")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dashboard.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserDashboard;
