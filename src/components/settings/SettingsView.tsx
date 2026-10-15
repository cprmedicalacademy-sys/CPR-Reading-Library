import React, { useEffect, useState } from 'react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfigOverride,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { DataService } from '../../services/dataService';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  Server,
  Terminal,
  ExternalLink,
  Building,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  Save,
} from 'lucide-react';
import {
  getLibraryConfig,
  saveLibraryConfig,
  resetLibraryConfig,
  LibraryConfig,
  DEFAULT_LIBRARY_CONFIG,
} from '../../lib/constants';

const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
-- CPR Reading Library — Chattogram, Bangladesh
-- Member Management, Fee Management & Money Receipt Database Schema & RLS
-- ==============================================================================

-- 1. Enable UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Members Table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_no TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    photo_url TEXT,
    bmdc_no TEXT,                      -- BMDC Reg No (Private)
    phone TEXT,                        -- Mobile number (Private)
    joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_on DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,                        -- Internal notes (Private)

    -- Fee Management Fields (Private)
    monthly_fee NUMERIC NOT NULL DEFAULT 2000,
    membership_months INTEGER NOT NULL DEFAULT 12,
    total_payable NUMERIC NOT NULL DEFAULT 24000,
    membership_start_date DATE DEFAULT CURRENT_DATE,
    membership_end_date DATE,

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

-- 4. Create Payments & Money Receipts Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT NOT NULL UNIQUE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Cash', -- Cash, Bank, Mobile Banking, Other
    transaction_reference TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_by_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create Indexes for Search Performance
