import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Mining Empire",
  description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Mining Empire",
    description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
    images: ["/apple-touch-icon.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mining Empire",
    description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
    images: ["/apple-touch-icon.png"],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="w-full h-full m-0 p-0 overflow-hidden select-none">
      <body suppressHydrationWarning className="w-full h-full m-0 p-0 overflow-hidden bg-[#0a0e14] select-none touch-none fixed inset-0">
        {children}
      </body>
    </html>
  );
}
