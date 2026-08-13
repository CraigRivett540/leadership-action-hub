export interface NewsItem {
  id: string;
  date: string;
  source: string;
  headline: string;
  subhead: string;
  bullets: string[];
  youtubeId: string;
  watchUrl: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "drphil-grusch-2026-08-13",
    date: "2026-08-13",
    source: "The Dr. Phil Podcast",
    headline: "David Grusch: The Whistleblower Who Told Congress We’re Not Alone",
    subhead:
      "Dr. Phil sits down with former intelligence officer David Grusch on the human cost of testifying that the U.S. has recovered craft of non-human origin.",
    bullets: [
      "Newest Dr. Phil × David Grusch interview — published 13 August 2026",
      "Grusch describes recovered UAP material and non-human biologics reported by program personnel",
      "Focus on courage, retaliation, and the psychology of coming forward under oath",
    ],
    youtubeId: "LBXmqvFs0Ec",
    watchUrl: "https://www.youtube.com/watch?v=LBXmqvFs0Ec",
  },
];

export function latestNews(): NewsItem {
  return NEWS_ITEMS[0]!;
}
