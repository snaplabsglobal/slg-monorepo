import type { Metadata } from 'next';
import './globals.css';
import { ClientOnly } from '@/app/components/global/ClientOnly';
import { ProcessingStatusBar } from '@/app/components/global/ProcessingStatusBar';
import { OfflineIndicator } from '@/app/components/global/OfflineIndicator';
import { PwaRegister } from '@/app/components/global/PwaRegister';

export const metadata: Metadata = {
  title: 'LedgerSnap - 快速拍照识别',
  description: 'Mobile-first receipt management',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'LedgerSnap',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#0b1220',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="bg-[#0b1220]">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="LedgerSnap" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icons/icon-192.png" />
        {/* iOS Splash - 4 mainstream sizes */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/ios-splash-1170-2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ios-splash-1290-2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ios-splash-828-1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ios-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </head>
      <body>
        <ClientOnly>
          <OfflineIndicator />
          <PwaRegister />
        </ClientOnly>
        {children}
        <ClientOnly>
          <ProcessingStatusBar />
        </ClientOnly>
      </body>
    </html>
  );
}
