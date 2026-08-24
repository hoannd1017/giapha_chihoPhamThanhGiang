-- ============================================================
-- Migration: Thống kê vùng sinh sống công khai cho mọi thành viên
--
-- Tạo VIEW chỉ chứa (person_id, current_residence) để mọi thành
-- viên đã đăng nhập đọc được nơi ở phục vụ thống kê, trong khi
-- phone_number và occupation trong person_details_private vẫn
-- giữ riêng tư (chỉ Admin xem được).
--
-- Lưu ý: VIEW mặc định chạy với quyền của owner (bỏ qua RLS của
-- bảng gốc) - đây là chủ đích để chỉ lộ đúng 2 cột này.
-- Chạy trong Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE VIEW public.person_residences AS
SELECT person_id, current_residence
FROM public.person_details_private;

REVOKE ALL ON public.person_residences FROM anon;
REVOKE ALL ON public.person_residences FROM PUBLIC;
GRANT SELECT ON public.person_residences TO authenticated;
