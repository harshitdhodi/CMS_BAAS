'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  startOfDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  Clock,
  MapPin,
  Tag,
  Filter,
  Check,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Default categories configuration
const CATEGORIES = [
  { name: 'Meeting', color: '#3b82f6', bgClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' },
  { name: 'Event', color: '#10b981', bgClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' },
  { name: 'Maintenance', color: '#f59e0b', bgClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' },
  { name: 'Reminder', color: '#8b5cf6', bgClass: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20' },
  { name: 'Important', color: '#ef4444', bgClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' },
  { name: 'General', color: '#6b7280', bgClass: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20' },
];

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Rose
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6b7280', // Gray
];

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: string;
  color: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<'month' | 'week' | 'agenda'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    CATEGORIES.map((c) => c.name)
  );

  // Modal State
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formCategory, setFormCategory] = useState('Meeting');
  const [formColor, setFormColor] = useState('#3b82f6');

  // Delete Alert Dialog State
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const { toast } = useToast();

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar');
      const result = await res.json();
      if (result.success) {
        setEvents(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load events',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      toast({
        title: 'Error',
        description: 'Connection error while loading events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events based on search query and category filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = selectedCategories.includes(event.category);
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedCategories, searchQuery]);

  // Helper to resolve events for a specific day
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((event) => {
      const start = startOfDay(parseISO(event.startDate));
      const end = startOfDay(parseISO(event.endDate));
      const target = startOfDay(day);
      return target >= start && target <= end;
    });
  };

  // Helper to open event dialog in create mode
  const handleOpenCreateModal = (date: Date = currentDate) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    setSelectedEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormStartDate(formattedDate);
    setFormStartTime('09:00');
    setFormEndDate(formattedDate);
    setFormEndTime('10:00');
    setFormAllDay(false);
    setFormCategory('Meeting');
    setFormColor('#3b82f6');
    setIsEventDialogOpen(true);
  };

  // Helper to open event dialog in edit mode
  const handleOpenEditModal = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering cell click
    setSelectedEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    
    const startParsed = parseISO(event.startDate);
    const endParsed = parseISO(event.endDate);
    
    setFormStartDate(format(startParsed, 'yyyy-MM-dd'));
    setFormStartTime(format(startParsed, 'HH:mm'));
    setFormEndDate(format(endParsed, 'yyyy-MM-dd'));
    setFormEndTime(format(endParsed, 'HH:mm'));
    setFormAllDay(event.allDay);
    setFormCategory(event.category);
    setFormColor(event.color);
    setIsEventDialogOpen(true);
  };

  // Handle Form Submission (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Event title is required', variant: 'destructive' });
      return;
    }

    let startIso: string;
    let endIso: string;

    try {
      if (formAllDay) {
        startIso = new Date(`${formStartDate}T00:00:00.000Z`).toISOString();
        endIso = new Date(`${formEndDate}T23:59:59.999Z`).toISOString();
      } else {
        const startLocal = new Date(`${formStartDate}T${formStartTime}`);
        const endLocal = new Date(`${formEndDate}T${formEndTime}`);
        if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
          throw new Error('Invalid date/time input');
        }
        startIso = startLocal.toISOString();
        endIso = endLocal.toISOString();
      }

      if (new Date(startIso) > new Date(endIso)) {
        toast({ title: 'Validation Error', description: 'Start date/time must be before End date/time', variant: 'destructive' });
        return;
      }
    } catch (err) {
      toast({ title: 'Validation Error', description: 'Please enter valid date and time values', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const payload = {
      title: formTitle,
      description: formDescription,
      startDate: startIso,
      endDate: endIso,
      allDay: formAllDay,
      category: formCategory,
      color: formColor,
    };

    try {
      const url = selectedEvent ? `/api/calendar/${selectedEvent.id}` : '/api/calendar';
      const method = selectedEvent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: selectedEvent ? 'Event updated successfully' : 'Event created successfully',
        });
        setIsEventDialogOpen(false);
        fetchEvents();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save event',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Save event error:', err);
      toast({
        title: 'Error',
        description: 'Connection error while saving event',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Event deleted successfully' });
        setIsDeleteAlertOpen(false);
        setIsEventDialogOpen(false);
        fetchEvents();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete event', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Delete event error:', err);
      toast({ title: 'Error', description: 'Connection error while deleting event', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Category Toggle Filter
  const toggleCategoryFilter = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((name) => name !== catName) : [...prev, catName]
    );
  };

  // Category Selector syncs Category Selection to Preset Category Color
  const handleCategoryChange = (val: string) => {
    setFormCategory(val);
    const categoryInfo = CATEGORIES.find((c) => c.name === val);
    if (categoryInfo) {
      setFormColor(categoryInfo.color);
    }
  };

  // Navigation Logic
  const handlePrev = () => {
    if (activeView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (activeView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 7));
  };

  const handleNext = () => {
    if (activeView === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (activeView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // -------------------------------------------------------------
  // MONTH VIEW RENDER
  // -------------------------------------------------------------
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex-1 flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border/40 bg-muted/20 text-center font-semibold text-xs tracking-wider uppercase text-muted-foreground py-3">
          {weekDays.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border/30 bg-background/50">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                onClick={() => handleOpenCreateModal(day)}
                className={`min-h-[110px] p-2 flex flex-col gap-1 transition-all cursor-pointer hover:bg-muted/10 relative ${
                  isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40 bg-muted/[0.02]'
                }`}
              >
                {/* Date Number Label */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono px-1">
                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                    </span>
                  )}
                </div>

                {/* Day Events List */}
                <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleOpenEditModal(event, e)}
                      className="px-2 py-0.5 text-[10.5px] font-medium rounded truncate shadow-sm transition-transform hover:-translate-y-px flex items-center gap-1 border"
                      style={{
                        backgroundColor: `${event.color}12`,
                        borderColor: `${event.color}25`,
                        borderLeft: `3px solid ${event.color}`,
                        color: event.color,
                      }}
                      title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
                    >
                      {!event.allDay && (
                        <span className="opacity-80 shrink-0 font-mono text-[9px]">
                          {format(parseISO(event.startDate), 'HH:mm')}
                        </span>
                      )}
                      <span className="truncate flex-1">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9.5px] font-medium text-primary/70 pl-1 mt-0.5">
                      + {dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // WEEK VIEW RENDER
  // -------------------------------------------------------------
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-4 flex-1">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={idx}
              className={`flex flex-col h-full min-h-[480px] bg-card border-border/60 hover:shadow-md transition-shadow relative overflow-hidden ${
                isToday ? 'ring-2 ring-primary/20 border-primary/40' : ''
              }`}
            >
              {/* Header Info */}
              <div
                onClick={() => handleOpenCreateModal(day)}
                className={`p-3 text-center border-b border-border/40 cursor-pointer transition-colors hover:bg-muted/30 flex flex-col items-center gap-1 ${
                  isToday ? 'bg-primary/5' : 'bg-muted/10'
                }`}
              >
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {format(day, 'eee')}
                </span>
                <span
                  className={`text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events Cards */}
              <CardContent className="flex-1 p-2 overflow-y-auto space-y-2 mt-1">
                {dayEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-10 text-center">
                    <p className="text-[11px] text-muted-foreground/60 italic">No events</p>
                  </div>
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleOpenEditModal(event, e)}
                      className="p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:shadow-sm hover:scale-[1.01] group relative"
                      style={{
                        backgroundColor: `${event.color}07`,
                        borderColor: `${event.color}15`,
                        borderLeft: `4px solid ${event.color}`,
                      }}
                    >
                      <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium mt-2 font-mono">
                        <Clock className="w-3 h-3 opacity-70" />
                        {event.allDay ? (
                          <span>All Day</span>
                        ) : (
                          <span>
                            {format(parseISO(event.startDate), 'hh:mm a')}
                          </span>
                        )}
                      </div>

                      {/* Mini Category badge */}
                      <span className="inline-block text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded-full mt-1.5"
                        style={{
                          backgroundColor: `${event.color}15`,
                          color: event.color
                        }}
                      >
                        {event.category}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // -------------------------------------------------------------
  // AGENDA VIEW RENDER
  // -------------------------------------------------------------
  const renderAgendaView = () => {
    // Sort events by starting date chronologically
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    if (sortedEvents.length === 0) {
      return (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-primary/[0.01]">
          <ListTodo className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-base text-foreground">No events found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            No events match your current filter or search criteria. Click "+ Add Event" to schedule something new!
          </p>
          <Button onClick={() => handleOpenCreateModal()} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Chronological Timeline ({sortedEvents.length} events)
          </h3>
        </div>

        <div className="relative border-l-2 border-border/50 ml-3 pl-6 space-y-6">
          {sortedEvents.map((event) => {
            const start = parseISO(event.startDate);
            const end = parseISO(event.endDate);
            const isSingleDay = isSameDay(start, end);

            return (
              <div key={event.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-background transition-transform group-hover:scale-125"
                  style={{ borderColor: event.color, boxShadow: `0 0 8px ${event.color}40` }}
                />

                <Card
                  onClick={(e) => handleOpenEditModal(event, e)}
                  className="bg-card hover:border-primary/30 border-border/60 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Category Tag */}
                        <span
                          className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${event.color}10`,
                            borderColor: `${event.color}25`,
                            color: event.color,
                          }}
                        >
                          {event.category}
                        </span>
                        
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                          {event.title}
                        </h3>
                      </div>

                      {event.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-2xl">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Event Dates Details Card */}
                    <div className="flex flex-col md:items-end justify-start gap-1 sm:text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary opacity-80" />
                        {isSingleDay ? (
                          <span>{format(start, 'MMMM d, yyyy')}</span>
                        ) : (
                          <span>
                            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium font-mono mt-0.5">
                        <Clock className="w-3.5 h-3.5 opacity-60" />
                        {event.allDay ? (
                          <span>All Day Event</span>
                        ) : (
                          <span>
                            {format(start, 'hh:mm a')} to {format(end, 'hh:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // MINI CALENDAR RENDER FOR SIDEBAR
  // -------------------------------------------------------------
  const renderMiniCalendar = () => {
    const startMonth = startOfMonth(currentDate);
    const endMonth = endOfMonth(currentDate);
    const startWeek = startOfWeek(startMonth, { weekStartsOn: 0 });
    const endWeek = endOfWeek(endMonth, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startWeek, end: endWeek });

    const weekdayShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span>{format(currentDate, 'MMMM yyyy')}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-muted-foreground/80 uppercase">
          {weekdayShort.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isCurrMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const hasEvents = getEventsForDay(day).length > 0;

            return (
              <button
                key={idx}
                onClick={() => setCurrentDate(day)}
                disabled={!isCurrMonth}
                className={`h-6 w-full text-[10px] font-medium rounded-md flex flex-col items-center justify-center relative hover:bg-primary/10 transition-colors ${
                  isToday
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : isCurrMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/30 pointer-events-none'
                }`}
              >
                <span>{format(day, 'd')}</span>
                {hasEvents && !isToday && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full space-y-6">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Calendar Manager</h2>
          <p className="text-base text-muted-foreground mt-1 max-w-xl">
            Schedule meetings, set milestones, and organize operational events in one central place
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Selector Tabs */}
          <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setActiveView('month')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeView === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setActiveView('week')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeView === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setActiveView('agenda')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeView === 'agenda' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Agenda
            </button>
          </div>

          <Button onClick={() => handleOpenCreateModal()} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* SIDEBAR PANELS */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Box */}
          <div className="relative bg-card rounded-xl border border-border/60 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" /> Search Events
            </h3>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-background h-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground/60" />
            </div>
          </div>

          {/* Mini Calendar navigation */}
          <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> Calendar Navigator
            </h3>
            {renderMiniCalendar()}
          </div>

          {/* Categories list filter checkboxes */}
          <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" /> Filter Categories
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedCategories(
                    selectedCategories.length === CATEGORIES.length ? [] : CATEGORIES.map((c) => c.name)
                  )
                }
                className="h-auto p-0.5 text-[10px] text-primary font-bold hover:bg-transparent"
              >
                {selectedCategories.length === CATEGORIES.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isChecked = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategoryFilter(cat.name)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors text-left text-xs text-foreground/80 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border/80 bg-background'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CALENDAR DISPLAY WINDOW */}
        <div className="lg:col-span-3 flex flex-col min-h-[500px]">
          {/* Grid control bar */}
          <div className="flex items-center justify-between bg-card border border-border/60 rounded-xl p-3.5 mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {activeView === 'month' && format(currentDate, 'MMMM yyyy')}
                {activeView === 'week' && (
                  <span>
                    Week of {format(startOfWeek(currentDate), 'MMM d, yyyy')}
                  </span>
                )}
                {activeView === 'agenda' && 'Agenda Details'}
              </h3>
              
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-primary/70">
                <div className="w-3 h-3 rounded-full border border-primary/30 border-t-primary animate-spin" />
                <span>Syncing events...</span>
              </div>
            )}
          </div>

          {/* Core view renderer */}
          <div className="flex-1 flex flex-col">
            {activeView === 'month' && renderMonthView()}
            {activeView === 'week' && renderWeekView()}
            {activeView === 'agenda' && renderAgendaView()}
          </div>
        </div>
      </div>

      {/* EVENT FORM CREATE/EDIT DIALOG */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Modify Scheduled Event' : 'Schedule New Event'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Modify the options below to update this event in the system.' : 'Create an event card to schedule meetings, tasks, or maintenance items.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 py-3">
            {/* Title field */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">Event Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. System Maintenance Window"
                required
                className="text-sm"
              />
            </div>

            {/* Category & Color Picker Grid row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                <Select value={formCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category" className="text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Event Color Tag</Label>
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormColor(col)}
                      className="w-5 h-5 rounded-full border border-border flex items-center justify-center relative cursor-pointer"
                      style={{ backgroundColor: col }}
                    >
                      {formColor === col && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                      )}
                    </button>
                  ))}
                  {/* Custom color input support */}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-5 h-5 rounded border border-border p-0 bg-transparent cursor-pointer h-5 shrink-0"
                    title="Custom color hex"
                  />
                </div>
              </div>
            </div>

            {/* All Day Toggle Switch */}
            <div className="flex items-center justify-between border rounded-lg p-2.5 bg-muted/10 border-border/50">
              <div className="space-y-0.5">
                <Label htmlFor="allday" className="text-xs font-semibold cursor-pointer">All Day Event</Label>
                <p className="text-[10px] text-muted-foreground">Blocks out the entire day grid cell</p>
              </div>
              <Switch
                id="allday"
                checked={formAllDay}
                onCheckedChange={setFormAllDay}
              />
            </div>

            {/* Dates range fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-semibold">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formStartTime}
                  disabled={formAllDay}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-xs font-semibold">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formEndTime}
                  disabled={formAllDay}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            {/* Description text area */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">Description / Notes</Label>
              <Textarea
                id="description"
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Include agenda details, location or specific links..."
                className="text-sm leading-relaxed"
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/40 pt-4 mt-2 sm:justify-between">
              {selectedEvent ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteAlertOpen(true)}
                  disabled={isSaving}
                  size="sm"
                  className="gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              ) : (
                <div /> // Spacer for flex alignment
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEventDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Event'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Event Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-2.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this event? This action cannot be undone and will delete this event card.
            </p>
            {selectedEvent && (
              <div className="mt-3 p-3 rounded-lg border border-red-500/10 bg-red-500/[0.02] flex items-start gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground truncate">{selectedEvent.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {format(parseISO(selectedEvent.startDate), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteAlertOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteEvent}
              disabled={isSaving}
            >
              {isSaving ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
