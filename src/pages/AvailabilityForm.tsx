import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, MapPin, Save } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const availabilitySchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  shiftType: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  isRecurring: z.boolean(),
  weekdays: z.string().optional(),
  endDate: z.string().optional(),
  mobileDeployable: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const AvailabilityForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    shiftType: "",
    location: "",
    isRecurring: false,
    weekdays: "",
    endDate: "",
    mobileDeployable: "",
    notes: "",
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, [editId]);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUserId(session.user.id);

    if (editId) {
      await loadAvailability(editId, session.user.id);
    }
  };

  const loadAvailability = async (id: string, userId: string) => {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      toast.error(t("toast.error"));
      navigate("/dashboard");
    } else if (data) {
      setFormData({
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        shiftType: data.shift_type || "",
        location: data.location,
        isRecurring: data.is_recurring,
        weekdays: data.weekdays || "",
        endDate: data.end_date || "",
        mobileDeployable: data.mobile_deployable || "",
        notes: data.notes || "",
      });
      if (data.weekdays) {
        setSelectedWeekdays(data.weekdays.split(","));
      }
    }
  };

  const handleWeekdayToggle = (day: string) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error(t("auth.authError"));
      return;
    }

    try {
      const dataToValidate = {
        ...formData,
        weekdays: formData.isRecurring ? selectedWeekdays.join(",") : undefined,
      };

      const validated = availabilitySchema.parse(dataToValidate);
      setLoading(true);

      const availabilityData = {
        user_id: userId,
        date: validated.date,
        start_time: validated.startTime,
        end_time: validated.endTime,
        shift_type: validated.shiftType || null,
        location: validated.location,
        is_recurring: validated.isRecurring,
        weekdays: validated.weekdays || null,
        end_date: validated.endDate || null,
        mobile_deployable: validated.mobileDeployable || null,
        notes: validated.notes || null,
      };

      if (editId) {
        const { error } = await supabase
          .from("availability")
          .update(availabilityData)
          .eq("id", editId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("availability")
          .insert([availabilityData]);

        if (error) throw error;
      }

      toast.success(t("toast.success"));
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error("Error saving availability:", error);
        toast.error(t("toast.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("form.back")}
          </Button>
          <LanguageSwitcher />
        </div>

        <Card className="p-8 bg-card border-border shadow-[var(--shadow-card)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {editId ? t("dashboard.edit") : t("hero.title")}
            </h1>
            <p className="text-muted-foreground">{t("hero.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-secondary" />
                  {t("form.fromDate")}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-foreground flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-secondary" />
                  {t("form.preferredLocation")}
                </Label>
                <Input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-secondary" />
                  {t("form.startTime")}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-secondary" />
                  {t("form.endTime")}
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRecurring: checked as boolean })
                  }
                />
                <Label htmlFor="isRecurring" className="text-foreground cursor-pointer">
                  {t("form.recurring")}
                </Label>
              </div>

              {formData.isRecurring && (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground">{t("form.selectDays")}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                        (day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={day}
                              checked={selectedWeekdays.includes(day)}
                              onCheckedChange={() => handleWeekdayToggle(day)}
                            />
                            <Label
                              htmlFor={day}
                              className="text-sm text-foreground cursor-pointer"
                            >
                              {t(`days.${day}`)}
                            </Label>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-foreground">
                      {t("form.endDate")}
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t("form.mobileDeployable")}</Label>
              <RadioGroup
                value={formData.mobileDeployable}
                onValueChange={(value) =>
                  setFormData({ ...formData, mobileDeployable: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="mobile-yes" />
                  <Label htmlFor="mobile-yes" className="text-foreground cursor-pointer">
                    {t("form.yes")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mobile-no" />
                  <Label htmlFor="mobile-no" className="text-foreground cursor-pointer">
                    {t("form.no")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                {t("form.notes")}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-muted border-border text-foreground"
                rows={4}
                maxLength={500}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              disabled={loading}
              size="lg"
            >
              <Save className="mr-2 h-5 w-5" />
              {editId ? t("form.update") : t("form.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AvailabilityForm;
