import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Hello Again — Never worry about remembering faces.";
const description = "顔を覚えられなくても、もう心配しない。交換済みの友達が近くにいるとスマホが知らせます。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: [
        { url: "/hello-again-app-icon.png", type: "image/png", sizes: "1024x1024" },
      ],
      apple: { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_US",
      alternateLocale: ["ja_JP", "zh_CN", "ko_KR", "es_ES"],
      images: [{ url: "/og-hello-again.png", width: 1536, height: 1024, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-hello-again.png"],
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
