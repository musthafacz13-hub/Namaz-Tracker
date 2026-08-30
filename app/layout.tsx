import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Salah Tracker',
  description: 'An ultra-minimalist, distraction-free daily Salah and Namaz tracker featuring monochromatic brutalist aesthetics and manual prayer timing control.',
  openGraph: {
    title: 'Salah Tracker',
    description: 'An ultra-minimalist, distraction-free daily Salah and Namaz tracker featuring monochromatic brutalist aesthetics and manual prayer timing control.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salah Tracker',
    description: 'An ultra-minimalist, distraction-free daily Salah and Namaz tracker featuring monochromatic brutalist aesthetics and manual prayer timing control.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased selection:bg-black selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
