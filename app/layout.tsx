import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
//import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "Chat with Raghu",
  description:
    "Chat with Assistant AI",
  openGraph: {
    images: [
      {
        url: "/og?title=AI SDK Python Streaming Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og?title=AI SDK Python Streaming Preview",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head></head>
      <body className={cn(GeistSans.className, "antialiased dark")}>
        <Toaster position="top-center" richColors />
        {/* <Navbar /> */}
        {children}
      </body>
    </html>
  );
}
