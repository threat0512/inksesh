import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Inksesh Studio Admin",
  description: "Frontend scaffold"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
