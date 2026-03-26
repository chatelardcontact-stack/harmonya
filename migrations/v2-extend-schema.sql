-- Harmonya v2 Schema Extension

-- Add columns to rendez_vous table
ALTER TABLE public.rendez_vous
  ADD COLUMN IF NOT EXISTS lieu TEXT DEFAULT 'cabinet',
  ADD COLUMN IF NOT EXISTS adresse_domicile TEXT,
  ADD COLUMN IF NOT EXISTS frais_km DECIMAL(10,2) DEFAULT 0;

-- Add columns to factures table
ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS rdv_id UUID REFERENCES public.rendez_vous(id),
  ADD COLUMN IF NOT EXISTS forfait_id UUID,
  ADD COLUMN IF NOT EXISTS frais_km DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envoyee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS envoyee_le TIMESTAMPTZ;

-- Table for contracts (cures/forfaits)
CREATE TABLE IF NOT EXISTS public.contrats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  forfait_id UUID,
  prestation TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  plan_paiement TEXT DEFAULT '1x',
  echances JSONB DEFAULT '[]',
  contenu_html TEXT,
  signature_data TEXT,
  signe_le TIMESTAMPTZ,
  statut TEXT DEFAULT 'en_attente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for cure tracking (séances avec photos)
CREATE TABLE IF NOT EXISTS public.suivi_seances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  forfait_id UUID NOT NULL,
  numero INT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for calendar availability blocking
CREATE TABLE IF NOT EXISTS public.disponibilites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  type TEXT DEFAULT 'bloquee',
  motif TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for contrats
ALTER TABLE public.contrats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view their own contracts" ON public.contrats
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Admin can manage contracts" ON public.contrats
  FOR ALL USING (auth.jwt() ->> 'email' = ANY(ARRAY['massage.harmonya@gmail.com', 'contact@harmonyamassage.fr']));

-- RLS Policies for suivi_seances
ALTER TABLE public.suivi_seances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view their own cure tracking" ON public.suivi_seances
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Admin can manage cure tracking" ON public.suivi_seances
  FOR ALL USING (auth.jwt() ->> 'email' = ANY(ARRAY['massage.harmonya@gmail.com', 'contact@harmonyamassage.fr']));

-- RLS Policies for disponibilites (read-only for clients, full access for admin)
ALTER TABLE public.disponibilites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view availability" ON public.disponibilites
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage availability" ON public.disponibilites
  FOR ALL USING (auth.jwt() ->> 'email' = ANY(ARRAY['massage.harmonya@gmail.com', 'contact@harmonyamassage.fr']));
