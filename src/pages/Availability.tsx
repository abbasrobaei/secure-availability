import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, MapPin, Phone, Calendar, Save } from "lucide-react";
import { z } from "zod";

const availabilitySchema = z.object({
  phone_number: z.string().trim().min(5, "Telefonnummer muss mindestens 5 Zeichen lang sein").max(20, "Telefonnummer darf maximal 20 Zeichen lang sein"),
  date: z.string().nonempty("Startdatum wird benötigt"),
  end_date: z.string().nonempty("Enddatum wird benötigt"),
  start_time: z.string().nonempty("Startzeit wird benötigt"),
  end_time: z.string().nonempty("Endzeit wird benötigt"),
  shift_type: z.string().optional(),
  weekdays: z.string().optional(),
  location: z.string().trim().nonempty("Standort wird benötigt").max(200, "Standort darf maximal 200 Zeichen lang sein"),
  notes: z.string().max(500, "Bemerkung darf maximal 500 Zeichen lang sein").optional(),
});

const Availability = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    phone_number: "",
    date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    shift_type: "",
    weekdays: "",
    location: "",
    notes: "",
  });

  const weekdayOptions = [
    { value: "Montag", label: "Montag" },
    { value: "Dienstag", label: "Dienstag" },
    { value: "Mittwoch", label: "Mittwoch" },
    { value: "Donnerstag", label: "Donnerstag" },
    { value: "Freitag", label: "Freitag" },
    { value: "Samstag", label: "Samstag" },
    { value: "Sonntag", label: "Sonntag" },
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
          phone_number: data.phone_number,
          date: data.date,
          end_date: data.end_date || data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          shift_type: data.shift_type || "",
          weekdays: data.weekdays || "",
          location: data.location,
          notes: data.notes || "",
        });
        toast.info("Es existiert bereits eine Verfügbarkeit mit dieser Telefonnummer. Sie können sie jetzt ändern.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = availabilitySchema.parse(formData);
      setLoading(true);

      if (existingEntry) {
        const { error } = await supabase
          .from("availability")
          .update({
            date: validated.date,
            end_date: validated.end_date,
            start_time: validated.start_time,
            end_time: validated.end_time,
            shift_type: validated.shift_type || null,
            weekdays: validated.weekdays || null,
            location: validated.location,
            notes: validated.notes || null,
          })
          .eq("id", existingEntry.id);

        if (error) throw error;
        toast.success("Verfügbarkeit erfolgreich aktualisiert!");
      } else {
        const { error } = await supabase
          .from("availability")
          .insert([{
            phone_number: validated.phone_number,
            date: validated.date,
            end_date: validated.end_date,
            start_time: validated.start_time,
            end_time: validated.end_time,
            shift_type: validated.shift_type || null,
            weekdays: validated.weekdays || null,
            location: validated.location,
            notes: validated.notes || null,
          }]);

        if (error) throw error;
        toast.success("Verfügbarkeit erfolgreich gespeichert!");
      }

      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error("Error saving availability:", error);
        toast.error("Fehler beim Speichern der Verfügbarkeit");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>

        <Card className="p-8 bg-card border-border shadow-[var(--shadow-card)]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Clock className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Verfügbarkeit eintragen
            </h1>
            <p className="text-muted-foreground">
              Teilen Sie uns Ihre verfügbaren Arbeitszeiten mit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-foreground flex items-center">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                Telefonnummer *
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
                  Von Datum *
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
                  Bis Datum *
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

            <div className="space-y-2">
              <Label htmlFor="shift_type" className="text-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2 text-primary" />
                Schichttyp
              </Label>
              <Select
                value={formData.shift_type}
                onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Schichttyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tagschicht">Tagschicht</SelectItem>
                  <SelectItem value="Nachtschicht">Nachtschicht</SelectItem>
                  <SelectItem value="Wochenende">Wochenende</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                Wochentage
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
                placeholder="Oder individuell eingeben (z.B. 'diese Woche Freitag')"
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
                  Startzeit *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  Endzeit *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                Standort *
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="z.B. Berlin Mitte"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Bemerkung (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Zusätzliche Informationen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-muted border-border text-foreground min-h-24"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading}
              size="lg"
            >
              <Save className="mr-2 h-5 w-5" />
              {existingEntry ? "Verfügbarkeit aktualisieren" : "Verfügbarkeit speichern"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Availability;
