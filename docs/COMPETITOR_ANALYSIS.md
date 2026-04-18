# EduPlatform — Raqobatchi Tahlili va Yaxshilash Rejasi

> **Tahlil qilingan raqobatchi:** [nis-school.eduschool.uz](https://nis-school.eduschool.uz) (EduSchool)  
> **Tahlil sanasi:** 2026-04-18  
> **Maqsad:** Feature bo'shliqlari, UI/UX farqlari va ustuvor yaxshilashlar rejasi

---

## Mundarija

1. [Raqobatchi tizimi — to'liq funksiya xaritasi](#1-raqobatchi-tizimi--toliq-funksiya-xaritasi)
2. [Ularda bor, bizda yo'q (Priority gaps)](#2-ularda-bor-bizda-yoq)
3. [Bizda bor, ularda yo'q (Ustunliklarimiz)](#3-bizda-bor-ularda-yoq)
4. [UI/UX taqqoslash](#4-uiux-taqqoslash)
5. [Yaxshilash rejasi (bosqichli)](#5-yaxshilash-rejasi-bosqichli)

---

## 1. Raqobatchi tizimi — to'liq funksiya xaritasi

### Sidebar navigatsiya (barcha bo'limlar)

| Bo'lim | URL | Funksiya |
|--------|-----|----------|
| **Dashboard** | `/dashboard` | KPI kartalar, davomat analitikasi, dars qoldiruvchilar |
| **Lidlar (CRM)** | `/order` | Kanban pipeline, 6 ta bosqich (funnel) |
| **Dars jadvali** | `/schedule` | Haftalik jadval Dush–Shan, 10 ta dars soati |
| **Topshiriqlar** | `/task` | Xodimlar uchun Kanban task manager |
| **Sinflar** | `/classes` | Sinf CRUD |
| **Guruhlar** | `/groups` | O'quv markazi guruhlar |
| **Fanlar** | `/science` | Fan CRUD |
| **Xonalar** | `/rooms` | Xona/auditoriya boshqaruvi |
| **O'quvchilar** | `/students` | Shartnoma#, Abonement, Balans, Chegirma, Tag |
| **Arxiv o'quvchilar** | `/archive-students` | O'chirilgan emas, arxiv |
| **O'quvchilar manzili** | `/students-location` | Xarita ko'rinishi |
| **Ota-onalar** | `/parents` | Ota-ona profillari |
| **Shartnomalar** | `/contracts` | Shartnoma shablonlari (background rasm bilan) |
| **Jurnal** | `/journal` | Sinflar + Guruhlar bo'yicha tabs |
| **Chat** | `/chat` | Ichki xabarlar |
| **Mavsumiy baholash** | `/monthly-assessment` | Choraklik/mavsumiy baho: Tur, Baho, Izoh |
| **Mavsumiy baholash (fan)** | `/monthly-assessment-by-subjects` | Fanlar bo'yicha choraklik |
| **O'zlashtirish** | `/analitics/appropriation` | O'rtacha ball, sinf/guruh/fan kesimida |
| **O'zlashtirish ko'rsatkichlari** | `/analitics/seasonal-appropriation` | Choraklik dinamika |
| **O'zlashtirish (fan bo'yicha)** | `/analitics/...by-subjects` | Fan kesimida taqqoslash |
| **Sinflar reytingi** | `/analitics/class-rating` | Sinflar o'rtasida reyting |
| **Davomat analitikasi** | `/analitics/attendance-analytics` | Export + Filter |
| **Davomat intizomi** | `/analitics/attendance-discipline-report` | Surunkali qatnashmaydigan hisobot |
| **O'qituvchi ish hisoboti** | `/analitics/teacher-work-reports` | Dars, jurnal, uy vazifasi statistikasi |
| **Mavsumiy baho hisoboti** | `/analitics/monthly-assessment-reports` | Choraklik baho analitikasi |
| **Buyurtmalar voronkasi** | `/analitics/leads-funnel` | CRM funnel analitikasi |
| **Ishdan bo'shatishlar** | `/analitics/dismissal-report` | Ketgan o'quvchilar sabablari |
| **Kassa** | `/cash` | Kirim/Chiqim/Ko'chirish/Ayirboshlash, bir nechta kassa |
| **Ish haqi** | `/salary` | Oylik maosh to'lov batchlari |
| **Moliya hisobotlari** | `/financial-reports` | Umumiy moliyaviy hisobot |
| **P&L hisoboti** | `/pnl-reports` | Oyma-oy: Daromad, Xarajat, Foyda, Dividendlar |
| **Pul oqimi** | `/cashflow` | Cash flow statement |
| **Moliya analitikasi BETA** | `/finance-analytics` | Tahlil (ishlanmoqda) |
| **Tranzaksiyalar** | `/transactions` | Barcha tranzaksiyalar |
| **Abonement tranzaksiyalari** | `/subscription-transactions` | Obuna to'lovlari |
| **Bonus** | `/bonus` | Xodim/o'quvchi bonuslari |
| **Jarima** | `/penalty` | Jarima tizimi |
| **Qarzdorlik pivot** | `/sub-transactions-pivot` | Oyma-oy qarzdorlik |
| **Filiallar** | `/branches` | Ko'p filial boshqaruvi |
| **Rollar** | `/roles` | RBAC — ruxsatlar |
| **Xodimlar** | `/employees` | Xodim: Tur, Bo'lim, Lavozim |
| **Taklif va shikoyatlar** | `/suggestions-complaints` | Feedback tizimi |
| **Xodimlar bandligi** | `/employee-free-time` | Xodim bo'sh/band vaqtlari |
| **Ish jadvali** | `/work-schedule` | Xodimlar ish jadvali |
| **Moliya sozlamalari** | `/finance-settings` | Tranzaksiya turi, To'lov usuli, Abonement, Chegirma, Valyuta |
| **Integratsiyalar** | `/integrations-settings` | Payme, Bito Pay, Eskiz, Play Mobile, Kommo, Moizvonki |
| **Umumiy sozlamalar** | `/general-settings` | Akademik yil, Chorak, Baholash tizimi, Turniket, va h.k. |
| **Sotuv va marketing** | `/story` | Hikoya, Yangiliklar, So'rovnomalar |

### Maxsus yashirin funksiyalar (Settings orqali aniqlandi)

| Funksiya | Tavsif |
|----------|--------|
| **Turniket integratsiyasi** | Fizik kirish-chiqish qurilmalari bilan bog'lanish |
| **Turniket qarzdorni blok** | Qarzda bo'lsa turniket ochilmaydi |
| **GPS davomat** | Joylashuv bo'yicha davomat belgilash |
| **"Kelaman" signal** | Ota-ona ilovadan signal → xodimga task yaratiladi |
| **Xulq-atvor tizimi** | O'quvchi xulqini kuzatish va baholash |
| **Coin tizimi (gamification)** | O'quvchilarga coin berib rag'batlantirish |
| **Qarzdorlarga ilovani blok** | Qarzda bo'lsa mobil ilova ishlamaydi |
| **Mobil ilova (iOS + Android)** | Konfiguratsiyalanadigan widget tizimi bilan |
| **Avtomatik shartnoma raqami** | Shartnoma raqamini tizim o'zi beradi |
| **Ota-ona mobil tranzaksiyalari** | Ota-ona ilovadan to'lov qila oladi |

---

## 2. Ularda bor, bizda yo'q

### 🔴 P1 — Kritik (Bozorda yo'qotish sababi)

#### 1. CRM / Lead Management tizimi
**EduSchool:** `/order` — to'liq Kanban CRM:
- 6 ta bosqich: Yangi → Dastlabki holat → Qayta qo'ng'iroq → Javob bermadi → Yakunlandi → Bekor qilindi
- Buyurtmalar voronkasi analitikasi
- Ishdan bo'shatishlar (ketish sabablari) hisoboti

**Bizda:** Yo'q — yangi o'quvchilar to'g'ridan-to'g'ri qo'shiladi, pre-enrollment funnel yo'q

**Ta'sir:** O'quv markazlari uchun juda muhim — leads tracking bo'lmasa marketing ROI o'lchab bo'lmaydi

---

#### 2. Mobil ilova (iOS + Android) + Widget tizimi
**EduSchool:** To'liq konfiguratsiyalanadigan mobil ilova:
- 13 ta widget: Bugungi darslar, Davomat, Baholar, Uy vazifasi, Menyu, Yangiliklar, Coin, Bolani olib ketish, va h.k.
- Ota-ona ilovadan to'lov qilish
- "Kelaman" signal funksiyasi (parent pickup)
- Qarzdorlarga ilovani bloklash

**Bizda:** Yo'q — faqat web

**Ta'sir:** Zamonaviy ota-onalar mobil ilovani kutadi; mobil yo'qligi eng katta raqobat ustunligi yo'qotishi

---

#### 3. P&L + Cash Flow moliyaviy hisobotlar
**EduSchool:** `/pnl-reports` — oyma-oy:
- Boshlang'ich qoldiq → Daromad → Xarajat → O'qish qaytarish → Foyda → Dividendlar → Yakuniy qoldiq
- Cash Flow Statement
- Rejali xarajat (budget planning)
- Moliya analitikasi BETA

**Bizda:** To'lov qabul qilish bor, lekin P&L / Cash Flow hisoboti yo'q

**Ta'sir:** Maktab direktori/hisobchi uchun asosiy moliyaviy ko'rsatkichlar yo'q

---

#### 4. Ko'p filial (Multi-branch) boshqaruvi
**EduSchool:** `/branches` — bitta akkauntdan bir nechta filial boshqarish

**Bizda:** Super-admin orqali alohida maktablar bor, lekin bitta maktab ichida filiallar yo'q

**Ta'sir:** O'quv markazlari ko'pincha 2–5 filialga ega; bu funksiya olmasa ketadilar

---

### 🟠 P2 — Muhim (Raqobatda orqada qolish)

#### 5. O'qituvchi ish hisoboti
**EduSchool:** Har bir o'qituvchi uchun:
- Darslar soni, Jurnal yozganlari, Jurnal yozmagan kunlar, Uy vazifalar soni
- Bu o'qituvchi mas'uliyatini nazorat qiladi

**Bizda:** Davomat + baholar bor, lekin o'qituvchi accountability report yo'q

---

#### 6. Xulq-atvor + Coin (Gamification) tizimi
**EduSchool:** O'quvchi xulqini baholash + Coin bilan rag'batlantirish (gamification widget mobil ilovada)

**Bizda:** Yo'q

---

#### 7. Turniket / Kirish nazorati integratsiyasi
**EduSchool:** Fizik turniket qurilmalari bilan integratsiya — kirish/chiqish avtomatik, qarzdorlarga kirish bloki

**Bizda:** Yo'q

---

#### 8. GPS / Joylashuv bo'yicha davomat
**EduSchool:** Geolokatsiya asosida davomat belgilash (masofaviy/online o'qish uchun)

**Bizda:** Yo'q

---

#### 9. Mavsumiy / Choraklik baholash tizimi
**EduSchool:** Kundalik baholardan alohida — choraklik yakuniy baho: O'quvchi, Sinf, Fan, Tur (chorak/yarim yil/yil), Ball, Izoh

**Bizda:** Faqat kundalik baholar; yakuniy choraklik baholash moduli yo'q

---

#### 10. Sinflar reytingi + O'zlashtirish analitikasi
**EduSchool:** Sinflarni bir-biri bilan taqqoslash, fan kesimida ko'rsatkichlar

**Bizda:** Hisobotlar bor, lekin sinflar reytingi yo'q

---

#### 11. Abonement + Chegirma + Balance tizimi
**EduSchool:** Har bir o'quvchida: Abonement turi, Joriy balans, To'lov sanasi, Chegirma (%)
- Abonement tranzaksiyalari alohida modul
- Oyma-oy qarzdorlik pivot

**Bizda:** To'lov moduli bor, lekin subscription/balance model yo'q (bir martalik to'lov)

---

#### 12. Xodimlar bandligi + Ish jadvali
**EduSchool:** Xodimning qaysi vaqtda bo'sh yoki band ekanligini boshqarish; ish jadvali generatsiyasi va export

**Bizda:** Yo'q

---

#### 13. Taklif va shikoyatlar moduli
**EduSchool:** Ota-onalar va o'quvchilardan feedback qabul qilish tizimi, mobil ilovada widget

**Bizda:** Yo'q

---

### 🟡 P3 — Istakli (Differentiation)

#### 14. Xodim bonus/jarima tizimi
Xodimlar uchun bonus va jarima hisoblash + maosh bilan integratsiya

#### 15. Sotuv va Marketing moduli
- **Hikoya (Stories):** Instagram-style yangiliklar ota-onalar uchun
- **Yangiliklar:** E'lonlar feed
- **So'rovnomalar:** Online oproslar

#### 16. Shartnoma shablonlari
Brend rasmi/foni bilan chop etiladigan shartnoma PDF generatsiyasi

#### 17. O'quvchilar xarita ko'rinishi
O'quvchilar yashash manzillarini xaritada ko'rish (transport optimizatsiyasi uchun ham)

#### 18. Integratsiya markazi (Integration Hub)
**EduSchool:** Tayyor integratsiyalar: Payme, Bito Pay, Eskiz SMS, Play Mobile, Kommo CRM, Moizvonki (qo'ng'iroqlarni kuzatish)

**Bizda:** Faqat Payme/Click; SMS faqat Infobip; Kommo/CRM integratsiya yo'q

#### 19. Global tezkor qidiruv (⌘K)
Barcha sahifalar, o'quvchilar, xodimlar, guruhlarni bitta qidiruv oynasidan topish

---

## 3. Bizda bor, ularda yo'q

Bular bizning **raqobat ustunliklarimiz** — saqlash va rivojlantirish kerak:

| Bizning funksiya | Tavsif | Ustunlik |
|-----------------|--------|----------|
| **Kutubxona moduli** | Kitoblar CRUD, berib-olish, statistika | O'rta maktablar uchun muhim |
| **Online imtihon** | O'quvchi onlayn test topshirish tizimi | EduSchool faqat natijalarni yozadi |
| **Uy vazifasi submit/baholash** | To'liq workflow: berish → topshirish → baholash | Ularda faqat count statistikasi |
| **Ta'til so'rovlari** | Rasmiy so'rov → tasdiqlash workflow | EduSchool'da yo'q |
| **Maosh avans tizimi** | Avans berish, oylik maosh workflow | EduSchool maoshni batch qiladi, avans yo'q |
| **Zal monitoru (Display)** | Publick jadval ekrani (TV uchun) | Kutish zali uchun noyob funksiya |
| **Ota-ona portali (web)** | Dedicated web interfeys | Ular faqat mobil ilovaga tayanadi |
| **Super admin** | Ko'p maktab SaaS boshqaruvi | Biznes model farqi |
| **Real-time WebSocket** | Bildirishnomalar, chat real-time | Arxitektura ustunligi |
| **Push notifications** | In-app + SMS + Push uch kanal | EduSchool SMS ga tayangan |
| **Oshxona / Menyu moduli** | Haftalik ovqat menyusi | EduSchool'da sozlamalarda faqat stub |
| **Transport stub** | Marshrut boshqaruvi (Phase 3) | Kelgusida katta ustunlik |
| **BullMQ async queue** | Ishonchli notification delivery | Texnik ustunlik |
| **Swagger API docs** | To'liq API hujjatlar | Integratsiya qiluvchi uchun muhim |

---

## 4. UI/UX taqqoslash

### EduSchool UI pattern

| Aspekt | EduSchool | Bizning tizim | Baho |
|--------|-----------|---------------|------|
| **Design tizimi** | Material UI (MUI v5) + custom "Gilroy" font | MUI + Tailwind | Teng |
| **Rang sxema** | Asosiy: `#249EB1` (teal), oq fon | Qo'shimcha sozlash kerak | EduSchool aniqroq brand |
| **Sidebar** | Collapsible, icon + text, expand/collapse parent | Shunga o'xshash | Teng |
| **Global qidiruv** | ⌘K modal — sahifalar, o'quvchilar, xodimlar | Yo'q | **EduSchool yaxshiroq** |
| **DataGrid** | MUI DataGrid hamma joyda: sort, filter, export, pagination | Shunga o'xshash | Teng |
| **Dashboard KPI** | Rangdor card'lar, real-time raqamlar | Shunga o'xshash | Teng |
| **Kanban** | Leads va Task uchun drag-drop Kanban | Faqat homework submission | **EduSchool boyroq** |
| **Jadval ko'rinishi** | Haftalik grid, timestamp ko'rinadi | Haftalik/kunlik view | Teng |
| **Mobil moslashuv** | Asosan desktop + mobil ilova | Responsive web | **Bizning ustunlik** |
| **Xato sahifasi** | "Sahifa topilmadi" oddiy xabar | 404/403 handling | Teng |
| **Yükleniş holati** | Skeleton loader yaxshi | Shunga o'xshash | Teng |
| **Export** | Excel export deyarli hamma joyda | Hisobot exportlari bor | Teng |
| **Filtr** | Advanced filter modal | Filter mavjud | Teng |
| **Multi-language** | Faqat O'zbek | O'zbek | Teng |
| **Academic year** | 2025–2026 dropdown | O'quv yili boshqaruvi | Teng |

### Eng muhim UI farqlar

**1. Global ⌘K Tezkor Qidiruv** — EduSchool'dagi eng kuchli UX funksiya. Bitta klaviatura shortcut bilan sahifalar, o'quvchilar, xodimlar, guruhlargacha qidirish. Katta maktablarda kunlik ish tezligini 3–5x oshiradi.

**2. Dashboard informatsiya zichligi** — EduSchool dashboardida to'g'ridan-to'g'ri qarzdorlar soni, aktiv/arxiv breakdown, birinchi to'lov qilganlar ko'rinadi. Bizning dashboard'da umumiy KPI'lar yanada boyroq bo'lishi kerak.

**3. Leads Kanban** — Vizual pipeline funneli marketing va qabul jarayonini dramatik ravishda yaxshilaydi. Odd/mismatched entries yo'qoladi.

**4. O'qituvchi accountability** — "Jurnal yozdi/yozmadi" ko'rinishi o'qituvchi nazoratini shaffof qiladi. Maktab rahbariyati uchun juda muhim.

---

## 5. Yaxshilash rejasi (bosqichli)

### Phase 3 — Tezkor yutishlar (1–2 oy)

**T1. Global ⌘K qidiruv**
- Barcha entitylar (o'quvchi, xodim, sinf, fan) bitta qidiruv modalida
- Backend: ElasticSearch yoki Postgres full-text search
- Frontend: ⌘K shortcut, debounced API call
- **Effort:** M | **Impact:** Juda yuqori

**T2. Dashboard KPI boyitish**
- Qarzdorlar soni, Aktiv/Arxiv breakdown, Birinchi to'lov qilganlar
- Davomat heatmap (haftalik/oylik)
- O'qituvchi accountability mini-widget
- **Effort:** S | **Impact:** Yuqori

**T3. Sinflar reytingi**
- O'rtacha ball bo'yicha sinflar tartibi
- Fan kesimida taqqoslash
- Export (PDF/Excel)
- **Effort:** S | **Impact:** O'rta

**T4. O'qituvchi ish hisoboti**
- Dars o'tildi/o'tilmadi
- Jurnal to'ldirildi/to'ldirilmadi
- Uy vazifasi berildi/berilmadi count
- **Effort:** S | **Impact:** Yuqori

**T5. Mavsumiy / Choraklik baholash**
- Kundalik baholardan alohida modul
- Chorak, yarim yil, yillik yakuniy baholar
- Fan, Tur, Baho, Izoh maydonlari
- **Effort:** M | **Impact:** Yuqori

---

### Phase 4 — Asosiy bo'shliqlarni to'ldirish (2–4 oy)

**P1. CRM / Lead Management**
```
Arxitektura:
- Lead entity: ism, telefon, maqsad sinf, manba, holat, izoh, mas'ul xodim
- Kanban pipeline: 6 bosqich (sozlanadi)
- Avtomatik SMS/email bosqich o'zgarganda
- Leads funnel analytics
- Ketish sababi (ishdan bo'shatish hisoboti)
```
- **Effort:** L | **Impact:** Kritik (yangi segment: o'quv markazlar)

**P2. P&L + Cash Flow hisobotlari**
```
- Oyma-oy P&L: Daromad, Xarajat kategoriyalari bo'yicha, Foyda
- Cash Flow Statement (direct method)
- Rejali vs Haqiqiy xarajat taqqoslash
- PDF/Excel export
```
- **Effort:** M | **Impact:** Kritik (direktorlar uchun)

**P3. Abonement / Subscription billing modeli**
```
- O'quvchi balans hisob
- Oylik abonement avtomatik to'lov
- Chegirma (%) qo'llash
- Qarzdorlik holati: mobil ilovani bloklash, turniket bloki
- Oyma-oy qarzdorlik pivot hisoboti
```
- **Effort:** L | **Impact:** Yuqori (o'quv markazlar uchun asosiy model)

**P4. Ko'p filial (Multi-branch)**
```
- Bitta maktab akkauntida N ta filial
- Har filial uchun alohida kassa, xodimlar, sinflar
- Konsolidatsiyalangan hisobotlar (barcha filiallar)
- Filial boshqaruvchi roli
```
- **Effort:** XL | **Impact:** Kritik (katta o'quv markazlar)

**P5. Xodimlar bandligi + Ish jadvali**
```
- Xodim bo'sh vaqtlari (availability matrix)
- Ish jadvali (shift-based)
- Excel export
- Jadval tuzishda conflict detection
```
- **Effort:** M | **Impact:** O'rta

---

### Phase 5 — Differentiation (4–6 oy)

**D1. Mobil ilova (React Native yoki PWA)**
```
Ustuvor widgetlar:
1. Bugungi darslar
2. Davomat holati
3. So'nggi baholar
4. Uy vazifasi
5. Balans / To'lov
6. Chat
7. Bolani olib ketish signali
8. Xulq-atvor/Coin
```
- **Effort:** XL | **Impact:** Kritik uzoq muddatda

**D2. Gamification / Xulq-atvor tizimi**
```
- Xulq-atvor voqealari: ijobiy / salbiy
- Coin rag'batlantirish tizimi
- O'quvchi profil sahifasida ko'rsatish
- Mobil ilovada widget
```
- **Effort:** M | **Impact:** Yuqori (o'quvchi motivatsiyasi)

**D3. Turniket integratsiyasi**
```
- API/SDK integratsiya (Dahua, ZKTeco va h.k.)
- Kirish/chiqish vaqtini avtomatik davomat sifatida qayd etish
- Qarzdor o'quvchilarni bloklash rejimi
```
- **Effort:** L | **Impact:** Yuqori (premium segment)

**D4. Sotuv va Marketing moduli**
```
- Hikoya (Stories): rasm/video, muddatli
- E'lonlar/Yangiliklar feed
- So'rovnomalar (yopiq/ochiq savollar)
- Ota-onalar mobil ilovasida ko'rinadi
```
- **Effort:** M | **Impact:** O'rta

**D5. Integratsiya markazi**
```
Yangi integratsiyalar:
- Bito Pay (mahalliy to'lov)
- Eskiz SMS (Infobip'dan uczonroq)
- Play Mobile SMS
- Kommo CRM (leads sync)
- Moizvonki (qo'ng'iroq tarixi)
```
- **Effort:** M | **Impact:** O'rta

---

## Xulosa — Prioritet matritsasi

```
                IMPACT
                Yuqori          Past
             ┌──────────────┬──────────────┐
    Tez      │ ⌘K Qidiruv   │ Sinflar      │
    (S/M)    │ Dashboard KPI │ reytingi     │
             │ O'qituvchi   │ Shartnoma    │
             │ hisoboti     │ shablonlari  │
             ├──────────────┼──────────────┤
    Sekin    │ CRM/Leads ★  │ Turniket     │
    (L/XL)   │ P&L hisobot  │ Marketing    │
             │ Multi-branch │ Stories      │
             │ Mobil ilova ★│              │
             └──────────────┴──────────────┘
★ = Eng katta raqobat bo'shliqlari
```

### Tavsiya etilgan yo'nalish

1. **Darhol (1–4 hafta):** ⌘K qidiruv + Dashboard KPI + O'qituvchi hisoboti — past xarajat, katta UX foydasi
2. **1–2 oy:** Mavsumiy baho + Sinflar reytingi + P&L hisobot — funksional bo'shliqlar
3. **2–4 oy:** CRM/Leads + Multi-branch + Abonement billing — yangi bozor segmentlari
4. **4–6 oy:** Mobil ilova (PWA birinchi) + Gamification + Integratsiya markazi

> **Muhim eslatma:** EduSchool asosan **o'quv markazi (learning center)** uchun qurilgan (Abonement, Guruhlar, Leads). Bizning tizim esa asosan **davlat/xususiy maktab** uchun (Kutubxona, Transport, Online imtihon, Parent portal). Bu farqni hisobga olib, ikki yo'nalishda ham kuchli bo'lish strategiyasi optimal.
