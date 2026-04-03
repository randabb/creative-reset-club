import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "500", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-jakarta",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Primer",
  description: "Your daily practice for creative thinking, in the age of AI.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${dmMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
