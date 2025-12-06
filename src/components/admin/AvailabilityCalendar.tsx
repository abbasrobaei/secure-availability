import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, Clock, MapPin, RotateCcw, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  first_name: string;
  last_name: string;
  phone_number: string;
}

interface AvailabilityCalendarProps {
  entries: AvailabilityEntry[];
  onSelectDate?: (date: Date, entries: AvailabilityEntry[]) => void;
}

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getShiftColor = (shiftType: string | null) => {
  switch (shiftType) {
    case 'earlyShift': return 'bg-yellow-500/80 text-yellow-950';
    case 'lateShift': return 'bg-orange-500/80 text-orange-950';
    case 'nightShift': return 'bg-indigo-500/80 text-white';
    case 'flexible': return 'bg-primary/80 text-primary-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getShiftLabel = (shiftType: string | null) => {
  const labels: Record<string, string> = {
    earlyShift: "Früh",
    lateShift: "Spät",
    nightShift: "Nacht",
    flexible: "Flex"
  };
  return shiftType ? labels[shiftType] || shiftType : "";
};

export const AvailabilityCalendar = ({ entries, onSelectDate }: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  // Adjust for German week starting on Monday
  const startDayOfWeek = monthStart.getDay();
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Create padding days for the start of the month
  const paddingDays = Array.from({ length: adjustedStartDay }, (_, i) => null);

  const getEntriesForDate = (date: Date): AvailabilityEntry[] => {
    return entries.filter(entry => {
      const entryStart = parseISO(entry.date);
      const entryEnd = entry.end_date ? parseISO(entry.end_date) : entryStart;

      // Check if date is within the range
      const isInRange = isWithinInterval(date, { start: entryStart, end: entryEnd }) || 
                        isSameDay(date, entryStart) || 
                        isSameDay(date, entryEnd);

      if (!isInRange) return false;

      // For recurring entries, check if the weekday matches
      if (entry.is_recurring && entry.weekdays) {
        const dayOfWeek = date.getDay();
        const weekdays = entry.weekdays.split(',');
        const matchesWeekday = weekdays.some(wd => WEEKDAY_MAP[wd.trim()] === dayOfWeek);
        return matchesWeekday;
      }

      return true;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayEntries = getEntriesForDate(date);
    onSelectDate?.(date, dayEntries);
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Selected date entries
  const selectedDateEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="border-border"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy', { locale: de })}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="border-border"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge className="bg-yellow-500/80 text-yellow-950 text-xs">Frühschicht</Badge>
        <Badge className="bg-orange-500/80 text-orange-950 text-xs">Spätschicht</Badge>
        <Badge className="bg-indigo-500/80 text-white text-xs">Nachtschicht</Badge>
        <Badge className="bg-primary/80 text-primary-foreground text-xs">Flexibel</Badge>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Padding for start of month */}
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="min-h-[100px] border-b border-r border-border bg-muted/20" />
          ))}

          {/* Actual days */}
          {daysInMonth.map((day) => {
            const dayEntries = getEntriesForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasEntries = dayEntries.length > 0;

            // Group entries by employee
            const entriesByEmployee = dayEntries.reduce((acc, entry) => {
              const key = `${entry.first_name} ${entry.last_name}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(entry);
              return acc;
            }, {} as Record<string, AvailabilityEntry[]>);

            const uniqueEmployees = Object.keys(entriesByEmployee).length;

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r border-border cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  isToday && "bg-primary/5",
                  isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary font-bold",
                    !isSameMonth(day, currentMonth) && "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasEntries && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary/10 text-primary">
                      {uniqueEmployees}
                    </Badge>
                  )}
                </div>

                {/* Entry previews (max 3) */}
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((entry, idx) => (
                    <Tooltip key={`${entry.id}-${idx}`}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate",
                          getShiftColor(entry.shift_type)
                        )}>
                          {entry.first_name.charAt(0)}. {entry.last_name}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{entry.first_name} {entry.last_name}</p>
                          <p className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.start_time?.substring(0, 5) || '–'} - {entry.end_time?.substring(0, 5) || '–'}
                          </p>
                          <p className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entry.location}
                          </p>
                          {entry.is_recurring && (
                            <p className="text-xs flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" /> Wiederkehrend
                            </p>
                          )}
                          {entry.mobile_deployable === 'yes' && (
                            <p className="text-xs flex items-center gap-1">
                              <Car className="h-3 w-3" /> Mobil einsetzbar
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayEntries.length - 3} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
            <Badge variant="secondary" className="ml-auto">
              {selectedDateEntries.length} Verfügbar
            </Badge>
          </h4>

          {selectedDateEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Verfügbarkeiten an diesem Tag</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {selectedDateEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={cn(
                    "p-3 rounded-lg border border-border",
                    entry.shift_type === 'earlyShift' && "border-l-4 border-l-yellow-500",
                    entry.shift_type === 'lateShift' && "border-l-4 border-l-orange-500",
                    entry.shift_type === 'nightShift' && "border-l-4 border-l-indigo-500",
                    entry.shift_type === 'flexible' && "border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.first_name} {entry.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.phone_number}</p>
                    </div>
                    <div className="flex gap-1">
                      {entry.is_recurring && (
                        <Badge variant="outline" className="text-xs h-5 px-1">
                          <RotateCcw className="h-3 w-3" />
                        </Badge>
                      )}
                      {entry.mobile_deployable === 'yes' && (
                        <Badge variant="outline" className="text-xs h-5 px-1 text-green-500 border-green-500/30">
                          <Car className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.start_time?.substring(0, 5) || '–'} - {entry.end_time?.substring(0, 5) || '–'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {entry.location.split(',').slice(0, 2).join(', ')}
                      {entry.location.split(',').length > 2 && '...'}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge className={cn("text-xs", getShiftColor(entry.shift_type))}>
                      {getShiftLabel(entry.shift_type) || 'Keine Schicht'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
