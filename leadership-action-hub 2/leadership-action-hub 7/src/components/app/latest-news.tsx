import { ExternalLink, Newspaper } from "lucide-react";
import { NEWS_ITEMS, type NewsItem } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        featured && "ring-1 ring-primary/15",
      )}
    >
      <div className="aspect-video w-full bg-hh-navy">
        <iframe
          title={item.headline}
          src={`https://www.youtube.com/embed/${item.youtubeId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Newspaper className="size-3.5 text-primary" />
          <span>{item.source}</span>
          <span aria-hidden>·</span>
          <time dateTime={item.date}>{formatDate(item.date)}</time>
        </div>
        <h3 className="text-base font-bold leading-snug text-hh-navy sm:text-lg">
          {item.headline}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{item.subhead}</p>
        <ul className="space-y-1.5 text-sm text-hh-navy">
          {item.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <a
          href={item.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Watch on YouTube
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </article>
  );
}

export function LatestNewsPanel({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const lead = NEWS_ITEMS[0];
  if (!lead) return null;

  if (compact) {
    return (
      <section className={cn("w-full max-w-xl space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-hh-navy">
            Latest news
          </h2>
        </div>
        <NewsCard item={lead} featured />
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-hh-navy">Latest news</h2>
        <p className="text-sm text-muted-foreground">
          Headlines and the newest interview featured for the team.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {NEWS_ITEMS.map((item, i) => (
          <NewsCard key={item.id} item={item} featured={i === 0} />
        ))}
      </div>
    </div>
  );
}
