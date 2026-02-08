import React from 'react'
import RescueWizardLayout from '@/components/rescue/RescueWizardLayout'

export default function RescueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RescueWizardLayout>{children}</RescueWizardLayout>
}
