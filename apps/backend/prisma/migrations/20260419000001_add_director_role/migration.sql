-- DIRECTOR roli qo'shish (maktab direktori — nazorat va e'lon uchun)
-- PostgreSQL enum ga yangi qiymat qo'shish (ma'lumotlar yo'qolmaydi)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'director' AFTER 'school_admin';
