/**
 * EduPlatform API Load Test — k6 script
 *
 * Ishlatish:
 *   k6 run --env BASE_URL=https://api.eduplatform.uz scripts/k6-load-test.js
 *
 * Yoki local development:
 *   k6 run --env BASE_URL=http://localhost:3001/api scripts/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm-up
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '2m', target: 20 },   // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
  },
};

// Shared cookie jar for auth
const jar = new http.CookieJar();

function login() {
  const url = `${BASE_URL}/v1/auth/login`;
  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL || 'admin@school.uz',
    password: __ENV.TEST_PASSWORD || 'Admin@123',
  });

  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    jar,
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns tokens': (r) => r.json('tokens.accessToken') !== '',
  });

  sleep(1);
  return res;
}

function healthCheck() {
  const res = http.get(`${BASE_URL}/health`, { jar });
  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health db is up': (r) => r.json('status') === 'ok',
  });
  sleep(0.5);
}

function getClasses() {
  const res = http.get(`${BASE_URL}/v1/classes`, { jar });
  check(res, {
    'classes status is 200': (r) => r.status === 200,
  });
  sleep(1);
}

function getSchedule() {
  const res = http.get(`${BASE_URL}/v1/schedule/today`, { jar });
  check(res, {
    'schedule status is 200': (r) => r.status === 200,
  });
  sleep(1);
}

function getStudents() {
  const res = http.get(`${BASE_URL}/v1/users?role=student&page=1&limit=20`, { jar });
  check(res, {
    'students status is 200': (r) => r.status === 200,
    'students has data': (r) => r.json('data') !== undefined,
  });
  sleep(1);
}

function getNotifications() {
  const res = http.get(`${BASE_URL}/v1/notifications?page=1&limit=20`, { jar });
  check(res, {
    'notifications status is 200': (r) => r.status === 200,
  });
  sleep(0.5);
}

export default function () {
  group('Public endpoints', () => {
    healthCheck();
  });

  group('Auth', () => {
    login();
  });

  group('Authenticated endpoints', () => {
    getClasses();
    getSchedule();
    getStudents();
    getNotifications();
  });
}
