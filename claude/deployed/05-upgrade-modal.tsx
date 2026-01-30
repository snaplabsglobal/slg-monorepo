// components/upgrade/upgrade-modal.tsx
'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createUpgradeRequest } from '@/lib/permissions/permissions'
import { CheckCircle2, Zap, TrendingUp, Users, ArrowRight, X } from 'lucide-react'

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
      // Create upgrade request
      await createUpgradeRequest({
        userId: user.id,
        toTier: 'pro_jss',
        appCode,
        referralSource,
        userDataSnapshot: userData,
      })

      // Redirect to payment page (Stripe/etc)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleGoBack}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Left side: Hero */}
          <div className="bg-gradient-to-br from-[#FF9500] to-[#E68600] p-8 md:p-12 text-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
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
                  <TrendingUp className="w-6 h-6 flex-shrink-0 mt-1" />
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
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
                  <CheckCircle2 className="w-4 h-4 mr-1" />
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
                  icon={<Zap className="w-5 h-5" />}
                  title="Instant Activation"
                  description="Start using all features immediately after upgrade"
                />
                <BenefitCard
                  icon={<Users className="w-5 h-5" />}
                  title="Unlimited Team Members"
                  description="Add as many users as you need"
                />
                <BenefitCard
                  icon={<TrendingUp className="w-5 h-5" />}
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
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>

              <Button
                onClick={handleGoBack}
                variant="ghost"
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
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FF9500]/10 flex items-center justify-center text-[#FF9500]">
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
