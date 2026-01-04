import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "모여라 - 친구 약속, 1분이면 끝!",
  description: "날짜 투표, 중간 위치, 총무 선정을 한 곳에서. 카카오톡보다 편한 약속 잡기 서비스",
  keywords: ["약속", "모임", "일정", "투표", "중간위치", "총무"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: "모여라 - 친구 약속, 1분이면 끝!",
    description: "날짜 투표 + 중간 위치 + 총무 선정, 한 곳에서!",
    siteName: "모여라",
  },
  twitter: {
    card: "summary_large_image",
    title: "모여라 - 친구 약속, 1분이면 끝!",
    description: "날짜 투표 + 중간 위치 + 총무 선정, 한 곳에서!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
