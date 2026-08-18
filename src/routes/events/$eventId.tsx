import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, isUpcoming, posterFor, type EventRow } from "@/lib/events";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details | EventHub" },
      {
        name: "description",
        content: "See the full schedule, venue, seats left and register for this college event.",
      },
      { property: "og:title", content: "Event details | EventHub" },
      {
        property: "og:description",
        content: "Full details and instant registration for this campus event.",
      },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (error) throw error;
      return data as EventRow;
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["event-registrations", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, user_id")
        .eq("event_id", eventId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const myRegistration = registrations.find((row) => row.user_id === user?.id);
  const seatsLeft = event ? Math.max(event.capacity - registrations.length, 0) : 0;

  const register = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Not signed in");
      const { error } = await supabase
        .from("registrations")
        .insert({ event_id: event.id, user_id: user.id });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: `Registered for ${event.title}`,
        message: `You're confirmed for ${event.title} on ${formatEventDate(event.event_date)} at ${event.venue}.`,
      });
    },
    onSuccess: () => {
      toast.success("You're registered! Check your dashboard for details.");
      queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!myRegistration) return;
      const { error } = await supabase.from("registrations").delete().eq("id", myRegistration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled.");
      queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/events">
            <ArrowLeft className="size-4" /> Back to events
          </Link>
        </Button>

        {isLoading || !event ? (
          <div className="surface-panel mt-6 rounded-3xl p-12 text-center text-muted-foreground">
            Loading event...
          </div>
        ) : (
          <article className="mt-6 animate-rise">
            <div className="surface-panel overflow-hidden rounded-4xl">
              <div className="relative aspect-[21/9]">
                <img
                  src={posterFor(event)}
                  alt={`${event.title} poster`}
                  width={1200}
                  height={800}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="rounded-full border-0 bg-[image:var(--gradient-primary)] px-3 py-1 text-primary-foreground">
                    {event.category}
                  </Badge>
                  <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{event.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">By {event.organizer}</p>
                </div>
              </div>

              <div className="grid gap-8 p-6 md:grid-cols-[1.6fr_1fr] md:p-8">
                <div>
                  <h2 className="text-lg font-semibold">About this event</h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                </div>

                <aside className="surface-panel h-fit rounded-3xl p-6">
                  <ul className="space-y-4 text-sm">
                    <li className="flex gap-3">
                      <CalendarDays className="size-5 shrink-0 text-accent" />
                      <span>{formatEventDate(event.event_date)}</span>
                    </li>
                    <li className="flex gap-3">
                      <MapPin className="size-5 shrink-0 text-accent" />
                      <span>{event.venue}</span>
                    </li>
                    <li className="flex gap-3">
                      <Users className="size-5 shrink-0 text-accent" />
                      <span>
                        {registrations.length} registered · {seatsLeft} seats left
                      </span>
                    </li>
                  </ul>

                  <div className="mt-6">
                    {!user ? (
                      <Button
                        variant="hero"
                        className="w-full"
                        onClick={() => navigate({ to: "/auth" })}
                      >
                        Sign in to register
                      </Button>
                    ) : myRegistration ? (
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 rounded-2xl bg-success/15 px-4 py-3 text-sm text-success">
                          <CheckCircle2 className="size-4" /> You're registered
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate()}
                        >
                          Cancel registration
                        </Button>
                      </div>
                    ) : !isUpcoming(event.event_date) ? (
                      <Button variant="outline" className="w-full" disabled>
                        This event has ended
                      </Button>
                    ) : seatsLeft === 0 ? (
                      <Button variant="outline" className="w-full" disabled>
                        Fully booked
                      </Button>
                    ) : (
                      <Button
                        variant="hero"
                        className="w-full"
                        disabled={register.isPending}
                        onClick={() => register.mutate()}
                      >
                        Register now
                      </Button>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
