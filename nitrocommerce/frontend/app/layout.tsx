import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NitroCommerce — Flash Sale",
  description: "High-concurrency flash sale engine demo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
