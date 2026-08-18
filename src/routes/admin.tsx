import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Pencil, ShieldCheck, Ticket, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_CATEGORIES, formatEventDate, isUpcoming, type EventRow } from "@/lib/events";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | EventHub" },
      {
        name: "description",
        content:
          "Create, edit and delete college events, manage students and registrations, and review platform statistics.",
      },
      { property: "og:title", content: "Admin Dashboard | EventHub" },
      {
        property: "og:description",
        content: "Manage events, students and registrations on EventHub.",
      },
    ],
  }),
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  year_of_study: string | null;
  created_at: string;
};

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: events = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["admin-registrations"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, created_at, user_id, events(title, event_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        created_at: string;
        user_id: string;
        events: { title: string; event_date: string } | null;
      }>;
    },
  });

  const saveEvent = useMutation({
    mutationFn: async (payload: Partial<EventRow>) => {
      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("events")
          .insert({ ...payload, created_by: user!.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Event updated." : "Event created.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["featured-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRegistration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration removed.");
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const studentById = new Map(students.map((student) => [student.id, student]));

  if (!loading && user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-32 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">Admins only</h1>
          <p className="mt-3 text-muted-foreground">
            This dashboard is restricted to EventHub administrators.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveEvent.mutate({
      title: String(form.get("title")),
      description: String(form.get("description")),
      category: String(form.get("category")),
      venue: String(form.get("venue")),
      organizer: String(form.get("organizer")),
      poster_url: String(form.get("poster_url")) || null,
      capacity: Number(form.get("capacity")),
      event_date: new Date(String(form.get("event_date"))).toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <header className="flex flex-wrap items-end justify-between gap-4 animate-rise">
          <div>
            <h1 className="text-3xl font-extrabold md:text-4xl">Admin dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Manage events, students and registrations across campus.
            </p>
          </div>
          <Button
            variant="hero"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <CalendarPlus className="size-4" /> New event
          </Button>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total events" value={events.length} icon={<CalendarPlus />} />
          <Stat
            label="Upcoming events"
            value={events.filter((event) => isUpcoming(event.event_date)).length}
            icon={<Ticket />}
          />
          <Stat label="Students" value={students.length} icon={<Users />} />
          <Stat label="Participants" value={registrations.length} icon={<ShieldCheck />} />
        </div>

        <Tabs defaultValue="events" className="mt-12">
          <TabsList className="rounded-full bg-secondary p-1">
            <TabsTrigger value="events" className="rounded-full">
              Events
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-full">
              Students
            </TabsTrigger>
            <TabsTrigger value="registrations" className="rounded-full">
              Registrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="surface-panel flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <div className="min-w-52 flex-1">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDate(event.event_date)} · {event.venue}
                  </p>
                </div>
                <Badge className="rounded-full border-0 bg-secondary text-secondary-foreground">
                  {event.category}
                </Badge>
                <span className="text-sm text-muted-foreground">{event.capacity} seats</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(event);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${event.title}"?`)) deleteEvent.mutate(event.id);
                    }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="students" className="mt-6 space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="surface-panel flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                  {(student.full_name || student.email).slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-52 flex-1">
                  <p className="font-semibold">{student.full_name || "Unnamed student"}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {student.department || "—"} · Year {student.year_of_study || "—"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {registrations.filter((row) => row.user_id === student.id).length} registrations
                </span>
              </div>
            ))}
            {students.length === 0 ? (
              <p className="surface-panel rounded-2xl p-8 text-center text-muted-foreground">
                No students yet.
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="registrations" className="mt-6 space-y-3">
            {registrations.map((row) => (
              <div
                key={row.id}
                className="surface-panel flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <div className="min-w-52 flex-1">
                  <p className="font-semibold">{row.events?.title ?? "Deleted event"}</p>
                  <p className="text-sm text-muted-foreground">
                    {studentById.get(row.user_id)?.full_name ??
                      studentById.get(row.user_id)?.email ??
                      "Student"}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  Registered {new Date(row.created_at).toLocaleDateString()}
                </span>
                <Button size="sm" variant="ghost" onClick={() => removeRegistration.mutate(row.id)}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
            ))}
            {registrations.length === 0 ? (
              <p className="surface-panel rounded-2xl p-8 text-center text-muted-foreground">
                No registrations yet.
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "Create event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Title" name="title" defaultValue={editing?.title} />
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={editing?.description ?? ""}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={editing?.category ?? "Technical"}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {EVENT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <FormField
                label="Capacity"
                name="capacity"
                type="number"
                defaultValue={String(editing?.capacity ?? 100)}
              />
            </div>
            <FormField
              label="Date & time"
              name="event_date"
              type="datetime-local"
              defaultValue={
                editing ? toLocalInput(editing.event_date) : toLocalInput(new Date().toISOString())
              }
            />
            <FormField label="Venue" name="venue" defaultValue={editing?.venue} />
            <FormField
              label="Organizer"
              name="organizer"
              defaultValue={editing?.organizer ?? "EventHub"}
            />
            <FormField
              label="Poster URL"
              name="poster_url"
              required={false}
              defaultValue={editing?.poster_url ?? "/images/event-tech.jpg"}
            />
            <Button type="submit" variant="hero" className="w-full" disabled={saveEvent.isPending}>
              {editing ? "Save changes" : "Create event"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-11 rounded-xl"
      />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="surface-panel flex items-center gap-4 rounded-3xl p-5">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
