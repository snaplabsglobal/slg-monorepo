import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * SEOS Intervention API
 *
 * POST /api/seos/intervention - Create intervention
 * GET /api/seos/intervention - Get stats
 */

// Types (inline to avoid build issues with workspace packages)
type InterventionSeverity = 'P0' | 'P1' | 'P2'
type InterventionType = 'ENV' | 'TOKEN' | 'MERGE' | 'MANUAL_FIX' | 'TEST_REPORT' | 'LOG_CHECK' | 'BROWSER_FIX' | 'UNDECLARED' | 'OTHER'
type RootCauseGuess = 'ENV_MISMATCH' | 'MISSING_GUARD' | 'PROVIDER_DOWN' | 'AUTH_CONFIG' | 'NO_RUNTIME_TRUTH' | 'NO_TEST_AUTOMATION' | 'PROCESS_GAP' | 'UNKNOWN'
type FollowupAction = 'ADD_DIAGNOSE' | 'ADD_RUNTIME_TRUTH' | 'ADD_CI_GATE' | 'ADD_GUARD' | 'ADD_TEST'

interface Intervention {
  id: string
  ts: string
  app: string
  env: string
  severity: InterventionSeverity
  type: InterventionType
  reason: string
  root_cause_guess: RootCauseGuess
  followup_required: FollowupAction[]
  status: 'open' | 'closed'
  linked_pr: string | null
  linked_issue: string | null
}

// Path to JSONL file (relative to monorepo root)
const LOGS_PATH = path.resolve(process.cwd(), '../../packages/seos/logs/manual-interventions.jsonl')

function generateId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toISOString().slice(11, 19).replace(/:/g, '')
  const rand = crypto.randomBytes(2).toString('hex')
  return `mi_${date}_${time}_${rand}`
}

function ensureLogFile(): void {
  const dir = path.dirname(LOGS_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(LOGS_PATH)) {
    fs.writeFileSync(LOGS_PATH, '', 'utf-8')
  }
}

function appendEvent(event: object): void {
  ensureLogFile()
  fs.appendFileSync(LOGS_PATH, JSON.stringify(event) + '\n', 'utf-8')
}

function readAllEvents(): object[] {
  ensureLogFile()
  const content = fs.readFileSync(LOGS_PATH, 'utf-8')
  return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
}

/**
 * POST - Create intervention
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const intervention: Intervention = {
      id: generateId(),
      ts: new Date().toISOString(),
      app: body.app || 'jss-web',
      env: body.env || process.env.VERCEL_ENV || 'local',
      severity: body.severity || 'P1',
      type: body.type || 'OTHER',
      reason: body.reason || 'No reason provided',
      root_cause_guess: body.root_cause_guess || 'UNKNOWN',
      followup_required: body.followup_required || ['ADD_DIAGNOSE', 'ADD_RUNTIME_TRUTH', 'ADD_CI_GATE'],
      status: 'open',
      linked_pr: body.linked_pr || null,
      linked_issue: body.linked_issue || null,
    }

    appendEvent(intervention)

    return NextResponse.json({
      success: true,
      intervention,
      message: 'Intervention logged. Remember: Convert to Guard + Diagnose + CI.',
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 })
  }
}

/**
 * GET - Get intervention stats
 */
export async function GET() {
  try {
    const events = readAllEvents()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Build intervention state
    const interventions = new Map<string, Intervention & { closed: boolean }>()

    for (const event of events) {
      if ('severity' in event) {
        interventions.set((event as Intervention).id, { ...(event as Intervention), closed: false })
      } else if ((event as { event?: string }).event === 'close') {
        const closeEvent = event as { id: string }
        const intervention = interventions.get(closeEvent.id)
        if (intervention) {
          intervention.closed = true
          intervention.status = 'closed'
        }
      }
    }

    // Filter to 7 days
    const recent = Array.from(interventions.values()).filter(i => {
      const ts = new Date(i.ts)
      return ts >= sevenDaysAgo
    })

    const stats = {
      p0_count_7d: recent.filter(i => i.severity === 'P0').length,
      p1_count_7d: recent.filter(i => i.severity === 'P1').length,
      p2_count_7d: recent.filter(i => i.severity === 'P2').length,
      open_count: Array.from(interventions.values()).filter(i => !i.closed).length,
      total_count: interventions.size,
    }

    // Budget state
    const budgetStatus = stats.p0_count_7d >= 1 ? 'LOCKED' :
                         stats.p1_count_7d > 2 ? 'LOCKED' :
                         stats.p1_count_7d === 2 ? 'WARNING' : 'SAFE'

    const healthStatus = stats.p0_count_7d >= 1 ? 'SELF_SUSPEND' :
                         stats.open_count > 0 ? 'DEGRADED' : 'HEALTHY'

    // Autonomy level (initial = L1)
    let autonomyLevel = 'L1'
    if (healthStatus === 'SELF_SUSPEND') {
      autonomyLevel = 'L0'
    } else if (stats.open_count === 0 && stats.p0_count_7d === 0) {
      autonomyLevel = 'L2'
    }

    return NextResponse.json({
      schema: 'seos.intervention.v1',
      timestamp: now.toISOString(),
      stats,
      budget: {
        p0_used: stats.p0_count_7d,
        p0_limit: 0,
        p1_used: stats.p1_count_7d,
        p1_limit: 2,
        status: budgetStatus,
      },
      health: healthStatus,
      autonomy: {
        level: autonomyLevel,
        gate: autonomyLevel === 'L2' ? 'B' : 'A',
      },
      recent_interventions: Array.from(interventions.values())
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 10),
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 })
  }
}
