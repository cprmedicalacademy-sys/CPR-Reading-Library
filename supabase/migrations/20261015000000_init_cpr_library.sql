-- ==============================================================================
-- CPR Reading Library — Chattogram, Bangladesh
-- Member Management & QR Verification Database Schema & RLS Policies
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Members Table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_no TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    photo_url TEXT,
    bmdc_no TEXT,                      -- BMDC (Bangladesh Medical and Dental Council) Reg No (Private)
    phone TEXT,                        -- Mobile number (Private)
    joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_on DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,                        -- Internal administrator notes (Private)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Membership Renewals Table
CREATE TABLE IF NOT EXISTS public.membership_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    previous_expiry_date DATE NOT NULL,
    new_expiry_date DATE NOT NULL,
    renewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    renewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    renewed_by_email TEXT
);

-- 4. Create Indexes for Search Performance
CREATE INDEX IF NOT EXISTS idx_members_member_no ON public.members (member_no);
CREATE INDEX IF NOT EXISTS idx_members_bmdc_no ON public.members (bmdc_no);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members (phone);
CREATE INDEX IF NOT EXISTS idx_members_expires_on ON public.members (expires_on);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members (is_active);
CREATE INDEX IF NOT EXISTS idx_renewals_member_id ON public.membership_renewals (member_id);

-- 5. Updated At Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Helper Function: Auto Generate Next Member No (e.g. CPR-0001)
CREATE OR REPLACE FUNCTION public.get_next_member_no()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    formatted_id TEXT;
BEGIN
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN member_no ~ '^CPR-[0-9]+$' 
                THEN SUBSTRING(member_no FROM 5)::INTEGER 
                ELSE 0 
            END
        ), 0
    ) + 1 INTO next_num FROM public.members;
    
    formatted_id := 'CPR-' || LPAD(next_num::TEXT, 4, '0');
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Secure Public Verification Function
-- Critical Privacy Requirement: Exposes ONLY public verification fields.
-- NEVER exposes phone, bmdc_no, notes, or administrator metadata.
CREATE OR REPLACE FUNCTION public.get_public_member_verification(member_uuid UUID)
RETURNS TABLE (
    id UUID,
    member_no TEXT,
    full_name TEXT,
    photo_url TEXT,
    joined_on DATE,
    expires_on DATE,
    is_active BOOLEAN,
    status TEXT,
    is_valid BOOLEAN,
    institution TEXT,
    branch TEXT,
    verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.member_no,
        m.full_name,
        m.photo_url,
        m.joined_on,
        m.expires_on,
        m.is_active,
        CASE
            WHEN m.is_active = FALSE THEN 'INACTIVE'
            WHEN m.expires_on < CURRENT_DATE THEN 'EXPIRED'
            ELSE 'ACTIVE'
        END AS status,
        CASE
            WHEN m.is_active = TRUE AND m.expires_on >= CURRENT_DATE THEN TRUE
            ELSE FALSE
        END AS is_valid,
        'CPR Reading Library'::TEXT AS institution,
        'Chattogram, Bangladesh'::TEXT AS branch,
        timezone('utc'::text, now()) AS verified_at
    FROM public.members m
    WHERE m.id = member_uuid;
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_member_verification(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_member_no() TO authenticated;

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_renewals ENABLE ROW LEVEL SECURITY;

-- Deny all direct access to anonymous users on members table (zero data leakage)
-- Allow full access only to authenticated administrators
CREATE POLICY "Admins have full access to members"
    ON public.members
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow full access to membership renewals only to authenticated administrators
CREATE POLICY "Admins have full access to renewals"
    ON public.membership_renewals
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Revoke public table-level privileges as an extra layer of defense
REVOKE ALL ON public.members FROM anon;
REVOKE ALL ON public.membership_renewals FROM anon;
