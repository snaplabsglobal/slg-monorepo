#!/bin/bash
# Emergency Rollback Script for LedgerSnap V2
# Usage: ./scripts/emergency_rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
echo "Disabling R2 Storage Driver... Reverting to Supabase Storage."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI could not be found. Please install it or use the Vercel Dashboard."
    exit 1
fi

# Set Env Var to false
echo "Setting NEXT_PUBLIC_USE_R2=false on Production..."
vercel env add NEXT_PUBLIC_USE_R2 production false --force

# Trigger Deployment
echo "Triggering Redeployment..."
vercel deploy --prod

echo "✅ Rollback Command Sent. Check Vercel Dashboard for status."