CREATE INDEX IF NOT EXISTS idx_members_member_no ON public.members (member_no);
CREATE INDEX IF NOT EXISTS idx_members_bmdc_no ON public.members (bmdc_no);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members (phone);
CREATE INDEX IF NOT EXISTS idx_members_expires_on ON public.members (expires_on);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members (is_active);
CREATE INDEX IF NOT EXISTS idx_renewals_member_id ON public.membership_renewals (member_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON public.payments (receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments (member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (payment_date);

-- 6. Updated At Trigger
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

-- 7. Helper: Next Member Number Generator (CPR-0001)
CREATE OR REPLACE FUNCTION public.get_next_member_no()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
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
    
    RETURN 'CPR-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Helper: Next Receipt Number Generator (CPR-RCP-000001)
CREATE OR REPLACE FUNCTION public.get_next_receipt_no()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN receipt_no ~ '^CPR-RCP-[0-9]+$' 
                THEN SUBSTRING(receipt_no FROM 9)::INTEGER 
                ELSE 0 
            END
        ), 0
    ) + 1 INTO next_num FROM public.payments;
    
    RETURN 'CPR-RCP-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Secure Public Verification Function (Zero financial/private data exposure)
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

GRANT EXECUTE ON FUNCTION public.get_public_member_verification(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_member_no() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_no() TO authenticated;

-- 10. Row Level Security (RLS) Configuration
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to members"
    ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to renewals"
    ON public.membership_renewals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to payments"
    ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.members FROM anon;
REVOKE ALL ON public.membership_renewals FROM anon;
REVOKE ALL ON public.payments FROM anon;`;

export const SettingsView: React.FC = () => {
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [anonKey, setAnonKey] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Official Library Address and Contact Config
  const [libraryConfig, setLibraryConfig] = useState<LibraryConfig>(getLibraryConfig());
  const [addressSaved, setAddressSaved] = useState<boolean>(false);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setSupabaseUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setLibraryConfig(getLibraryConfig());
  }, []);

  const handleSaveLibraryAddress = (e: React.FormEvent) => {
    e.preventDefault();
    saveLibraryConfig(libraryConfig);
    setAddressSaved(true);
    setTimeout(() => setAddressSaved(false), 3000);
  };

  const handleResetLibraryAddress = () => {
    if (window.confirm('Reset address and phone numbers to official physical banner defaults?')) {
      resetLibraryConfig();
      setLibraryConfig(DEFAULT_LIBRARY_CONFIG);
      setAddressSaved(true);
      setTimeout(() => setAddressSaved(false), 3000);
    }
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: anonKey.trim(),
    });
    setTestResult({
      success: true,
      message: 'Configuration saved! Click "Test Connection" to verify.',
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleClearOverride = () => {
    clearSupabaseConfigOverride();
    const cfg = getSupabaseConfig();
    setSupabaseUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setTestResult(null);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleResetSeed = () => {
    if (window.confirm('Reset local member records to initial CPR Reading Library demo doctors?')) {
      DataService.resetLocalData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            System & Supabase Database Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Supabase PostgreSQL backend, Row Level Security policies, and Vercel production hosting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              isConfigured
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{isConfigured ? 'Supabase Configured' : 'Offline / Demo Store Active'}</span>
          </div>
        </div>
      </div>

      {/* Official Library Physical Address & Contact Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-900 text-amber-300 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Official Library Address & Contact Details</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Active Everywhere
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Printed on Money Receipts (A4 dual vouchers), Membership ID Cards, Public QR verification, and Entrance Scanner.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
              <span>Money Receipt & ID Card</span>
            </span>
          </div>
        </div>

        {addressSaved && (
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">
              Library address and contact details saved successfully! All receipts and ID cards updated.
            </span>
          </div>
        )}

        {/* Current Active Banner Preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Physical Banner Details (Live Print Preview):
          </div>
          <div className="text-xs space-y-1 text-slate-800">
            <div className="font-bold text-emerald-950 text-sm">{libraryConfig.name}</div>
            <div className="font-medium">📍 {libraryConfig.addressBangla}</div>
            <div className="text-[11px] text-slate-600">🏢 ({libraryConfig.addressDetailBangla})</div>
            <div className="font-mono font-bold text-emerald-900 text-xs pt-1">
              📞 মোবাইল / WhatsApp: {libraryConfig.phone1}, {libraryConfig.phone2}
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              ✉ Email: {libraryConfig.email}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveLibraryAddress} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Library Name
              </label>
              <input
                type="text"
                value={libraryConfig.name}
                onChange={(e) => setLibraryConfig({ ...libraryConfig, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Name / Tagline
              </label>
              <input
                type="text"
                value={libraryConfig.tagline}
                onChange={(e) => setLibraryConfig({ ...libraryConfig, tagline: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Address (Bangla - as per Physical Banner)
            </label>
            <input
              type="text"
              value={libraryConfig.addressBangla}
              onChange={(e) => setLibraryConfig({ ...libraryConfig, addressBangla: e.target.value })}
              placeholder="মতি টাওয়ার (৫ম তলা), গুলজার মোড়, চকবাজার, চট্টগ্রাম"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Floor & Landmark Details (Bangla)
            </label>
            <input
              type="text"
              value={libraryConfig.addressDetailBangla}
              onChange={(e) => setLibraryConfig({ ...libraryConfig, addressDetailBangla: e.target.value })}
              placeholder="EBL ব্যাংকের ATM বুথের ডান পাশে লিফটের ৪ তলা"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Mobile / WhatsApp
              </label>
              <input
                type="text"
                value={libraryConfig.phone1}
                onChange={(e) => setLibraryConfig({ ...libraryConfig, phone1: e.target.value, whatsapp: e.target.value })}
                placeholder="01898-938981"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Secondary Mobile Number
              </label>
              <input
                type="text"
                value={libraryConfig.phone2}
                onChange={(e) => setLibraryConfig({ ...libraryConfig, phone2: e.target.value })}
                placeholder="01898-938982"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={libraryConfig.email}
                onChange={(e) => setLibraryConfig({ ...libraryConfig, email: e.target.value })}
                placeholder="cprmedicalacademy@gmail.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Address & Phone Numbers</span>
            </button>

            <button
              type="button"
              onClick={handleResetLibraryAddress}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Reset to Official Banner Defaults
            </button>
          </div>
        </form>
      </div>

      {/* Supabase API Credentials Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-emerald-900 text-amber-300 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Supabase Project Connection
            </h2>
            <p className="text-xs text-slate-500">
              Found in your Supabase Dashboard: <strong>Project Settings → API</strong>
            </p>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold">{testResult.success ? 'Connection Valid' : 'Notice'}</div>
              <div className="mt-0.5">{testResult.message}</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Safe for browser clients. The backend uses Row Level Security (RLS) to enforce administrator privilege. Never expose service_role key here.
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs"
            >
              Save Credentials
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !supabaseUrl || !anonKey}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors disabled:opacity-40"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleClearOverride}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Reset to Env Defaults
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Script Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Supabase SQL Migration Script
              </h2>
              <p className="text-xs text-slate-500">
                Run this once in your Supabase SQL Editor to initialize tables, indexes, RPC and RLS policies.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
          >
            {copiedSql ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="max-h-64 overflow-y-auto bg-slate-950 text-slate-200 p-4 rounded-xl text-[11px] font-mono leading-relaxed border border-slate-800">
            {SQL_MIGRATION_SCRIPT}
          </pre>
        </div>
      </div>

      {/* Step-by-Step Vercel & Supabase Deployment Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <span>Production Deployment Guidelines (Vercel & Supabase)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>1. Supabase Setup</span>
            </h3>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Create a new project at <strong>supabase.com</strong>.</li>
              <li>Open <strong>SQL Editor</strong>, paste the script above, and click <strong>Run</strong>.</li>
              <li>Go to <strong>Authentication → Providers → Email</strong> and toggle off <strong>Enable Signups</strong> to prevent public registration.</li>
              <li>Create your administrator account in <strong>Authentication → Users</strong> (or invite your admin email).</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>2. Vercel Deployment</span>
            </h3>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Import repository into Vercel.</li>
              <li>In <strong>Environment Variables</strong>, set:
                <div className="font-mono text-[10px] bg-white p-1.5 mt-1 rounded border border-slate-200">
                  VITE_SUPABASE_URL = https://xxx.supabase.co<br />
                  VITE_SUPABASE_ANON_KEY = eyJhbGci...<br />
                  VITE_APP_URL = https://your-project.vercel.app
                </div>
              </li>
              <li>Deploy. Member QR codes automatically point to your production verification URL!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Data Management & Seed Reset */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            Demo Data & Storage Reset
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Reset local repository to initial CPR Reading Library Chattogram sample doctors.
          </p>
        </div>

        <button
          onClick={handleResetSeed}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>{resetSuccess ? 'Reset Done!' : 'Reset Demo Records'}</span>
        </button>
      </div>
    </div>
  );
};
