import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import PageTransition from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A. Izzat Shafran Ashari - Portfolio",
  description: "Graphic Designer & Front-End Developer Portfolio",
  keywords: ["portfolio", "graphic designer", "front-end developer", "UI/UX", "web developer"],
  authors: [{ name: "A. Izzat Shafran Ashari" }],
  openGraph: {
    title: "A. Izzat Shafran Ashari - Portfolio",
    description: "Graphic Designer & Front-End Developer Portfolio",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <PageTransition>
            {children}
          </PageTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
