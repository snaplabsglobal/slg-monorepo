import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

/**
 * POST /api/seos/intervention/close - Close an intervention
 */

const LOGS_PATH = path.resolve(process.cwd(), '../../packages/seos/logs/manual-interventions.jsonl')

function ensureLogFile(): void {
  const dir = path.dirname(LOGS_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function appendEvent(event: object): void {
  ensureLogFile()
  fs.appendFileSync(LOGS_PATH, JSON.stringify(event) + '\n', 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id || !body.note) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: id, note',
      }, { status: 400 })
    }

    const closeEvent = {
      event: 'close',
      id: body.id,
      ts: new Date().toISOString(),
      linked_pr: body.linked_pr || null,
      note: body.note,
    }

    appendEvent(closeEvent)

    return NextResponse.json({
      success: true,
      event: closeEvent,
      message: 'Intervention closed successfully.',
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 })
  }
}
