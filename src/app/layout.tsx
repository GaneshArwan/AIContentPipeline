import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIContentPipeline",
  description: "Automated content generation pipeline utilizing Gemini, OpenAI, Anthropic, and Local models.",
  keywords: ["AI Content", "Content Pipeline", "Next.js", "LangChain", "LLM", "Content Generation", "SEO Content"],
  authors: [{ name: "AIContentPipeline Team" }],
  openGraph: {
    title: "AIContentPipeline",
    description: "Multi-Model Content Pipeline",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        <div className="noise-overlay" />
        <div className="mesh-gradient" />
        {children}
        <Toaster position="bottom-right" theme="dark" closeButton richColors />
      </body>
    </html>
  );
}
