import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

// Pages loads ESM, while this repository's package.json uses CommonJS.
const source = await readFile(new URL('../../functions/api/blind-box.js', import.meta.url), 'utf8')
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const migration = await readFile(new URL('../0001_blind_box.sql', import.meta.url), 'utf8')
const origin = 'https://example.pages.dev'
const session = '12345678-1234-4234-9234-123456789abc'
const valid = { session, stall: 0, choice: 'open' }
const empty = { stats: [0, 1, 2].map(stall => ({ stall, opened: 0, skipped: 0 })) }

function database() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(migration)
  sqlite.exec(migration) // Safe to reapply.
  return {
    sqlite,
    prepare(sql) {
      let args = []
      return {
        bind(...values) { args = values; return this },
        async all() {
          return { success: true, results: sqlite.prepare(sql).all(...args) }
        }
      }
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        const results = []
        for (const statement of statements) results.push(await statement.all())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    }
  }
}

function request(db, body, options = {}) {
  const method = options.method ?? (body === undefined ? 'GET' : 'POST')
  const headers = options.headers ?? { origin, 'content-type': 'application/json' }
  return onRequest({
    request: new Request(`${origin}/api/blind-box`, {
      method, headers,
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) })
    }),
    env: { BLIND_BOX_DB: db }
  })
}

test('empty aggregates, all stalls, idempotency, and first-choice-wins', async t => {
  const db = database()
  t.after(() => db.sqlite.close())
  assert.deepEqual(await (await request(db)).json(), empty)
  let response = await request(db, valid)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  await request(db, valid)
  await request(db, { ...valid, choice: 'skip' })
  await request(db, { ...valid, session: session.toUpperCase() })
  await request(db, { ...valid, stall: 1, choice: 'skip' })
  response = await request(db, { ...valid, stall: 2 })
  assert.deepEqual(await response.json(), { stats: [
    { stall: 0, opened: 1, skipped: 0 },
    { stall: 1, opened: 0, skipped: 1 },
    { stall: 2, opened: 1, skipped: 0 }
  ] })
  await request(db, { ...valid, session: '22345678-1234-4234-9234-123456789abc' })
  assert.equal((await (await request(db)).json()).stats[0].opened, 2)
})

test('POST rejects missing, null, cross-origin and lookalike origins', async () => {
  for (const value of [undefined, 'null', 'https://evil.test', `${origin}.evil.test`, `${origin}/`]) {
    const headers = { 'content-type': 'application/json' }
    if (value !== undefined) headers.origin = value
    assert.equal((await request(undefined, valid, { headers })).status, 403)
  }
})

test('strict JSON schema and media type', async () => {
  for (const body of [null, [], 'null', '{', {}, { ...valid, session: 'bad' },
    { ...valid, stall: -1 }, { ...valid, stall: 3 }, { ...valid, stall: 0.5 },
    { ...valid, stall: '0' }, { ...valid, choice: 'opened' }, { ...valid, ip: 'unwanted' }]) {
    assert.equal((await request(undefined, body)).status, 400)
  }
  assert.equal((await request(undefined, valid, { headers: { origin } })).status, 415)
})

test('bounded body uses both advertised length and streamed bytes', async () => {
  assert.equal((await request(undefined, valid, {
    headers: { origin, 'content-type': 'application/json', 'content-length': '1025' }
  })).status, 413)
  assert.equal((await request(undefined, ' '.repeat(1025))).status, 413)
  assert.equal((await request(undefined, ' '.repeat(1024))).status, 400)
  assert.equal((await request(undefined, '界'.repeat(400))).status, 413)
})

test('streamed body is cancelled once the byte limit is reached', async () => {
  let cancelled = false
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(600).fill(32)) },
    cancel() { cancelled = true }
  })
  const response = await onRequest({
    request: new Request(`${origin}/api/blind-box`, {
      method: 'POST', headers: { origin, 'content-type': 'application/json' },
      body, duplex: 'half'
    }),
    env: {}
  })
  assert.equal(response.status, 413)
  assert.equal(cancelled, true)
})

test('missing binding and failed D1 return generic 503 for GET and valid POST', async () => {
  for (const db of [undefined, { prepare() { throw new Error('secret database detail') } }]) {
    for (const body of [undefined, valid]) {
      const response = await request(db, body)
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'Stats temporarily unavailable' })
    }
  }
})

test('unsupported methods have no CORS permission', async () => {
  for (const method of ['PUT', 'DELETE', 'OPTIONS', 'HEAD']) {
    const response = await request(undefined, undefined, { method })
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET, POST')
    assert.equal(response.headers.get('access-control-allow-origin'), null)
  }
})

test('schema enforces uniqueness and enums and provides covering index', t => {
  const db = database()
  t.after(() => db.sqlite.close())
  const insert = db.sqlite.prepare('INSERT INTO blind_box_choices VALUES (?, ?, ?)')
  insert.run(session, 0, 'open')
  assert.throws(() => insert.run(session, 0, 'skip'))
  assert.throws(() => insert.run(session, 3, 'open'))
  assert.throws(() => insert.run(session, 1, 'invalid'))
  const plan = db.sqlite.prepare('EXPLAIN QUERY PLAN SELECT stall, choice, COUNT(*) FROM blind_box_choices GROUP BY stall, choice').all()
  assert.ok(plan.some(row => row.detail.includes('blind_box_choices_stall_choice')))
})
