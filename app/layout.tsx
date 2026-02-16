import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Beehive Recruitment',
  description: 'Official recruitment portal for The Beehive community.',
  icons: {
    icon: '/favicon.ico', // Ensure you have a favicon in your public folder
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* The Providers component makes the session available to the whole app */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}