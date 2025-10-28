import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, MapPin, Phone, Calendar, Save, User, RotateCcw } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const availabilitySchema = z.object({
  first_name: z.string().trim().min(1, "toast.firstNameRequired").max(100, "First name too long"),
  last_name: z.string().trim().min(1, "toast.lastNameRequired").max(100, "Last name too long"),
  phone_number: z.string().trim().min(5, "toast.phoneRequired").max(20, "Phone number too long"),
  date: z.string().nonempty("toast.dateRequired"),
  end_date: z.string().nonempty("toast.endDateRequired"),
  is_recurring: z.boolean().default(false),
  start_time: z.string().nonempty("toast.startTimeRequired"),
  end_time: z.string().nonempty("toast.endTimeRequired"),
  shift_type: z.string().optional(),
  weekdays: z.string().optional(),
  location: z.string().trim().nonempty("toast.locationRequired").max(200, "Location too long"),
  mobile_deployable: z.string().optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

const Availability = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    date: "",
    end_date: "",
    is_recurring: false,
    start_time: "",
    end_time: "",
    shift_type: "",
    weekdays: "",
    location: "",
    mobile_deployable: "",
    notes: "",
  });

  const weekdayOptions = [
    { value: "monday", label: t("days.monday") },
    { value: "tuesday", label: t("days.tuesday") },
    { value: "wednesday", label: t("days.wednesday") },
    { value: "thursday", label: t("days.thursday") },
    { value: "friday", label: t("days.friday") },
    { value: "saturday", label: t("days.saturday") },
    { value: "sunday", label: t("days.sunday") },
  ];

  const checkExistingEntry = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingEntry(data);
        const weekdaysArray = data.weekdays ? data.weekdays.split(", ") : [];
        setSelectedWeekdays(weekdaysArray);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone_number: data.phone_number,
          date: data.date,
          end_date: data.end_date || data.date,
          is_recurring: data.is_recurring || false,
          start_time: data.start_time,
          end_time: data.end_time,
          shift_type: data.shift_type || "",
          weekdays: data.weekdays || "",
          location: data.location,
          mobile_deployable: data.mobile_deployable || "",
          notes: data.notes || "",
        });
        toast.info(t("toast.existingEntry"));
      }
    } catch (error) {
      console.error("Error checking existing entry:", error);
    }
  };

  const handlePhoneNumberBlur = () => {
    if (formData.phone_number && formData.phone_number.length >= 5) {
      checkExistingEntry(formData.phone_number);
    }
  };

  const handleWeekdayToggle = (day: string) => {
    setSelectedWeekdays((prev) => {
      const newSelection = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];
      setFormData({ ...formData, weekdays: newSelection.join(", ") });
      return newSelection;
    });
  };

  const handleReset = () => {
    setFormData({
      first_name: "",
      last_name: "",
      phone_number: "",
      date: "",
      end_date: "",
      is_recurring: false,
      start_time: "",
      end_time: "",
      shift_type: "",
      weekdays: "",
      location: "",
      mobile_deployable: "",
      notes: "",
    });
    setSelectedWeekdays([]);
    setExistingEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = availabilitySchema.parse(formData);
      setLoading(true);

      if (existingEntry) {
        const { error } = await supabase
          .from("availability")
          .update({
            first_name: validated.first_name,
            last_name: validated.last_name,
            date: validated.date,
            end_date: validated.end_date,
            is_recurring: validated.is_recurring,
            start_time: validated.start_time,
            end_time: validated.end_time,
            shift_type: validated.shift_type || null,
            weekdays: validated.weekdays || null,
            location: validated.location,
            mobile_deployable: validated.mobile_deployable || null,
            notes: validated.notes || null,
          })
          .eq("id", existingEntry.id);

        if (error) throw error;
        toast.success(t("toast.updateSuccess"));
      } else {
        const { error } = await supabase
          .from("availability")
          .insert([{
            first_name: validated.first_name,
            last_name: validated.last_name,
            phone_number: validated.phone_number,
            date: validated.date,
            end_date: validated.end_date,
            is_recurring: validated.is_recurring,
            start_time: validated.start_time,
            end_time: validated.end_time,
            shift_type: validated.shift_type || null,
            weekdays: validated.weekdays || null,
            location: validated.location,
            mobile_deployable: validated.mobile_deployable || null,
            notes: validated.notes || null,
          }]);

        if (error) throw error;
        toast.success(t("toast.saveSuccess"));
      }

      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(t(err.message));
        });
      } else {
        console.error("Error saving availability:", error);
        toast.error(t("toast.saveError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("form.back")}
          </Button>
          <LanguageSwitcher />
        </div>

        <Card className="p-8 bg-card border-border shadow-[var(--shadow-card)]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Clock className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("hero.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-foreground flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  {t("form.firstName")} *
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder={t("form.firstName")}
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-foreground flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  {t("form.lastName")} *
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder={t("form.lastName")}
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-foreground flex items-center">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                {t("form.phoneNumber")} *
              </Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="+49 123 456789"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                onBlur={handlePhoneNumberBlur}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  {t("form.fromDate")} *
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
                <Label htmlFor="end_date" className="text-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  {t("form.toDate")} *
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">
                {t("form.isRecurring")}
              </Label>
              <RadioGroup
                value={formData.is_recurring ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, is_recurring: value === "yes" })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="recurring-yes" />
                  <Label htmlFor="recurring-yes" className="font-normal cursor-pointer">
                    {t("form.recurringYes")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="recurring-no" />
                  <Label htmlFor="recurring-no" className="font-normal cursor-pointer">
                    {t("form.recurringNo")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                {t("form.weekdays")}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {weekdayOptions.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={selectedWeekdays.includes(day.value)}
                      onCheckedChange={() => handleWeekdayToggle(day.value)}
                      className="border-border"
                    />
                    <Label
                      htmlFor={day.value}
                      className="text-sm font-normal cursor-pointer text-foreground"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              <Input
                placeholder={t("form.customWeekdays")}
                value={formData.weekdays}
                onChange={(e) => {
                  setFormData({ ...formData, weekdays: e.target.value });
                  setSelectedWeekdays([]);
                }}
                className="bg-muted border-border text-foreground mt-2"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  {t("form.startTime")} *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  placeholder="--:--"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  {t("form.endTime")} *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  placeholder="--:--"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_type" className="text-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2 text-primary" />
                {t("form.shiftType")}
              </Label>
              <Select
                value={formData.shift_type}
                onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder={t("form.selectShiftType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earlyShift">{t("form.earlyShift")}</SelectItem>
                  <SelectItem value="lateShift">{t("form.lateShift")}</SelectItem>
                  <SelectItem value="nightShift">{t("form.nightShift")}</SelectItem>
                  <SelectItem value="flexible">{t("form.flexible")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                {t("form.location")}
              </Label>
              <Input
                id="location"
                type="text"
                placeholder={t("form.locationPlaceholder")}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_deployable" className="text-foreground">
                {t("form.mobileDeployable")}
              </Label>
              <Select
                value={formData.mobile_deployable}
                onValueChange={(value) => setFormData({ ...formData, mobile_deployable: value })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder={t("form.mobileDeployable")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t("form.mobileYes")}</SelectItem>
                  <SelectItem value="no">{t("form.mobileNo")}</SelectItem>
                  <SelectItem value="onRequest">{t("form.mobileOnRequest")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                {t("form.notes")}
              </Label>
              <Textarea
                id="notes"
                placeholder={t("form.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-muted border-border text-foreground min-h-24"
              />
            </div>

            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t("form.consent")}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("form.reset")}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={loading}
                size="lg"
              >
                <Save className="mr-2 h-5 w-5" />
                {existingEntry ? t("form.update") : t("form.save")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Availability;
