-- EBD Digital - Database Schema (PostgreSQL / Supabase)
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. Churches (Tenants)
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled')),
  subscription_plan TEXT NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Congregations
CREATE TABLE IF NOT EXISTS congregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rooms (Classes)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Students (ALUNOS - Apenas registros, sem login)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  marital_status TEXT CHECK (marital_status IN ('Solteiro', 'Casado', 'Outro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance_count INTEGER DEFAULT 0, -- frequência
  visitors_count INTEGER DEFAULT 0, -- visitantes
  bibles_count INTEGER DEFAULT 0, -- bíblias
  magazines_count INTEGER DEFAULT 0, -- revistas
  offerings_amount DECIMAL(10,2) DEFAULT 0.00, -- ofertas
  is_draft BOOLEAN DEFAULT true, -- permitir salvar parcialmente
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Profiles (Usuários com login)
-- Vinculado à tabela auth.users do Supabase
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID REFERENCES churches(id),
  congregation_id UUID REFERENCES congregations(id),
  name TEXT,
  role TEXT CHECK (role IN ('ADMIN_APP', 'ADMIN_MASTER', 'SECRETARIO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Attendance (Frequência Nominal)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(lesson_id, student_id)
);

-- Nota: RLS (Row Level Security) não foi implementado conforme solicitado.
-- Todas as tabelas estão abertas para operações conforme as chaves de API permitirem.
