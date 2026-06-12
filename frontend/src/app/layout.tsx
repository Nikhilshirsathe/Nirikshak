import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Nirikshak AI — Mule Account Detection",
  description: "Explainable AI for Mule Account Detection and Fraud Prevention",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
