import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Inksesh Studio Admin",
  description: "Studio admin dashboard for managing artists, assets, and studio information."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
