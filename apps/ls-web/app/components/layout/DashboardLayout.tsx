'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboardIcon,
  ReceiptIcon,
  IncomeIcon,
  FolderIcon,
  BarChart3Icon,
  SettingsIcon,
  UploadIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  UserIcon,
} from './icons';
import { UploadQueueIndicator } from '@/app/components/receipts/UploadQueueIndicator';
import { InstallPrompt } from '@/app/components/pwa/InstallPrompt';
import { useOffline } from '@/app/hooks/useOffline';

// Recycle Bin Icon
const RecycleBinIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface DashboardLayoutProps {
  children: ReactNode;
  userEmail?: string | null;
  userName?: string | null;
}

export function DashboardLayout({ children, userEmail, userName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOffline = useOffline();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
    { name: 'Receipts', href: '/transactions', icon: ReceiptIcon },
    { name: 'Income', href: '/income', icon: IncomeIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Reports', href: '/reports', icon: BarChart3Icon },
    { name: 'Recycle Bin', href: '/transactions/recycle-bin', icon: RecycleBinIcon },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const handleSignOut = async () => {
    try {
      const response = await fetch('/auth/signout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* CTO#1: Offline banner inside dashboard */}
      {isOffline && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm text-center">
          目前处于离线模式，功能受限，数据将在恢复网络后同步
        </div>
      )}
      {/* PWA install prompt (only when not installed; dismiss 7 days) */}
      <InstallPrompt />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <ReceiptIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LedgerSnap</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Button */}
          <div className="p-4">
            <Link
              href="/transactions/upload"
              prefetch={false}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <UploadIcon className="w-5 h-5" />
              Upload Receipt
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-all">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{userName || 'User'}</p>
                <p className="text-sm text-gray-500">{userEmail || ''}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 mt-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-900">LedgerSnap</span>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>

        {/* Offline upload queue status (visible when queue has items) */}
        <UploadQueueIndicator />
      </div>
    </div>
  );
}
