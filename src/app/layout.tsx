import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/common/Providers";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SafePass — Corporate Password Vault",
    template: "%s | SafePass",
  },
  description: "Zero-knowledge encrypted corporate credential vault with policy governance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        {/*
          Blocking inline script — runs synchronously before React hydrates or
          the browser paints a single pixel. Reads localStorage and applies the
          `dark` class immediately, preventing any flash-of-light-mode (FOUC).
          suppressHydrationWarning on <html> suppresses the expected class mismatch
          between SSR (no class) and client (class applied by this script).
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "border border-border bg-card text-card-foreground shadow-xl",
                title: "text-sm font-medium",
                description: "text-xs text-muted-foreground",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
