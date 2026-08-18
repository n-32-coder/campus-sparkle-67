import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EventCard } from "@/components/EventCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_CATEGORIES, isUpcoming, type EventRow } from "@/lib/events";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Upcoming Events | EventHub" },
      {
        name: "description",
        content:
          "Browse every upcoming college event. Search by name and filter by technical, cultural, sports, workshop or seminar categories.",
      },
      { property: "og:title", content: "Upcoming Events | EventHub" },
      {
        property: "og:description",
        content: "Search and filter all upcoming campus events on EventHub.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [showPast, setShowPast] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["registration-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("registrations").select("event_id");
      if (error) throw error;
      return (data ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.event_id] = (acc[row.event_id] ?? 0) + 1;
        return acc;
      }, {});
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (!showPast && !isUpcoming(event.event_date)) return false;
      if (category !== "All" && event.category !== category) return false;
      if (!term) return true;
      return (
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.venue.toLowerCase().includes(term) ||
        event.organizer.toLowerCase().includes(term)
      );
    });
  }, [events, search, category, showPast]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <header className="max-w-2xl animate-rise">
          <h1 className="text-4xl font-extrabold md:text-5xl">
            Discover <span className="gradient-text">campus events</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Find the perfect event, check the details and reserve your seat instantly.
          </p>
        </header>

        <div className="surface-panel mt-8 rounded-3xl p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, venues or organizers..."
              className="h-12 rounded-full border-border bg-background/60 pl-11"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["All", ...EVENT_CATEGORIES].map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? "hero" : "outline"}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              size="sm"
              variant={showPast ? "hero" : "ghost"}
              onClick={() => setShowPast((value) => !value)}
            >
              {showPast ? "Showing past events" : "Include past events"}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {isLoading ? "Loading events..." : `${filtered.length} event(s) found`}
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} seats={counts[event.id] ?? 0} />
          ))}
        </div>

        {!isLoading && filtered.length === 0 ? (
          <div className="surface-panel mt-8 rounded-3xl p-12 text-center text-muted-foreground">
            No events match your search. Try another keyword or category.
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
