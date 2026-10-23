# AGENTS.md

## UI
For any UI work, follow @DESIGN.md strictly. Don't invent new tokens.

## TRIỂN KHAI LOCAL WEB – giapha_chihoPhamThanhGiang

Mục tiêu: chạy được web Gia Phả OS (Next.js 16 + TypeScript) local, kết nối Supabase để có đầy đủ chức năng đăng ký/đăng nhập, phân quyền và lưu trữ dữ liệu gia phả.

### 1) Yêu cầu môi trường
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) >= 18.18 (khuyến nghị LTS)
- [Bun](https://bun.sh/) >= 1.2.x (dùng theo repo)
- [Supabase Account](https://supabase.com/) (miễn phí) – dùng cho Database + Auth
- Trình duyệt Chrome/Edge/Firefox
> Repo này dùng `bun.lock` nên ưu tiên `bun` thay vì `npm/yarn/pnpm`.

### 2) Chọn thư mục làm việc
Không đặt trong cùng repo `kanposvn`. Tạo thư mục riêng bên cạnh:

```powershell
cd F:\SHARED_HP_OLD\bag_sony_10\sampledart\demo_code\
mkdir giapha-web
cd giapha-web
```

### 3) Clone source code
```powershell
git clone https://github.com/hoannd1017/giapha_chihoPhamThanhGiang.git .
```

Kiểm tra nhanh:
```powershell
dir
```
Cần thấy: `package.json`, `next.config.ts`, `app/`, `components/`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `README.md`.

### 4) Cài đặt Database – Supabase
Project này dùng **Supabase** làm backend: Auth (email/password), Postgres + RLS.

#### A) Dùng Supabase Cloud (khuyến nghị)
1. Truy cập [supabase.com](https://supabase.com) → đăng nhập/đăng ký
2. `New Project` → đặt tên (vd. `giapha-local`)
3. Chọn Region gần nhất → tạo project (~1–2 phút)
4. Vào `Project Settings > API`
   - Lưu `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Lưu `Project API Keys > anon public` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

#### B) Dùng Supabase Local (Docker) – nâng cao
Yêu cầu Docker Desktop đang chạy.
```powershell
# Cài Supabase CLI nếu chưa có: bun add -g @supabase/cli
supabase start
```
Sử dụng ANON_KEY/URL local cho `.env.local`.

> Với mục đích chạy local nhanh, **A) Cloud** là đủ.

### 5) Dựng Database (Schema)
Repo hiện tại không có `prisma/schema.prisma` hoặc `supabase/schema.sql` trong root. Theo `README.md`, tài khoản **đầu tiên** đăng ký sẽ được tự gán quyền `admin`. Cấu trúc bảng được áp dụng trong code (`utils/supabase`, `context`, `app/api`, ...).

**Cách đơn giản:**
1. Hoàn thành 4 + 6 + 7 + 8
2. Mở `http://localhost:3000`
3. Đăng ký tài khoản **đầu tiên** → tự động role `admin`

Nếu có `supabase/migrations/` hoặc `supabase/schema.sql` trong repo, chạy theo hướng dẫn tương ứng.

### 6) Copy source & cấu hình môi trường
```powershell
copy .env.example .env.local
```
Mở `.env.local` và điền:
```env
SITE_NAME="Gia Phả OS"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-or-public-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-gemini-api-key"
```
> Có thể để trống `GOOGLE_GENERATIVE_AI_API_KEY` nếu không dùng AI.

### 7) Cài đặt dependencies
```powershell
bun install
```
Nếu lỗi mạng: `bun pm cache rm; bun install`

### 8) Chạy web trên local
```powershell
bun run dev
```
Truy cập [http://localhost:3000](http://localhost:3000)

### 9) Cấu hình Supabase Auth cho localhost
1. Vào [Supabase Dashboard > Authentication > URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
2. `Site URL`: `http://localhost:3000`
3. `Redirect URLs` → Add URL: `http://localhost:3000/**` → Save

### 10) Kiểm tra nhanh
- [ ] `http://localhost:3000` load OK
- [ ] Đăng ký tài khoản mới thành công
- [ ] Tài khoản đầu tiên có quyền `Admin`
- [ ] Trang quản lý/cây gia phả hiển thị bình thường

### 11) Chạy qua Docker (tùy chọn)
Có sẵn `Dockerfile` + `docker-compose.yml`. Tạo `.env.local` đầy đủ trước:
```powershell
docker compose up --build
```
Truy cập `http://localhost:3000`

### 12) Troubleshooting nhanh
| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| `Failed to fetch` khi auth | Chưa thêm `localhost:3000` vào Auth URL | Bước 9 |
| Blank page / 500 | Sai URL/key trong `.env.local` | Kiểm tra lại |
| `Module not found` | Chưa `bun install` | Chạy lại `bun install` |
| Port 3000 bận | Process khác đang dùng | `bun run dev --port 3001` |

### 13) Ghi chú quan trọng
- **KHÔNG** commit `.env.local` (đã có `.gitignore`).
- **KHÔNG** đặt source này bên trong `kanposvn/` (tránh nhầm lẫn khi backup/commit).
- Chỉ cần: tạo Supabase project + điền env + `bun install` + `bun run dev`.
- Tham khảo thêm: `DESIGN.md` (UI/UX), `README.md` (deploy).
