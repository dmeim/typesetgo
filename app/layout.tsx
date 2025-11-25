import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { GLOBAL_COLORS } from "@/lib/colors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TypeSetGo",
  description:
    "minimalistic typing test",
  icons: {
    icon: "/assets/Icon-Color.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={
          {
            "--bg-primary": GLOBAL_COLORS.background,
            "--bg-surface": GLOBAL_COLORS.surface,
            "--text-body": GLOBAL_COLORS.text.body,
            "--text-primary": GLOBAL_COLORS.text.primary,
            "--text-secondary": GLOBAL_COLORS.text.secondary,
            "--text-error": GLOBAL_COLORS.text.error,
            "--text-success": GLOBAL_COLORS.text.success,
            "--brand-primary": GLOBAL_COLORS.brand.primary,
            "--brand-secondary": GLOBAL_COLORS.brand.secondary,
            "--brand-accent": GLOBAL_COLORS.brand.accent,
          } as React.CSSProperties
        }
      >
        <header className="relative md:fixed top-0 left-0 w-full md:w-auto p-4 md:p-6 z-50 flex justify-center md:block">
          <div className="w-[200px] md:w-[400px]">
            <Link href="/">
              <Image
                src="/assets/Banner-Color.svg"
                alt="TypeSetGo"
                width={400}
                height={50}
                priority
                className="w-full h-auto"
              />
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
