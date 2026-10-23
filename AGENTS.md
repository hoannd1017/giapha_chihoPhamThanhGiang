# AGENTS.md

## UI
For any UI work, follow @DESIGN.md strictly. Don't invent new tokens.


## TRI?N KHAI LOCAL WEB – giapha_chihoPhamThanhGiang

M?c tiêu: ch?y du?c web Gia Ph? OS (Next.js 16 + TypeScript) local, k?t n?i Supabase d? có d?y d? ch?c nang dang ký/dang nh?p, phân quy?n và luu tr? d? li?u gia ph?.

### 1) Yêu c?u môi tru?ng
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) >= 18.18 (khuy?n ngh? LTS)
- [Bun](https://bun.sh/) >= 1.2.x (dùng theo repo)
- [Supabase Account](https://supabase.com/) (mi?n phí) – dùng cho Database + Auth
- Trình duy?t Chrome/Edge/Firefox
> Repo này dùng `bun.lock` nên uu tiên `bun` thay vì `npm/yarn/pnpm`.

### 2) Ch?n thu m?c làm vi?c
Không d?t trong cùng repo `kanposvn`. T?o thu m?c riêng bên c?nh:

```powershell
cd F:\SHARED_HP_OLD\bag_sony_10\sampledart\demo_code\
mkdir giapha-web
cd giapha-web
```

### 3) Clone source code
```powershell
git clone https://github.com/hoannd1017/giapha_chihoPhamThanhGiang.git .
```

Ki?m tra nhanh:
```powershell
dir
```
C?n th?y: `package.json`, `next.config.ts`, `app/`, `components/`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `README.md`.

### 4) Cài d?t Database – Supabase
Project này dùng **Supabase** làm backend: Auth (email/password), Postgres + RLS.

#### A) Dùng Supabase Cloud (khuy?n ngh?)
1. Truy c?p [supabase.com](https://supabase.com) ? dang nh?p/dang ký
2. `New Project` ? d?t tên (vd. `giapha-local`)
3. Ch?n Region g?n nh?t ? t?o project (~1–2 phút)
4. Vào `Project Settings > API`
   - Luu `Project URL` ? `NEXT_PUBLIC_SUPABASE_URL`
   - Luu `Project API Keys > anon public` ? `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

#### B) Dùng Supabase Local (Docker) – nâng cao
Yêu c?u Docker Desktop dang ch?y.
```powershell
# Cài Supabase CLI n?u chua có: bun add -g @supabase/cli
supabase start
```
S? d?ng ANON_KEY/URL local cho `.env.local`.

> V?i m?c dích ch?y local nhanh, **A) Cloud** là d?.

### 5) D?ng Database (Schema)
Repo hi?n t?i không có `prisma/schema.prisma` ho?c `supabase/schema.sql` trong root. Theo `README.md`, tài kho?n **d?u tiên** dang ký s? du?c t? gán quy?n `admin`. C?u trúc b?ng du?c áp d?ng trong code (`utils/supabase`, `context`, `app/api`, ...).

**Cách don gi?n:**
1. Hoàn thành 4 + 6 + 7 + 8
2. M? `http://localhost:3000`
3. Ðang ký tài kho?n **d?u tiên** ? t? d?ng role `admin`

N?u có `supabase/migrations/` ho?c `supabase/schema.sql` trong repo, ch?y theo hu?ng d?n tuong ?ng.

### 6) Copy source & c?u hình môi tru?ng
```powershell
copy .env.example .env.local
```
M? `.env.local` và di?n:
```env
SITE_NAME="Gia Ph? OS"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-or-public-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-gemini-api-key"
```
> Có th? d? tr?ng `GOOGLE_GENERATIVE_AI_API_KEY` n?u không dùng AI.

### 7) Cài d?t dependencies
```powershell
bun install
```
N?u l?i m?ng: `bun pm cache rm; bun install`

### 8) Ch?y web trên local
```powershell
bun run dev
```
Truy c?p [http://localhost:3000](http://localhost:3000)

### 9) C?u hình Supabase Auth cho localhost
1. Vào [Supabase Dashboard > Authentication > URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
2. `Site URL`: `http://localhost:3000`
3. `Redirect URLs` ? Add URL: `http://localhost:3000/**` ? Save

### 10) Ki?m tra nhanh
- [ ] `http://localhost:3000` load OK
- [ ] Ðang ký tài kho?n m?i thành công
- [ ] Tài kho?n d?u tiên có quy?n `Admin`
- [ ] Trang qu?n lý/cây gia ph? hi?n th? bình thu?ng

### 11) Ch?y qua Docker (tùy ch?n)
Có s?n `Dockerfile` + `docker-compose.yml`. T?o `.env.local` d?y d? tru?c:
```powershell
docker compose up --build
```
Truy c?p `http://localhost:3000`

### 12) Troubleshooting nhanh
| L?i | Nguyên nhân | Cách fix |
|---|---|---|
| `Failed to fetch` khi auth | Chua thêm `localhost:3000` vào Auth URL | Bu?c 9 |
| Blank page / 500 | Sai URL/key trong `.env.local` | Ki?m tra l?i |
| `Module not found` | Chua `bun install` | Ch?y l?i `bun install` |
| Port 3000 b?n | Process khác dang dùng | `bun run dev --port 3001` |

### 13) Ghi chú quan tr?ng
- **KHÔNG** commit `.env.local` (dã có `.gitignore`).
- **KHÔNG** d?t source này bên trong `kanposvn/` (tránh nh?m l?n khi backup/commit).
- Ch? c?n: t?o Supabase project + di?n env + `bun install` + `bun run dev`.
- Tham kh?o thêm: `DESIGN.md` (UI/UX), `README.md` (deploy).


## ONE-CLICK START LOCAL WEB

### Windows (PowerShell/CMD)
- Kích dúp `start-local.cmd` (ho?c ch?y `.\start-local.ps1` trong PowerShell)
- Script s? t? d?ng: ki?m tra Node.js, t?o `.env.local` n?u chua có, cài d?t dependencies (`npm ci`/`npm i`), m? trình duy?t `http://localhost:3000`, ch?y `npx next dev --port 3000`

### Linux/macOS
- Ch?y: `chmod +x start-local.sh && ./start-local.sh`

**Luu ý:** N?u m?i t?o `.env.local`, c?n c?p nh?t `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` t? Supabase tru?c khi dùng.
