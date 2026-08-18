import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatEventDate, posterFor, type EventRow } from "@/lib/events";

export function EventCard({ event, seats }: { event: EventRow; seats?: number }) {
  const remaining = seats === undefined ? undefined : Math.max(event.capacity - seats, 0);

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group surface-panel flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={posterFor(event)}
          alt={`${event.title} poster`}
          loading="lazy"
          width={1200}
          height={800}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <Badge className="absolute left-4 top-4 rounded-full border-0 bg-[image:var(--gradient-primary)] px-3 py-1 text-primary-foreground">
          {event.category}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-lg font-bold leading-snug">{event.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>

        <div className="mt-auto space-y-2 pt-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-accent" />
            {formatEventDate(event.event_date)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            {event.venue}
          </p>
          <p className="flex items-center gap-2">
            <Users className="size-4 text-accent" />
            {remaining === undefined
              ? `${event.capacity} seats`
              : `${remaining} of ${event.capacity} seats left`}
          </p>
        </div>
      </div>
    </Link>
  );
}
