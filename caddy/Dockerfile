# ═══════════════════════════════════════════════════════════════════════════════
# EduPlatform — Custom Caddy image
#
# Nima uchun custom?
#   Standart caddy:latest imaji rate limiting modulini o'z ichiga olmaydi.
#   xcaddy orqali kompilyatsiya qilib qo'shamiz.
#
# Modul: github.com/mholt/caddy-ratelimit
#   → Rate limiting (auth: 30/min, api: 60/min, static: 200/min)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Build (xcaddy orqali modullar bilan) ────────────────────────────
# "caddy:builder" tag — rasmiy xcaddy builder imaji (caddy:2-builder emas!)
FROM caddy:builder AS builder

# Rate limiting modulini qo'shib Caddy ni qayta kompilyatsiya qilish
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

# ─── Stage 2: Final image ─────────────────────────────────────────────────────
FROM caddy:alpine

# Custom binary ni rasmiy imaj ustiga ko'chirish
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
