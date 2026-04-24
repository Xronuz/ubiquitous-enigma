/**
 * SanitizePipe — Global request-body sanitizer.
 *
 * Runs BEFORE class-validator so poisoned strings are cleaned up before
 * they ever reach Prisma / PostgreSQL.
 *
 * Currently strips:
 *   • Null bytes (\x00) — PostgreSQL throws 22021 (invalid UTF-8 byte) on these
 *   • Other C0 control characters except \t \n \r (0x09, 0x0A, 0x0D)
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Known operator-injection keys that NoSQL/Prisma raw-query injections use.
 * If a request body key matches one of these, the entire object is treated as
 * a poison value and replaced with `undefined` (which triggers @IsString() failures).
 */
const OPERATOR_KEYS = new Set(['$gt', '$lt', '$gte', '$lte', '$ne', '$in', '$nin',
                                '$or', '$and', '$not', '$exists', '$regex', '$where',
                                '__proto__', 'constructor', 'prototype']);

function hasOperatorKey(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some(k => OPERATOR_KEYS.has(k));
}

/** Recursively sanitize any plain value */
function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove null bytes and non-printable C0 controls (keep \t \n \r)
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === 'object') {
    // Replace operator-injection objects with undefined so downstream
    // @IsString() / @IsNotEmpty() validators reject them cleanly.
    if (hasOperatorKey(value as Record<string, unknown>)) {
      return undefined;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return sanitize(value);
  }
}
