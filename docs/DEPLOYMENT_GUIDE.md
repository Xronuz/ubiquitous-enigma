# EduPlatform — Server Deployment Guide

## Mundarija

1. [Server talablari](#1-server-talablari)
2. [Server tayyorlash](#2-server-tayyorlash)
3. [Loyihani yuklash va sozlash](#3-loyihani-yuklash-va-sozlash)
4. [Environment o'zgaruvchilari](#4-environment-ozgaruvchilari)
5. [SSL sertifikat](#5-ssl-sertifikat)
6. [Ishga tushirish](#6-ishga-tushirish)
7. [Nginx konfiguratsiya](#7-nginx-konfiguratsiya)
8. [Database migratsiyasi](#8-database-migratsiyasi)
9. [Tekshirish](#9-tekshirish)
10. [Yangilash](#10-yangilash)
11. [Zaxira nusxa (Backup)](#11-zaxira-nusxa-backup)
12. [Monitoring](#12-monitoring)
13. [Muammolarni bartaraf etish](#13-muammolarni-bartaraf-etish)

---

## 1. Server talablari

### Kichik maktab (< 500 o'quvchi)

```
CPU:     2 vCPU
RAM:     4 GB
Disk:    40 GB SSD
OS:      Ubuntu 22.04 LTS
```

### O'rta maktab (500–2000 o'quvchi)

```
CPU:     4 vCPU
RAM:     8 GB
Disk:    100 GB SSD
OS:      Ubuntu 22.04 LTS
```

### Tavsiya etilgan hosting provayderlar

| Provayder | Tarif | RAM | Narx/oy |
|-----------|-------|-----|---------|
| Hetzner | CPX21 | 4 GB | ~$8 |
| Hetzner | CPX31 | 8 GB | ~$16 |
| Contabo | VPS S | 8 GB | ~€5 |
| DigitalOcean | Basic | 4 GB | $24 |
| **Uzumcloud** | Standard | 4 GB | ~150k so'm |
| **Sarkor** | VPS-2 | 4 GB | ~120k so'm |

---

## 2. Server tayyorlash

### Docker o'rnatish

```bash
# Eski versiyalarni o'chirish
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Docker o'rnatish
curl -fsSL https://get.docker.com | sh

# Joriy foydalanuvchini docker guruhiga qo'shish
sudo usermod -aG docker $USER
newgrp docker

# Tekshirish
docker --version
docker compose version
```

### Firewall sozlash

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3000   # Frontend to'g'ridan-to'g'ri emas (Nginx orqali)
sudo ufw deny 3001   # Backend to'g'ridan-to'g'ri emas (Nginx orqali)
sudo ufw deny 5432   # PostgreSQL tashqaridan yopiq
sudo ufw deny 6379   # Redis tashqaridan yopiq
sudo ufw enable
```

---

## 3. Loyihani yuklash va sozlash

```bash
# Loyihani serverga yuklab olish
git clone https://github.com/Xronuz/ubiquitous-enigma.git /opt/eduplatform
cd /opt/eduplatform
```

---

## 4. Environment o'zgaruvchilari

### Backend env fayli

```bash
nano /opt/eduplatform/apps/backend/.env
```

Quyidagi to'liq konfiguratsiya:

```env
# ─── Database ──────────────────────────────────────────────
DATABASE_URL="postgresql://eduplatform:STRONG_PASSWORD_HERE@postgres:5432/eduplatform_db"

# ─── Redis ────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ─── JWT (kamida 32 ta belgi) ─────────────────────────────
JWT_SECRET=GENERATE_WITH_OPENSSL_RAND_BASE64_32
JWT_REFRESH_SECRET=GENERATE_WITH_OPENSSL_RAND_BASE64_64

# ─── App ──────────────────────────────────────────────────
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# ─── CORS ─────────────────────────────────────────────────
ALLOWED_ORIGINS=https://your-domain.com

# ─── Rate limiting ────────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# ─── MinIO / Fayl saqlash ─────────────────────────────────
# Agar MinIO ishlatmasangiz — bo'sh qoldiring, lokal ./uploads/ ishlatiladi
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=MINIO_ACCESS_KEY_HERE
MINIO_SECRET_KEY=MINIO_SECRET_KEY_HERE
MINIO_BUCKET=eduplatform
MINIO_USE_SSL=false

# ─── Email (SMTP) ─────────────────────────────────────────
# Bo'sh qoldirilsa — stub rejim (logga yozadi)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password-here
SMTP_FROM=EduPlatform <noreply@your-domain.com>

# ─── SMS (Infobip) ────────────────────────────────────────
# Bo'sh qoldirilsa — stub rejim
INFOBIP_API_KEY=
INFOBIP_BASE_URL=
SMS_FROM=EduPlatform

# ─── App URL ──────────────────────────────────────────────
APP_URL=https://your-domain.com
```

**JWT secret generatsiya qilish:**

```bash
openssl rand -base64 32   # JWT_SECRET uchun
openssl rand -base64 64   # JWT_REFRESH_SECRET uchun
```

### Frontend env fayli

```bash
nano /opt/eduplatform/apps/frontend/.env.production
```

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_WS_URL=https://your-domain.com
```

### Docker Compose production env

```bash
nano /opt/eduplatform/.env
```

```env
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=eduplatform_db

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD

BACKEND_TAG=latest
FRONTEND_TAG=latest
```

> **Muhim:** `.env` fayllardagi parollar backend `.env` dagi parollar bilan mos bo'lishi kerak.

---

## 5. SSL sertifikat

### Let's Encrypt (bepul, avtomatik yangilanadi)

```bash
# Certbot o'rnatish
sudo apt update && sudo apt install -y certbot

# Sertifikat olish (80 port ochiq bo'lishi kerak)
sudo certbot certonly --standalone \
  -d your-domain.com \
  --agree-tos \
  --email admin@your-domain.com \
  --non-interactive

# Nginx uchun papka yaratish va nusxalash
sudo mkdir -p /opt/eduplatform/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/eduplatform/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem  /opt/eduplatform/nginx/ssl/key.pem
sudo chmod 644 /opt/eduplatform/nginx/ssl/*.pem
```

### Sertifikatni avtomatik yangilash

```bash
# Crontab ochish
crontab -e

# Qo'shish (har 90 kunda yangilanadi)
0 3 1 */2 * certbot renew --quiet && \
  cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/eduplatform/nginx/ssl/cert.pem && \
  cp /etc/letsencrypt/live/your-domain.com/privkey.pem  /opt/eduplatform/nginx/ssl/key.pem && \
  docker compose -f /opt/eduplatform/docker-compose.prod.yml restart nginx
```

---

## 6. Ishga tushirish

```bash
cd /opt/eduplatform

# Barcha servislarni ishga tushirish (background)
docker compose -f docker-compose.prod.yml up -d

# Loglarni ko'rish (ishga tushayotganini kuzatish)
docker compose -f docker-compose.prod.yml logs -f
```

Ko'rinishi kerak:

```
✓ postgres   — healthy
✓ redis      — healthy
✓ minio      — healthy
✓ backend    — Application is running on: http://localhost:3001
✓ frontend   — ready
✓ nginx      — started
```

---

## 7. Nginx konfiguratsiya

`nginx/nginx.conf` fayli loyiha ichida tayyor. Agar moslashtirishingiz kerak bo'lsa:

```bash
nano /opt/eduplatform/nginx/nginx.conf
```

Asosiy qatorlar:

```nginx
server_name your-domain.com;            # Domenni o'zgartiring

ssl_certificate     /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;

location /api { proxy_pass http://backend:3001; }
location /     { proxy_pass http://frontend:3000; }
```

Nginx ni qayta yuklash:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 8. Database migratsiyasi

```bash
cd /opt/eduplatform

# Birinchi marta — migratsiyalarni bajarish
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Ixtiyoriy: demo ma'lumotlar yuklash
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

> **Keyingi yangilanishlarda** `migrate deploy` avtomatik yangi migratsiyalarni qo'llashtiradi.

---

## 9. Tekshirish

### Health check

```bash
# Backend API
curl https://your-domain.com/api/v1/health

# Javob:
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

### Konteynerlar holati

```bash
docker compose -f docker-compose.prod.yml ps
```

```
NAME                    STATUS          PORTS
eduplatform-postgres    healthy
eduplatform-redis       healthy
eduplatform-minio       healthy
eduplatform-backend     running
eduplatform-frontend    running
eduplatform-nginx       running
```

---

## 10. Yangilash

```bash
cd /opt/eduplatform

# Yangi kodlarni olish
git pull origin main

# Konteynerlarni qayta build qilish va ishga tushirish
docker compose -f docker-compose.prod.yml up -d --build

# Migratsiyalarni bajarish (agar yangi bo'lsa)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

> **Downtime:** `--build` flag bilan yangilashda backend va frontend 30-60 soniya ishlamay qoladi. Zero-downtime uchun blue-green deployment yoki rolling update kerak.

---

## 11. Zaxira nusxa (Backup)

### Qo'lda backup olish

```bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f /opt/eduplatform/docker-compose.prod.yml exec -T postgres \
  pg_dump -U eduplatform eduplatform_db \
  > /opt/backups/db_${DATE}.sql

echo "Backup saqlandi: /opt/backups/db_${DATE}.sql"
```

### Avtomatik backup (har kuni 02:00 da)

```bash
# Backup papkasi yaratish
sudo mkdir -p /opt/backups

# Backup skripti yaratish
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups

# Database backup
docker compose -f /opt/eduplatform/docker-compose.prod.yml exec -T postgres \
  pg_dump -U eduplatform eduplatform_db \
  > $BACKUP_DIR/db_${DATE}.sql

# Oxirgi 7 kun backupini saqlash, eskisini o'chirish
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "[$(date)] Backup tugadi: db_${DATE}.sql"
EOF

chmod +x /opt/backup.sh

# Cron qo'shish
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

### Backupdan tiklash

```bash
# Konteynerlarni to'xtatish
docker compose -f /opt/eduplatform/docker-compose.prod.yml down

# Faqat postgres ni ishga tushirish
docker compose -f /opt/eduplatform/docker-compose.prod.yml up -d postgres

# Backupni yuklash
cat /opt/backups/db_20260417_020000.sql | \
  docker compose -f /opt/eduplatform/docker-compose.prod.yml exec -T postgres \
  psql -U eduplatform eduplatform_db

# Barcha servislarni qayta ishga tushirish
docker compose -f /opt/eduplatform/docker-compose.prod.yml up -d
```

---

## 12. Monitoring

### Loglarni kuzatish

```bash
# Barcha servislar
docker compose -f docker-compose.prod.yml logs -f

# Faqat backend
docker compose -f docker-compose.prod.yml logs -f backend

# Oxirgi 100 qator
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Resurs ishlatish

```bash
# Real-time stats
docker stats

# Disk
df -h
du -sh /opt/eduplatform /opt/backups
```

### Systemd service (server qayta yoqilganda avtomatik ishga tushirish)

```bash
cat > /etc/systemd/system/eduplatform.service << 'EOF'
[Unit]
Description=EduPlatform Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/eduplatform
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable eduplatform
sudo systemctl start eduplatform
```

---

## 13. Muammolarni bartaraf etish

### Backend ishga tushmayapti

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

Tez-tez uchraydigan sabablar:
- `DATABASE_URL` noto'g'ri (parol yoki host)
- `JWT_SECRET` bo'sh
- Port 3001 band

### 502 Bad Gateway

```bash
# Backend ishlayotganini tekshirish
docker compose -f docker-compose.prod.yml ps

# Nginx logi
docker compose -f docker-compose.prod.yml logs nginx --tail=30
```

### Database ulanmayapti

```bash
# Postgres holati
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U eduplatform

# Ulanishni tekshirish
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db execute --stdin <<< "SELECT 1"
```

### MinIO ishlamayapti (fayllar yuklanmayapti)

`MINIO_ENDPOINT` va `MINIO_ACCESS_KEY` ni tekshiring. Agar MinIO kerak bo'lmasa — `.env` dagi `MINIO_ENDPOINT` ni bo'sh qoldiring, lokal `./uploads/` papkasi ishlatiladi.

### Konteynerlarni qayta ishga tushirish

```bash
# Hammasi
docker compose -f docker-compose.prod.yml restart

# Faqat backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## Xavfsizlik chek-listi

- [ ] `JWT_SECRET` va `JWT_REFRESH_SECRET` — kamida 32 ta tasodifiy belgi
- [ ] PostgreSQL paroli kuchli (katta harf + raqam + belgi)
- [ ] SSH uchun faqat kalit autentifikatsiya (`PasswordAuthentication no`)
- [ ] Firewall yoqilgan, faqat 22/80/443 ochiq
- [ ] `NODE_ENV=production` sozlangan
- [ ] HTTPS ishlayapti, HTTP → HTTPS redirect bor
- [ ] `ALLOWED_ORIGINS` faqat o'z domeningizni ko'rsatmoqda
- [ ] Backup avtomatlashtirilgan
- [ ] Server xavfsizlik yangilanishlari (`sudo apt update && sudo apt upgrade`)
