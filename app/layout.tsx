import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Deep Gem Mine 3D',
  description: 'Hyper-speed elevator deep mining simulator with crystal drill, voxel ore deposits, and gem factory.',
  openGraph: {
    title: 'Deep Gem Mine 3D',
    description: 'Hyper-speed elevator deep mining simulator with crystal drill, voxel ore deposits, and gem factory.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deep Gem Mine 3D',
    description: 'Hyper-speed elevator deep mining simulator with crystal drill, voxel ore deposits, and gem factory.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
