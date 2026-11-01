import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Mining Empire | 3D Tycoon Game',
  description: 'Build your mining empire in this immersive 3D tycoon game with automated factories and deep-earth exploration.',
  openGraph: {
    title: 'Mining Empire | 3D Tycoon Game',
    description: 'Build your mining empire in this immersive 3D tycoon game with automated factories and deep-earth exploration.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mining Empire | 3D Tycoon Game',
    description: 'Build your mining empire in this immersive 3D tycoon game with automated factories and deep-earth exploration.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
