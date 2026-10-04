import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const interSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prompt Wall — Security Dashboard",
  description:
    "Prompt injection & action security dashboard for the Prompt Wall agent — workflow pipeline, security decisions, live audit log, evaluation metrics, and attack testing.",
  keywords: [
    "Prompt Wall",
    "Prompt Injection",
    "Action Security",
    "Content Firewall",
    "Action Guard",
    "Cybersecurity Dashboard",
  ],
  icons: {
    icon: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${interSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
