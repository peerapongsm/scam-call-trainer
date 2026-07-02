import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AocBanner } from "@/components/AocBanner";

export const metadata: Metadata = {
  title: "สายโจรจำลอง — ซ้อมรับสายแก๊งคอลเซ็นเตอร์",
  description:
    "AI สวมบทมิจฉาชีพโทรหาคุณ ฝึกจับพิรุธและวางสายให้ทัน อ้างอิงสถิติและกลโกงจากแหล่งทางการ (AOC 1441 / ตำรวจไซเบอร์)",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <AocBanner />
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="3f09453d-0b39-443e-8845-5e65611cc58a"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
