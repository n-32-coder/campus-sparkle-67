import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, MapPin, Ticket } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, isUpcoming, posterFor, type EventRow } from "@/lib/events";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard | EventHub" },
      {
        name: "description",
        content: "See the events you registered for, your profile details and your notifications.",
      },
      { property: "og:title", content: "My Dashboard | EventHub" },
      {
        property: "og:description",
        content: "Your registered college events and notifications in one place.",
      },
    ],
  }),
  component: Dashboard,
});

type RegistrationWithEvent = { id: string; created_at: string; events: EventRow | null };

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, created_at, events(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RegistrationWithEvent[];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled.");
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    },
  });

  const upcoming = registrations.filter((row) => row.events && isUpcoming(row.events.event_date));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <header className="animate-rise">
          <h1 className="text-3xl font-extrabold md:text-4xl">
            Hi, {profile?.full_name || user?.email?.split("@")[0] || "there"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.department ? `${profile.department} · ` : ""}
            {profile?.year_of_study ? `Year ${profile.year_of_study} · ` : ""}
            {user?.email}
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Registered events" value={registrations.length} icon={<Ticket />} />
          <StatCard label="Upcoming" value={upcoming.length} icon={<CalendarDays />} />
          <StatCard
            label="Unread notifications"
            value={notifications.filter((item) => !item.is_read).length}
            icon={<Bell />}
          />
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">My registrations</h2>
          <div className="mt-5 space-y-4">
            {registrations.length === 0 ? (
              <div className="surface-panel rounded-3xl p-10 text-center text-muted-foreground">
                You haven't registered for any events yet.{" "}
                <Link to="/events" className="text-primary underline-offset-4 hover:underline">
                  Browse events
                </Link>
              </div>
            ) : (
              registrations.map((row) =>
                row.events ? (
                  <div
                    key={row.id}
                    className="surface-panel flex flex-col gap-4 overflow-hidden rounded-3xl p-4 sm:flex-row sm:items-center"
                  >
                    <img
                      src={posterFor(row.events)}
                      alt={`${row.events.title} poster`}
                      loading="lazy"
                      width={1200}
                      height={800}
                      className="h-28 w-full rounded-2xl object-cover sm:w-44"
                    />
                    <div className="flex-1">
                      <Badge className="rounded-full border-0 bg-secondary text-secondary-foreground">
                        {row.events.category}
                      </Badge>
                      <h3 className="mt-2 font-display text-lg font-bold">{row.events.title}</h3>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-4 text-accent" />
                          {formatEventDate(row.events.event_date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4 text-accent" />
                          {row.events.venue}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/events/$eventId" params={{ eventId: row.events.id }}>
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancel.mutate(row.id)}
                        disabled={cancel.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null,
              )
            )}
          </div>
        </section>

        <section className="mt-12" id="notifications">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Notifications</h2>
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            {notifications.length === 0 ? (
              <div className="surface-panel rounded-3xl p-10 text-center text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="surface-panel flex gap-4 rounded-2xl p-4 data-[unread=true]:border-primary/60"
                  data-unread={!item.is_read}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                    <Bell className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
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
