#!/usr/bin/env node
/**
 * Phase 11 Load Test — EduPlatform Backend Performance Baseline
 *
 * Tests three critical endpoints with 50 concurrent "virtual users":
 *   1. GET /api/v1/reports/global-finance   (N+1 analytics — before fix: 36+ DB queries)
 *   2. GET /api/v1/schedule/week            (Redis-cached — should be fast)
 *   3. GET /api/v1/reports/at-risk          (CRITICAL N+1 — before fix: O(students×2) queries)
 *
 * Usage:
 *   node apps/backend/scripts/load-test.mjs [BASE_URL] [TOKEN]
 *   node apps/backend/scripts/load-test.mjs http://localhost:3001 eyJhbGci...
 *
 * If TOKEN is omitted, the script will login first using TEST_EMAIL / TEST_PASSWORD env vars.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const BASE  = process.argv[2] ?? 'http://localhost:3001';
const TOKEN = process.argv[3] ?? '';

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'director@school1.uz';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Test1234!';

// ── HTTP helper ────────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Stats tracker ──────────────────────────────────────────────────────────────

class Stats {
  constructor(name) {
    this.name     = name;
    this.times    = [];
    this.errors   = 0;
    this.statuses = {};
  }

  record(ms, status) {
    this.times.push(ms);
    this.statuses[status] = (this.statuses[status] ?? 0) + 1;
    if (status >= 400) this.errors++;
  }

  report() {
    const t = [...this.times].sort((a, b) => a - b);
    const n = t.length;
    if (n === 0) return `  ${this.name}: no data`;
    const avg  = Math.round(t.reduce((s, v) => s + v, 0) / n);
    const p50  = t[Math.floor(n * 0.5)];
    const p95  = t[Math.floor(n * 0.95)];
    const p99  = t[Math.floor(n * 0.99)];
    const min  = t[0];
    const max  = t[n - 1];
    const rps  = Math.round(n / (max / 1000));

    const statusStr = Object.entries(this.statuses)
      .map(([k, v]) => `${k}×${v}`).join(' ');

    const flag = max > 2000 ? ' ⚠️ SLOW' : max > 500 ? ' 🟡' : ' ✅';
    return [
      `  ── ${this.name}${flag}`,
      `     requests : ${n}   errors: ${this.errors}   statuses: ${statusStr}`,
      `     avg: ${avg}ms   min: ${min}ms   p50: ${p50}ms   p95: ${p95}ms   p99: ${p99}ms   max: ${max}ms`,
    ].join('\n');
  }
}

// ── Concurrency runner ─────────────────────────────────────────────────────────

async function hammer(label, fn, { concurrency = 20, total = 100 } = {}) {
  const stats = new Stats(label);
  let  sent   = 0;

  async function worker() {
    while (sent < total) {
      sent++;
      const t0 = Date.now();
      try {
        const res = await fn();
        stats.record(Date.now() - t0, res.status);
      } catch (e) {
        stats.record(Date.now() - t0, 0);
        stats.errors++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);
  return stats;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  EduPlatform Phase 11 — Load Test');
  console.log(`  Base: ${BASE}   Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── 0. Get auth token ──────────────────────────────────────────────────────
  let token = TOKEN;
  if (!token) {
    process.stdout.write('Logging in... ');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: TEST_EMAIL, password: TEST_PASSWORD,
    });
    token = loginRes.body?.data?.tokens?.accessToken;
    if (!token) {
      console.error(`\nLogin failed (${loginRes.status}):`, JSON.stringify(loginRes.body));
      process.exit(1);
    }
    console.log(`OK (${loginRes.status})`);
  }

  // ── 1. Warm-up: single requests to each endpoint ──────────────────────────
  console.log('\n[1] Warm-up — single request per endpoint:');
  const endpoints = [
    ['/api/v1/reports/analytics/finance',           'analytics/finance'],
    ['/api/v1/schedule/week',                        'schedule/week'],
    ['/api/v1/reports/analytics/at-risk',            'analytics/at-risk'],
    ['/api/v1/reports/analytics/pulse',              'analytics/pulse'],
    ['/api/v1/reports/analytics/branch-comparison',  'branch-comparison'],
    ['/api/v1/reports/analytics/alerts',             'smart-alerts'],
  ];

  for (const [path, label] of endpoints) {
    const t0  = Date.now();
    const res = await request('GET', path, null, token);
    const ms  = Date.now() - t0;
    const flag = ms > 1000 ? '⚠️ ' : ms > 300 ? '🟡 ' : '✅ ';
    console.log(`  ${flag}${label}: ${ms}ms (HTTP ${res.status})`);
  }

  // ── 2. Load test — 50 concurrent users, 200 requests each endpoint ────────
  // NOTE: Global throttler is 100 req/min per IP.
  // Keep TOTAL < 80 per endpoint to avoid 429s (each endpoint has an independent counter).
  // Run endpoints sequentially so each gets a fresh 60s window.
  const CONCURRENCY = 30;
  const TOTAL       = 80;

  console.log(`\n[2] Load test — ${CONCURRENCY} concurrent users, ${TOTAL} total requests each (sequential per endpoint):\n`);

  const results = [];

  // Run each endpoint sequentially to avoid cross-contaminating the throttle budget
  for (const [path, label] of [
    ['/api/v1/reports/analytics/finance',          'GET analytics/finance (was 36 queries)'],
    ['/api/v1/reports/analytics/at-risk',          'GET analytics/at-risk (was O(N×2) queries)'],
    ['/api/v1/reports/analytics/branch-comparison','GET branch-comparison  (was N×5 queries)'],
    ['/api/v1/reports/analytics/alerts',           'GET smart-alerts       (was N×2 serial)'],
    ['/api/v1/reports/analytics/pulse',            'GET school-pulse       (reference: $tx)'],
    ['/api/v1/schedule/week',                      'GET schedule/week      (reference: Redis)'],
  ]) {
    const s = await hammer(label, () => request('GET', path, null, token), { concurrency: CONCURRENCY, total: TOTAL });
    results.push(s);
    // Brief pause so throttle window doesn't bleed across endpoints
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('Results:\n');
  for (const s of results) {
    console.log(s.report());
    console.log();
  }

  // ── 3. Event-loop block check: rapid GET /schedule/week (Redis-cached) ───
  // Redis cache means no DB round-trip — any stall indicates event-loop block.
  console.log('[3] Event-loop stall check — 80 rapid requests to Redis-cached endpoint:');
  const pulseStats = await hammer(
    'schedule/week stall check',
    () => request('GET', '/api/v1/schedule/week', null, token),
    { concurrency: 10, total: 80 },
  );
  const stallTimes = [...pulseStats.times].sort((a,b)=>a-b);
  const p99 = stallTimes[Math.floor(stallTimes.length * 0.99)] ?? stallTimes[stallTimes.length - 1] ?? 0;
  console.log(`  p99: ${p99}ms → ${p99 < 500 ? '✅ Event loop NOT blocked' : '⚠️ POTENTIAL BLOCK DETECTED'}`);

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PERFORMANCE VERDICT');
  console.log('═══════════════════════════════════════════════════════════');
  for (const s of results) {
    const times = [...s.times].sort((a,b)=>a-b);
    const p95   = times[Math.floor(times.length * 0.95)];
    const grade = p95 < 100 ? 'A (excellent)' : p95 < 300 ? 'B (good)' : p95 < 800 ? 'C (acceptable)' : p95 < 2000 ? 'D (slow)' : 'F (unacceptable)';
    console.log(`  ${s.name.padEnd(36)} p95=${String(p95).padStart(5)}ms  → ${grade}`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
