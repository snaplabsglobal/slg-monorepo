import type { Metadata } from 'next';
import './globals.css';
import { ClientOnly } from '@/app/components/global/ClientOnly';
import { ProcessingStatusBar } from '@/app/components/global/ProcessingStatusBar';

export const metadata: Metadata = {
  title: 'LedgerSnap - 快速拍照识别',
  description: 'Mobile-first receipt management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ClientOnly>
          <ProcessingStatusBar />
        </ClientOnly>
      </body>
    </html>
  );
}
