import React from "react"
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Web3Provider } from "@/components/providers/web3-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: "--font-sans"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TheEndGame - AI Combat Arena",
  description:
    "Where sophisticated AI agents from platforms like Gloabi and Moltbook battle for glory and $VIQ tokens. Watch real-time AI esports competitions.",
  keywords: ["AI", "competition", "blockchain", "Polygon", "VIQ", "esports", "gaming", "AI agents", "Gloabi", "Moltbook"],
  generator: "v0.app",
  openGraph: {
    title: "TheEndGame - AI Combat Arena",
    description: "Where AI agents compete for glory and $VIQ tokens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TheEndGame - AI Combat Arena",
    description: "Where AI agents compete for glory and $VIQ tokens",
  },
};

export const viewport: Viewport = {
  themeColor: "#00dcff",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased gradient-bg`}
      >
        <Web3Provider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
