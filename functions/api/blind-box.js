const MAX_BODY_BYTES = 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TOTALS_SQL = `
  SELECT stall,
    SUM(CASE WHEN choice = 'open' THEN 1 ELSE 0 END) AS opened,
    SUM(CASE WHEN choice = 'skip' THEN 1 ELSE 0 END) AS skipped
  FROM blind_box_choices
  GROUP BY stall
`

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

function totals(result) {
  return {
    stats: [0, 1, 2].map(stall => {
      const row = result.results.find(row => row.stall === stall)
      return { stall, opened: row?.opened ?? 0, skipped: row?.skipped ?? 0 }
    })
  }
}

async function readChoice(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    throw new RangeError('Body too large')
  }
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError('Missing body')
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new RangeError('Body too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    const response = json({ error: 'Method not allowed' }, 405)
    response.headers.set('Allow', 'GET, POST')
    return response
  }

  let choice
  if (request.method === 'POST') {
    // No CORS: browsers must send the exact origin of this deployment.
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return json({ error: 'Same-origin requests required' }, 403)
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return json({ error: 'Expected application/json' }, 415)
    }
    try {
      choice = await readChoice(request)
    } catch (error) {
      if (error instanceof RangeError) return json({ error: 'Body too large' }, 413)
      return json({ error: 'Invalid JSON' }, 400)
    }
    if (!choice || Array.isArray(choice) || typeof choice !== 'object' ||
        Object.keys(choice).some(key => !['session', 'stall', 'choice'].includes(key)) ||
        typeof choice.session !== 'string' || !UUID.test(choice.session) ||
        !Number.isInteger(choice.stall) || choice.stall < 0 || choice.stall > 2 ||
        !['open', 'skip'].includes(choice.choice)) {
      return json({ error: 'Invalid choice' }, 400)
    }
  }

  if (!env?.BLIND_BOX_DB) return json({ error: 'Stats temporarily unavailable' }, 503)
  try {
    const db = env.BLIND_BOX_DB
    if (choice) {
      // First choice wins, including retries with a different choice.
      // D1 batch is transactional: insert and returned totals share a transaction.
      const results = await db.batch([
        db.prepare(`INSERT INTO blind_box_choices (session, stall, choice)
          VALUES (?, ?, ?) ON CONFLICT (session, stall) DO NOTHING`)
          .bind(choice.session.toLowerCase(), choice.stall, choice.choice),
        db.prepare(TOTALS_SQL)
      ])
      if (results.some(result => !result.success)) throw new Error('D1 batch failed')
      return json(totals(results[1]))
    }
    const result = await db.prepare(TOTALS_SQL).all()
    if (!result.success) throw new Error('D1 query failed')
    return json(totals(result))
  } catch {
    // Do not log request bodies, session tokens, or database error details.
    return json({ error: 'Stats temporarily unavailable' }, 503)
  }
}
