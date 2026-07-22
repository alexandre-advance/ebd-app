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
  category TEXT NOT NULL CHECK (category IN ('INFANTIL', 'ADOLESCENTE', 'JOVENS', 'ADULTOS')),
  subcategory TEXT, -- ex: 0-5, 6-8, 12-14, 18-99
  min_age INTEGER NOT NULL DEFAULT 0,
  max_age INTEGER NOT NULL DEFAULT 99,
  marital_status TEXT CHECK (marital_status IN ('solteiro', 'casado', 'qualquer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to validate student age and marital status against room settings
CREATE OR REPLACE FUNCTION validate_student_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  room_category TEXT;
  room_min_age INTEGER;
  room_max_age INTEGER;
  room_marital_status TEXT;
  student_age INTEGER;
BEGIN
  -- Get room details
  SELECT category, min_age, max_age, marital_status 
  INTO room_category, room_min_age, room_max_age, room_marital_status
  FROM rooms 
  WHERE id = NEW.room_id;

  -- Calculate age (in years)
  student_age := date_part('year', age(NEW.birth_date));

  -- Validate Age
  IF student_age < room_min_age OR student_age > room_max_age THEN
    RAISE EXCEPTION 'A idade do aluno (%) estÃ¡ fora da faixa permitida para esta sala (%-% anos).', student_age, room_min_age, room_max_age;
  END IF;

  -- Validate Marital Status
  IF room_marital_status IS NOT NULL AND room_marital_status != 'qualquer' THEN
    IF LOWER(NEW.marital_status) != room_marital_status THEN
      RAISE EXCEPTION 'O estado civil do aluno (%) nÃ£o Ã© compatÃvel com esta sala (exige %).', NEW.marital_status, room_marital_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate before insert or update on students
CREATE TRIGGER tr_validate_student_enrollment
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION validate_student_enrollment();

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
