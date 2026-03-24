-- =====================================================
--  HARMONYA — Espace Client Supabase Schema
--  Coller ce script dans Supabase → SQL Editor → Run
-- =====================================================

-- 1. TABLE PROFILES (liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom         TEXT,
  prenom      TEXT,
  telephone   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE RENDEZ-VOUS
CREATE TABLE IF NOT EXISTS public.rendez_vous (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  heure       TIME NOT NULL,
  prestation  TEXT NOT NULL,
  statut      TEXT DEFAULT 'confirmé' CHECK (statut IN ('confirmé','en_attente','annulé','terminé')),
  notes       TEXT,
  prix        DECIMAL(10,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('fiche_sante','consentement','compte_rendu','autre')),
  storage_path TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contenu     TEXT NOT NULL,
  de_admin    BOOLEAN DEFAULT FALSE,
  lu          BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE FACTURES
CREATE TABLE IF NOT EXISTS public.factures (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  numero      TEXT NOT NULL,
  prestation  TEXT NOT NULL,
  montant     DECIMAL(10,2) NOT NULL,
  date        DATE NOT NULL,
  statut      TEXT DEFAULT 'payée' CHECK (statut IN ('payée','en_attente','annulée')),
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendez_vous ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures    ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Voir son profil"      ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Modifier son profil"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Créer son profil"     ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RDV
CREATE POLICY "Voir ses RDV"         ON public.rendez_vous FOR SELECT USING (auth.uid() = client_id);

-- Documents
CREATE POLICY "Voir ses documents"   ON public.documents FOR SELECT USING (auth.uid() = client_id);

-- Messages
CREATE POLICY "Voir ses messages"    ON public.messages FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Envoyer un message"   ON public.messages FOR INSERT WITH CHECK (auth.uid() = client_id AND de_admin = FALSE);
CREATE POLICY "Marquer comme lu"     ON public.messages FOR UPDATE USING (auth.uid() = client_id);

-- Factures
CREATE POLICY "Voir ses factures"    ON public.factures FOR SELECT USING (auth.uid() = client_id);

-- ── Trigger : créer profil auto à l'inscription ────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nom, prenom, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
    COALESCE(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1), ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Activer Realtime pour les messages ─────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
