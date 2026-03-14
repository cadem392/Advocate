import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BertAssistant } from "@/components/bert-assistant";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Advocate | Institutional Claim Strategy Platform",
  description:
    "Advocate ingests a denial letter or EOB, finds billing errors, detects deadlines, maps escalation paths, and drafts every document you need to fight back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
        <BertAssistant />
      </body>
    </html>
  );
}
