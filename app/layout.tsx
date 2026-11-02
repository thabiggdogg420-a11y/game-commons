import type { Metadata } from "next";
import "./globals.css";
import "./showcase.css";
import "./arcade-theme.css";
import TrafficTracker from "./traffic-tracker";
import UsageTracker from "./usage-tracker";

export const metadata: Metadata = {
  title: "Games4Free — A starting point for your game",
  description: "Discover games to play or download from their creators. Point your AI at Games4Free to find a source-linked starting point for your next idea.",
  metadataBase: new URL('https://games.free4allhub.com'),
  openGraph: {title:'Games4Free — A starting point for your game',description:'Find a starting point for the game you want. Browse original games or let your AI find a suitable source base.'},
  twitter: {card:'summary'},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><TrafficTracker/><UsageTracker/><nav aria-label="Free4AllHub family" style={{display:"flex",flexWrap:"wrap",gap:"1rem",padding:"0.75rem 1.5rem"}}><a href="https://free4allhub.com">Free4AllHub</a><a href="https://games.free4allhub.com" aria-current="page">Games4Free</a><a href="https://plan.free4allhub.com">Plan4Free</a><a href="https://learn.free4allhub.com">Learn4Free</a></nav>{children}<footer className="muted" style={{padding:"16px 24px",fontSize:"0.8rem"}}>Usage: daily totals of page arrivals, play/download actions and saved feedback or remix briefs help us improve. This counter stores no visitor IDs, cookies, IPs, page histories or message contents; totals older than 90 days are pruned on the next recorded activity. Repeat loads and bots can count. Existing anonymous referral-cookie tracking is unchanged.</footer></body>
    </html>
  );
}
