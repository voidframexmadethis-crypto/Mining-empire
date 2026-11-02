import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Mining Empire",
  description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
  openGraph: {
    title: "Mining Empire",
    description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mining Empire",
    description: "Ultra-realistic 3D mining empire with massive underground caverns, lush vegetation, and 8500 trillion gems.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
