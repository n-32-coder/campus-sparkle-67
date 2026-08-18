import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-surface/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Sparkles className="size-3.5 text-primary-foreground" />
          </span>
          <span className="font-display font-semibold text-foreground">EventHub</span>
        </div>
        <p>Campus events, beautifully organised.</p>
        <div className="flex gap-4">
          <Link to="/events" className="transition-colors hover:text-foreground">
            Events
          </Link>
          <Link to="/auth" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
