import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import clsx from "clsx";
import { AuthProvider } from "@/components/auth-provider";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keeper",
  description: "Calendar management and synchronization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={clsx(geist.className, "antialiased")}>
        <AuthProvider>
          <div className="isolate min-h-dvh flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
