export const EVENT_CATEGORIES = [
  "Technical",
  "Cultural",
  "Sports",
  "Workshop",
  "Seminar",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type EventRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  poster_url: string | null;
  venue: string;
  event_date: string;
  capacity: number;
  organizer: string;
  created_at: string;
};

export const FALLBACK_POSTER = "/images/event-tech.jpg";

export function posterFor(event: Pick<EventRow, "poster_url" | "category">) {
  if (event.poster_url) return event.poster_url;
  switch (event.category) {
    case "Cultural":
      return "/images/event-cultural.jpg";
    case "Sports":
      return "/images/event-sports.jpg";
    case "Workshop":
    case "Seminar":
      return "/images/event-workshop.jpg";
    default:
      return FALLBACK_POSTER;
  }
}

export function formatEventDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function isUpcoming(value: string) {
  return new Date(value).getTime() >= Date.now();
}
