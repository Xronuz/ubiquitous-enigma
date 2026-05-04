--
-- Migration: Recover UserRole enum values
-- Purpose: Safely add back vice_principal, class_teacher, accountant, librarian, parent
--          if they were removed by 20260501185854_make_branch_required
--
-- This migration is idempotent — running it multiple times is safe.
--

DO $$
BEGIN
    -- Add vice_principal if missing
    BEGIN
        ALTER TYPE "UserRole" ADD VALUE 'vice_principal';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Value vice_principal already exists in UserRole enum';
    END;

    -- Add class_teacher if missing
    BEGIN
        ALTER TYPE "UserRole" ADD VALUE 'class_teacher';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Value class_teacher already exists in UserRole enum';
    END;

    -- Add accountant if missing
    BEGIN
        ALTER TYPE "UserRole" ADD VALUE 'accountant';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Value accountant already exists in UserRole enum';
    END;

    -- Add librarian if missing
    BEGIN
        ALTER TYPE "UserRole" ADD VALUE 'librarian';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Value librarian already exists in UserRole enum';
    END;

    -- Add parent if missing
    BEGIN
        ALTER TYPE "UserRole" ADD VALUE 'parent';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Value parent already exists in UserRole enum';
    END;
END $$;
