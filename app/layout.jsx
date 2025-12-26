"use client";

import { AppProvider } from "../src/components/AppProvider";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
