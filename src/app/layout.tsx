import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

// every page reads from the database
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'League Manager', template: '%s · League Manager' },
  description: 'Fixtures, results and standings for amateur sports leagues.',
  metadataBase: new URL(siteUrl()),
  openGraph: { siteName: 'League Manager', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
