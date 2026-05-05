# ═══════════════════════════════════════════════════════════════════════════════
# EduPlatform — Caddy Reverse Proxy
#
# Standart caddy:alpine imaji ishlatiladi.
# Rate limiting: NestJS ThrottlerModule (backend THROTTLE_TTL/THROTTLE_LIMIT)
#
# ESLATMA: xcaddy bilan custom build qilish kerak bo'lsa:
#   FROM caddy:builder AS builder
#   RUN xcaddy build --with github.com/mholt/caddy-ratelimit --output /usr/bin/caddy
#   FROM caddy:alpine
#   COPY --from=builder /usr/bin/caddy /usr/bin/caddy
# ═══════════════════════════════════════════════════════════════════════════════

FROM caddy:alpine
