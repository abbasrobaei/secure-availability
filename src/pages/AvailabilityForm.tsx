import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Save, RefreshCw, Info } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay, isBefore, startOfToday } from "date-fns";
import { de } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type AvailabilityType = "single" | "range" | "recurring" | "weekend" | "weekdays";

const availabilityTypeConfig: Record<AvailabilityType, { label: string; color: string; bgColor: string }> = {
  single: { label: "Einzelner Tag", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  range: { label: "Zeitraum", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  recurring: { label: "Wiederkehrend", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  weekend: { label: "Nur Wochenende", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  weekdays: { label: "Nur Wochentage", color: "text-teal-600", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
};

const weekdayOptions = [
  { value: "monday", label: "Mo", fullLabel: "Montag" },
  { value: "tuesday", label: "Di", fullLabel: "Dienstag" },
  { value: "wednesday", label: "Mi", fullLabel: "Mittwoch" },
  { value: "thursday", label: "Do", fullLabel: "Donnerstag" },
  { value: "friday", label: "Fr", fullLabel: "Freitag" },
  { value: "saturday", label: "Sa", fullLabel: "Samstag" },
  { value: "sunday", label: "So", fullLabel: "Sonntag" },
];

// Cities with more than 500,000 inhabitants within 200km of Düsseldorf
const locationOptions = [
  "Düsseldorf",
  "Köln",
  "Essen",
  "Dortmund",
  "Duisburg",
  "Frankfurt am Main",
  "Amsterdam (NL)",
  "Rotterdam (NL)",
];

const availabilitySchema = z.object({
  date: z.string().min(1, "Datum ist erforderlich"),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  shiftType: z.string().optional(),
  location: z.string().min(1, "Einsatzort ist erforderlich"),
  isRecurring: z.boolean(),
  weekdays: z.string().optional(),
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
  
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>("single");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [mobileDeployable, setMobileDeployable] = useState("");
  const [notes, setNotes] = useState("");
  
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [editId]);

  // Auto-select weekdays based on availability type
  useEffect(() => {
    if (availabilityType === "weekend") {
      setSelectedWeekdays(["saturday", "sunday"]);
    } else if (availabilityType === "weekdays") {
      setSelectedWeekdays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    } else if (availabilityType === "single" || availabilityType === "range") {
      setSelectedWeekdays([]);
    }
  }, [availabilityType]);

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

  const loadAvailability = async (id: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("id", id)
      .eq("user_id", currentUserId)
      .single();

    if (error) {
      toast.error(t("toast.error"));
      navigate("/dashboard");
    } else if (data) {
      setSelectedDate(new Date(data.date));
      if (data.end_date) setSelectedEndDate(new Date(data.end_date));
      setStartTime(data.start_time || "");
      setEndTime(data.end_time || "");
      setShiftType(data.shift_type || "");
      setSelectedLocations(data.location ? data.location.split(",") : []);
      setMobileDeployable(data.mobile_deployable || "");
      setNotes(data.notes || "");
      
      if (data.weekdays) {
        const weekdays = data.weekdays.split(",");
        setSelectedWeekdays(weekdays);
        
        // Determine availability type from stored data
        if (weekdays.length === 2 && weekdays.includes("saturday") && weekdays.includes("sunday")) {
          setAvailabilityType("weekend");
        } else if (weekdays.length === 5 && !weekdays.includes("saturday") && !weekdays.includes("sunday")) {
          setAvailabilityType("weekdays");
        } else if (data.is_recurring) {
          setAvailabilityType("recurring");
        }
      } else if (data.end_date && data.date !== data.end_date) {
        setAvailabilityType("range");
      } else {
        setAvailabilityType("single");
      }
    }
  };

  const handleWeekdayToggle = (day: string) => {
    if (availabilityType === "weekend" || availabilityType === "weekdays") return;
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

    if (availabilityType === "range" && selectedDates.length === 0) {
      toast.error("Bitte wählen Sie mindestens ein Datum aus");
      return;
    }

    if (availabilityType !== "range" && !selectedDate) {
      toast.error("Bitte wählen Sie ein Datum aus");
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Einsatzort aus");
      return;
    }

    try {
      const isRecurring = availabilityType === "recurring" || availabilityType === "weekend" || availabilityType === "weekdays";
      const weekdaysString = isRecurring ? selectedWeekdays.join(",") : null;
      
      // For range type, use the sorted selected dates
      let dateStr: string;
      let endDateStr: string;
      
      if (availabilityType === "range" && selectedDates.length > 0) {
        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        dateStr = format(sortedDates[0], "yyyy-MM-dd");
        endDateStr = format(sortedDates[sortedDates.length - 1], "yyyy-MM-dd");
      } else {
        dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
        endDateStr = dateStr;
      }

      const dataToValidate = {
        date: dateStr,
        endDate: endDateStr,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        shiftType: shiftType || undefined,
        location: selectedLocations.join(","),
        isRecurring,
        weekdays: weekdaysString || undefined,
        mobileDeployable: mobileDeployable || undefined,
        notes: notes || undefined,
      };

      const validated = availabilitySchema.parse(dataToValidate);
      setLoading(true);

      const availabilityData = {
        user_id: userId,
        date: validated.date,
        start_time: validated.startTime || null,
        end_time: validated.endTime || null,
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

  const renderCalendarDay = (day: Date) => {
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isEndSelected = selectedEndDate && isSameDay(day, selectedEndDate);
    const isInRange = selectedDate && selectedEndDate && 
      isWithinInterval(day, { 
        start: startOfDay(selectedDate), 
        end: endOfDay(selectedEndDate) 
      });
    
    if (isSelected || isEndSelected) {
      return availabilityTypeConfig[availabilityType].bgColor;
    }
    if (isInRange && (availabilityType === "range" || availabilityType === "recurring" || availabilityType === "weekend" || availabilityType === "weekdays")) {
      return `${availabilityTypeConfig[availabilityType].bgColor} opacity-50`;
    }
    return "";
  };

  const showDatePicker = availabilityType === "single";
  const showMultipleDatePicker = availabilityType === "range";
  const showWeekdays = availabilityType === "recurring";
  const isWeekdaysDisabled = availabilityType === "weekend" || availabilityType === "weekdays";
  const today = startOfToday();

  const handleLocationToggle = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const handleMultipleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) {
        return prev.filter(d => !isSameDay(d, date));
      }
      return [...prev, date];
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-4 sm:py-8 px-2 sm:px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("form.back")}</span>
            </Button>
            <LanguageSwitcher />
          </div>

          <Card className="p-4 sm:p-8 bg-card border-border shadow-[var(--shadow-card)]">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {editId ? t("dashboard.edit") : t("hero.title")}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t("hero.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Availability Type Selection */}
              <div className="space-y-3">
                <Label className="text-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-secondary" />
                  Verfügbarkeitstyp
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(Object.keys(availabilityTypeConfig) as AvailabilityType[]).map((type) => (
                    <Tooltip key={type}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setAvailabilityType(type)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-center",
                            availabilityType === type
                              ? `border-secondary ${availabilityTypeConfig[type].bgColor}`
                              : "border-border hover:border-secondary/50"
                          )}
                        >
                          <span className={cn("text-xs sm:text-sm font-medium", availabilityTypeConfig[type].color)}>
                            {availabilityTypeConfig[type].label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getTypeDescription(type)}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Selected Type Badge */}
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", availabilityTypeConfig[availabilityType].bgColor, availabilityTypeConfig[availabilityType].color)}>
                  {availabilityTypeConfig[availabilityType].label}
                </Badge>
                {(availabilityType === "recurring" || availabilityType === "weekend" || availabilityType === "weekdays") && (
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Calendar Date Selection - Single Day */}
              {showDatePicker && (
                <div className="space-y-2">
                  <Label className="text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-secondary" />
                    Datum
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: de }) : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }}
                        locale={de}
                        disabled={(date) => isBefore(date, today)}
                        className="pointer-events-auto"
                        modifiersClassNames={{
                          selected: availabilityTypeConfig[availabilityType].bgColor,
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Calendar Date Selection - Multiple Days */}
              {showMultipleDatePicker && (
                <div className="space-y-2">
                  <Label className="text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-secondary" />
                    Tage auswählen (mehrfach möglich)
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          selectedDates.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDates.length > 0 
                          ? `${selectedDates.length} Tag(e) ausgewählt` 
                          : "Tage auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={handleMultipleDateSelect}
                        locale={de}
                        disabled={(date) => isBefore(date, today)}
                        className="pointer-events-auto"
                        modifiers={{
                          selected: selectedDates,
                        }}
                        modifiersClassNames={{
                          selected: availabilityTypeConfig[availabilityType].bgColor,
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
                        <Badge
                          key={date.toISOString()}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleMultipleDateSelect(date)}
                        >
                          {format(date, "dd.MM.yyyy", { locale: de })} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Weekday Selection for Recurring */}
              {(showWeekdays || isWeekdaysDisabled) && (
                <div className="space-y-2">
                  <Label className="text-foreground flex items-center gap-2">
                    Wochentage
                    {isWeekdaysDisabled && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Automatisch ausgewählt basierend auf dem Verfügbarkeitstyp</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map((day) => (
                      <Tooltip key={day.value}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleWeekdayToggle(day.value)}
                            disabled={isWeekdaysDisabled}
                            className={cn(
                              "w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all font-medium text-sm",
                              selectedWeekdays.includes(day.value)
                                ? "border-secondary bg-secondary text-secondary-foreground"
                                : "border-border hover:border-secondary/50",
                              isWeekdaysDisabled && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            {day.label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{day.fullLabel}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    Startzeit (optional)
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    Endzeit (optional)
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              {/* Mobile Deployable */}
              <div className="space-y-2">
                <Label className="text-foreground">{t("form.mobileDeployable")}</Label>
                <RadioGroup
                  value={mobileDeployable}
                  onValueChange={setMobileDeployable}
                  className="flex flex-wrap gap-4"
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

              {/* Shift Type */}
              <div className="space-y-2">
                <Label htmlFor="shiftType" className="text-foreground">Schichttyp</Label>
                <Select value={shiftType} onValueChange={setShiftType}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Schichttyp auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="dayShift">Tagschicht</SelectItem>
                    <SelectItem value="nightShift">Nachtschicht</SelectItem>
                    <SelectItem value="flexible">Flexibel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location - Multi-select */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-secondary" />
                  Bevorzugter Einsatzort (mehrfach möglich)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted rounded-lg border border-border">
                  {locationOptions.map((loc) => (
                    <div key={loc} className="flex items-center space-x-2">
                      <Checkbox
                        id={`loc-${loc}`}
                        checked={selectedLocations.includes(loc)}
                        onCheckedChange={() => handleLocationToggle(loc)}
                      />
                      <Label
                        htmlFor={`loc-${loc}`}
                        className="text-sm text-foreground cursor-pointer"
                      >
                        {loc}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedLocations.map((loc) => (
                      <Badge key={loc} variant="secondary" className="text-xs">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">
                  {t("form.notes")}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-muted border-border text-foreground"
                  rows={3}
                  maxLength={500}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
                disabled={loading || (availabilityType === "range" ? selectedDates.length === 0 : !selectedDate) || selectedLocations.length === 0}
                size="lg"
              >
                <Save className="mr-2 h-5 w-5" />
                {editId ? t("form.update") : t("form.save")}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

function getTypeDescription(type: AvailabilityType): string {
  switch (type) {
    case "single":
      return "Wählen Sie einen einzelnen Tag aus";
    case "range":
      return "Wählen Sie einen Start- und Enddatum";
    case "recurring":
      return "Wählen Sie wiederkehrende Wochentage";
    case "weekend":
      return "Automatisch Samstag und Sonntag";
    case "weekdays":
      return "Automatisch Montag bis Freitag";
    default:
      return "";
  }
}

export default AvailabilityForm;
