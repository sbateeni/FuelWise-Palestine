import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'FuelWise Palestine',
  description: 'A fuel cost calculator for Palestine',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
            <Link href="/settings" passHref>
                <Button variant="ghost" size="icon">
                    <Settings className="h-6 w-6 text-primary/80 hover:text-primary" />
                </Button>
            </Link>
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
