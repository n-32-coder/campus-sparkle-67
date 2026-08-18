import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Compass, Sparkles, Ticket, Users } from "lucide-react";

import heroImage from "@/assets/hero.jpg";
import { EventCard } from "@/components/EventCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { EventRow } from "@/lib/events";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventHub — Discover & Book College Events" },
      {
        name: "description",
        content:
          "EventHub is the premium way to discover, register for and manage college events: hackathons, cultural fests, sports and workshops.",
      },
      { property: "og:title", content: "EventHub — Discover & Book College Events" },
      {
        property: "og:description",
        content: "Browse upcoming campus events and reserve your seat in seconds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: events = [] } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [eventCount, regCount] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
      ]);
      return { events: eventCount.count ?? 0, registrations: regCount.count ?? 0 };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="Students at a campus event at night"
            width={1920}
            height={1080}
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div className="hero-glow absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />

          <div className="relative mx-auto max-w-6xl px-4 py-28 md:py-36">
            <div className="max-w-2xl animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Your campus, all in one place
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] md:text-6xl">
                Every great <span className="gradient-text">college event</span> starts here.
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                Discover hackathons, cultural nights, sports finals and workshops. Reserve your seat
                in seconds and never miss a moment on campus.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/events">
                    Explore events <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth">Create free account</Link>
                </Button>
              </div>

              <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
                <Stat label="Events" value={stats?.events ?? 0} />
                <Stat label="Registrations" value={stats?.registrations ?? 0} />
                <Stat label="Categories" value={5} />
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-5 md:grid-cols-3">
            <Feature
              icon={<Compass className="size-5" />}
              title="Discover instantly"
              text="Search and filter by category to find exactly the kind of event you love."
            />
            <Feature
              icon={<Ticket className="size-5" />}
              title="One-tap registration"
              text="Reserve your seat with a single click and track live seat availability."
            />
            <Feature
              icon={<CalendarCheck className="size-5" />}
              title="Stay notified"
              text="Your dashboard keeps every booking and notification neatly in one place."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Featured this month</h2>
              <p className="mt-2 text-muted-foreground">
                Handpicked events happening across campus soon.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/events">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="surface-panel relative overflow-hidden rounded-4xl px-8 py-14 text-center">
            <div className="hero-glow absolute inset-0" />
            <div className="relative">
              <Users className="mx-auto size-8 text-primary" />
              <h2 className="mt-4 text-3xl font-bold">Ready to join the next big event?</h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                Create your free student account and get instant access to every event on campus.
              </p>
              <Button asChild variant="hero" size="lg" className="mt-8">
                <Link to="/auth">Get started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold">{value}+</dd>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="surface-panel rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
