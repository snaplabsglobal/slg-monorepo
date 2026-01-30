// components/upgrade/upgrade-modal.tsx
'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Button } from '@slo/snap-auth/components/client'
import { createUpgradeRequest } from '@/lib/permissions/permissions'

interface UpgradeModalProps {
  user: User
  subscription: any
  appCode: string
  userData: Record<string, any>
  originalPath?: string
  referralSource: string
}

export function UpgradeModal({
  user,
  subscription,
  appCode,
  userData,
  originalPath,
  referralSource,
}: UpgradeModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toTier: 'pro_jss',
          appCode,
          referralSource,
          userDataSnapshot: userData,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Request failed')
      }
      router.push(`/checkout?tier=pro_jss&app=${appCode}`)
    } catch (error) {
      console.error('Failed to create upgrade request:', error)
      alert('Failed to process upgrade request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push('/dashboard')
  }

  // Get app-specific messaging
  const appInfo = getAppInfo(appCode, userData)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={handleGoBack}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2">
          {/* Left side: Hero */}
          <div className="bg-gradient-to-br from-[#FF9500] to-[#E68600] p-8 md:p-12 text-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{appInfo.name}</h2>
                <p className="text-white/80 text-sm">Professional Edition</p>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {appInfo.headline}
            </h1>

            <p className="text-white/90 text-lg mb-8">
              {appInfo.subheadline}
            </p>

            {/* Data hook */}
            {appInfo.dataHook && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8 border border-white/20">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <div>
                    <h3 className="font-semibold mb-2">Your Data is Ready</h3>
                    <p className="text-white/90">{appInfo.dataHook}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="space-y-3">
              {appInfo.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-bold">${appInfo.price}</span>
                <span className="text-white/80">/{appInfo.billingPeriod}</span>
              </div>
              <p className="text-white/80 text-sm mt-2">
                Billed {appInfo.billingPeriod}ly • Cancel anytime
              </p>
            </div>
          </div>

          {/* Right side: CTA */}
          <div className="p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Currently on {subscription?.subscription_tier || 'Free'} plan
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Upgrade to unlock full access
                </h3>
                <p className="text-gray-600">
                  Get instant access to all features and start managing your projects like a pro.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <BenefitCard
                  icon="⚡"
                  title="Instant Activation"
                  description="Start using all features immediately after upgrade"
                />
                <BenefitCard
                  icon="👥"
                  title="Unlimited Team Members"
                  description="Add as many users as you need"
                />
                <BenefitCard
                  icon="📈"
                  title="Advanced Analytics"
                  description="Get insights into your project performance"
                />
              </div>

              {/* Social proof */}
              <div className="bg-gray-50 rounded-xl p-4 mb-8">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">2,500+</span> construction companies
                  trust JobSite Snap to manage their projects
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-3">
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full h-14 text-lg font-semibold bg-[#FF9500] hover:bg-[#E68600] text-white transition-all hover:scale-105"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    Upgrade to Pro
                    <svg className="ml-2 w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </Button>

              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full"
              >
                Maybe later
              </Button>

              <p className="text-xs text-center text-gray-500">
                30-day money-back guarantee • No credit card required for trial
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FF9500]/10 flex items-center justify-center text-[#FF9500] text-xl">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Helper function to get app-specific messaging
function getAppInfo(appCode: string, userData: Record<string, any>) {
  switch (appCode) {
    case 'jobsite-snap':
      return {
        name: 'JobSite Snap',
        headline: 'Unlock Multi-Project Management',
        subheadline: 'Track time, manage teams, and oversee multiple construction sites from one powerful dashboard.',
        dataHook: userData.ls_receipts
          ? `We found ${userData.ls_receipts} receipts in your LedgerSnap account. Upgrade now to link them to specific projects!`
          : 'Seamlessly integrate with your existing LedgerSnap data',
        features: [
          'Unlimited projects and job sites',
          'Advanced time tracking with GPS verification',
          'Team management and permissions',
          'Real-time project dashboards',
          'Automated payroll calculations',
          'Integration with LedgerSnap for expenses',
        ],
        price: 49,
        billingPeriod: 'month',
      }
    
    case 'ledgersnap':
      return {
        name: 'LedgerSnap',
        headline: 'Professional Expense Management',
        subheadline: 'Automate your receipt processing with AI-powered OCR and smart categorization.',
        dataHook: null,
        features: [
          'Unlimited receipt scanning',
          'AI-powered data extraction',
          'Smart vendor categorization',
          'Multi-currency support',
          'Team collaboration tools',
          'Advanced reporting and analytics',
        ],
        price: 29,
        billingPeriod: 'month',
      }
    
    default:
      return {
        name: 'SnapLabs App',
        headline: 'Upgrade to Pro',
        subheadline: 'Unlock all professional features',
        dataHook: null,
        features: ['All features included'],
        price: 39,
        billingPeriod: 'month',
      }
  }
}
