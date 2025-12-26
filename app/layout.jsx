import { ClientProviders } from "./providers";
import "./globals.css";

export const metadata = {
  title: "MetaAegis - Autonomous Asset Protection",
  description: "ERC-7715 powered autonomous asset protection layer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
