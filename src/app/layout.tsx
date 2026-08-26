import type { Metadata } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Snake Game - Play Classic Snake Online",
  description: "Play classic Snake online instantly. Compete in the daily challenge, beat high scores, and rank on the global leaderboards. No sign-up required.",
  keywords: ["snake game", "play snake", "snake game online", "classic snake game", "free snake game"],
  metadataBase: new URL("https://www.snakecomputergame.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Snake Game - Play Classic Snake Online",
    description: "Play classic Snake online instantly. Compete in the daily challenge, beat high scores, and rank on the global leaderboards.",
    url: "https://www.snakecomputergame.com",
    siteName: "SnakeComputerGame.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snake Game - Play Classic Snake Online",
    description: "Play classic Snake online instantly. Compete in the daily challenge, beat high scores, and rank on the global leaderboards.",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = "G-28DBNBBZJ9";

  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Google Analytics Tag (gtag.js) rendered statically in head for automated validation crawlers */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-slate-50 font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
