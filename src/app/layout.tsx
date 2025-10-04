import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'League Manager',
  description: 'Fixtures, results and standings for amateur sports leagues.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
