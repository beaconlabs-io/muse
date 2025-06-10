import type { Metadata } from "next";

import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Causal Oracle Interface",
  description: "Interface for interacting with the Causal Oracle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
