import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DalalAI - Indian Stock Market Screener & AI Intelligence',
  description: 'Screen Indian stocks, discover discounted opportunities, monitor bucket lists, and analyze market trends with Gemini AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased selection:bg-market-blue selection:text-white">
        {children}
      </body>
    </html>
  );
}

