# Configuration Espace Client Harmonya
## 3 étapes à faire une seule fois

---

## ÉTAPE 1 — Base de données Supabase

1. Va sur **https://supabase.com** → ton projet → **SQL Editor**
2. Colle le contenu du fichier `setup-supabase.sql` dans l'éditeur
3. Clique **Run** — toutes les tables et règles de sécurité sont créées automatiquement

---

## ÉTAPE 2 — Connexion Google OAuth

### Dans Google Cloud Console
1. Va sur **https://console.cloud.google.com**
2. Crée un projet (ou utilise un existant)
3. APIs & Services → **Identifiants** → Créer des identifiants → **ID client OAuth 2.0**
4. Type d'application : **Application Web**
5. Origines JS autorisées : `https://ton-domaine.com`
6. URI de redirection autorisés : `https://qewdympkbxbevgmbfxfd.supabase.co/auth/v1/callback`
7. Copie le **Client ID** et le **Client Secret**

### Dans Supabase
1. Dashboard → **Authentication** → **Providers**
2. Active **Google**
3. Colle le Client ID et Client Secret Google
4. Sauvegarde

---

## ÉTAPE 3 — URL du site dans Supabase

1. Dashboard → **Authentication** → **URL Configuration**
2. **Site URL** : `https://ton-domaine.com` (ou l'URL où tu héberges le site)
3. **Redirect URLs** : ajoute `https://ton-domaine.com/espace-client.html`

---

## Pour ajouter des données clients (RDV, documents, factures)

Dans Supabase → **Table Editor**, tu peux insérer des données directement.
Pour la messagerie, tu peux répondre depuis le **Table Editor** en insérant dans `messages` avec `de_admin = true`.

---

## Fichiers créés
- `espace-client.html` — page espace client complète
- `setup-supabase.sql` — script base de données
- `SETUP-ESPACE-CLIENT.md` — ce guide
