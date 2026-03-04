import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CHANGE THIS SECTION
export const metadata: Metadata = {
  title: "DJ Dashboard | TextMyTrack", // This is what shows in the browser tab
  description: "Manage your DJ requests live", // This shows in Google search results/link previews
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-white bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]`}
      >
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[200px] transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-pink-500/10 blur-[200px] transform translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative min-h-[100dvh] min-h-screen">{children}</div>
      </body>
    </html>
  );
}