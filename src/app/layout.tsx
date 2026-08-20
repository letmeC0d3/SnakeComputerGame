import type { Metadata } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
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
  metadataBase: new URL("https://snakecomputergame.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Snake Game - Play Classic Snake Online",
    description: "Play classic Snake online instantly. Compete in the daily challenge, beat high scores, and rank on the global leaderboards.",
    url: "https://snakecomputergame.com",
    siteName: "SnakeComputerGame.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snake Game - Play Classic Snake Online",
    description: "Play classic Snake online instantly. Compete in the daily challenge, beat high scores, and rank on the global leaderboards.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-slate-50 font-sans">
        {children}
      </body>
    </html>
  );
}
