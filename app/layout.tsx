import type { Metadata } from "next";
import "./globals.css";
import "./showcase.css";
import "./arcade-theme.css";
import TrafficTracker from "./traffic-tracker";
import UsageTracker from "./usage-tracker";

export const metadata: Metadata = {
  title: "Game Commons — A starting point for your game",
  description: "Point your AI at Game Commons. Find a suitable game base, meet its creator and adapt useful source into the game you want.",
  metadataBase: new URL('https://game-commons-captain.thabiggdogg420.chatgpt.site'),
  openGraph: {title:'Game Commons — A starting point for your game',description:'Find a starting point for the game you want. Browse original games or let your AI find a suitable source base.',images:[{url:'/projects/art/collection.jpg',alt:'Real game screenshots from the Game Commons collection.'}]},
  twitter: {card:'summary_large_image',images:['/projects/art/collection.jpg']},
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
      <body className="antialiased"><TrafficTracker/><UsageTracker/>{children}<footer className="muted" style={{padding:"16px 24px",fontSize:"0.8rem"}}>Usage: daily totals of page arrivals, play/download actions and saved feedback or remix briefs help us improve. This counter stores no visitor IDs, cookies, IPs, page histories or message contents; totals older than 90 days are pruned on the next recorded activity. Repeat loads and bots can count. Existing anonymous referral-cookie tracking is unchanged.</footer></body>
    </html>
  );
}
