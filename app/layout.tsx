import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "MATANE — 近くにいる、を思い出す";
const description = "一度だけ交換。次の会場では、交換済みの人が近くにいることをスマホが知らせます。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title,
    description,
    icons: { icon: "/icon.png", apple: "/icon.png" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ja_JP",
      images: [{ url: "/og-matane.png", width: 1731, height: 909, alt: "MATANE — 一度だけ交換。近くにいる、を思い出す。" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-matane.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#101e1b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
