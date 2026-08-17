import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/firebase/config";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1.0 },
  { path: "/transparency", priority: 0.9 },
  { path: "/transparency/donations", priority: 0.8 },
  { path: "/transparency/expenses", priority: 0.8 },
  { path: "/transparency/corrections", priority: 0.7 },
  { path: "/verify", priority: 0.8 },
  { path: "/events", priority: 0.8 },
  { path: "/announcements", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/volunteer", priority: 0.5 },
  { path: "/feedback", priority: 0.5 },
  { path: "/contact", priority: 0.6 },
];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  // Admin routes are deliberately absent.
  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
