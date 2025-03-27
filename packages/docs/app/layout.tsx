import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata: Metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
  title: {
    template: '%s - tsargp',
    default: 'tsargp', // a default is required when creating a template
  },
  appLinks: {
    web: {
      url: 'https://github.com/dsogari/tsargp',
      should_fallback: true,
    },
  },
};

const banner = <Banner storageKey="some-key">Nextra 4.0 is released 🎉</Banner>;
const navbar = (
  <Navbar
    logo={<b>tsargp</b>}
    projectLink="https://github.com/dsogari/tsargp"
    // ... Your additional navbar options
  />
);
const footer = (
  <Footer>
    MIT {new Date().getFullYear()} ©{' '}
    <a href="https://github.com/dsogari" target="_blank">
      Diego Sogari
    </a>
    .
  </Footer>
);

/** @ignore */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        <link rel="icon" href="/api/assets/favicon.svg" type="image/svg+xml" />
        {/* ... Your additional head tags */}
      </Head>
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/dsogari/tsargp/tree/main/packages/docs"
          footer={footer}
          // ... Your additional layout options
        >
          {children}
        </Layout>
      </body>
      <GoogleAnalytics gaId="G-W0635HEKLH" />
    </html>
  );
}
