import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')!
const WEBHOOK_SECRET    = Deno.env.get('SEND_EMAIL_WEBHOOK_SECRET') || ''
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const HELENE_EMAIL      = 'contact@harmonyamassage.fr'
const FROM_EMAIL        = 'Harmonya <notifications@harmonyamassage.fr>'

// Allowed direct recipients — only Harmonya addresses or validated client emails
const ADMIN_EMAILS = [HELENE_EMAIL, 'massage.harmonya@gmail.com']

const CORS_ORIGINS = [
  'https://www.harmonyamassage.fr',
  'https://harmonyamassage.fr',
  'https://harmonya.vercel.app',
]

function corsHeaders(origin: string | null) {
  const allowed = origin && CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// Simple HTML sanitizer — strips <script> and javascript: from email bodies
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Escape for safe HTML text node insertion
function escHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html: sanitizeHtml(html) }),
  })
  return res.json()
}

// Validate that a "to" address is either admin or a real client email in our DB
async function isAllowedRecipient(email: string): Promise<boolean> {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return true
  // Check that this email exists in rendez_vous (is a real client)
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data } = await sb
    .from('rendez_vous')
    .select('id')
    .eq('client_email', email)
    .limit(1)
    .maybeSingle()
  return !!data
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors   = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  try {
    const body = await req.json()
    const { type, record, old_record } = body

    // ── MODE A: Database webhook events ─────────────────────────────────
    // Triggered by Supabase database webhooks; verify shared secret
    if (type && record) {
      const providedSecret = req.headers.get('x-webhook-secret') || body._secret || ''
      if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors })
      }

      // ── Nouveau message d'une cliente ─────────────────
      if (type === 'INSERT' && body.table === 'messages' && !record.de_admin) {
        await sendEmail(
          HELENE_EMAIL,
          `💬 Nouveau message — ${escHtml(record.sujet || 'Sans objet')}`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
            <h2 style="color:#1a1a1a;margin:0 0 8px">Nouveau message reçu</h2>
            <p style="color:#666;margin:0 0 24px">Une cliente t'a envoyé un message depuis son espace.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:.08em">Message</p>
              <p style="margin:0;color:#1a1a1a;line-height:1.6">${escHtml(record.contenu)}</p>
            </div>
            <a href="https://www.harmonyamassage.fr/admin.html"
               style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
              Répondre dans l'admin →
            </a>
          </div>`
        )
      }

      // ── Nouvelle cliente inscrite ─────────────────────
      if (type === 'INSERT' && body.table === 'profiles') {
        await sendEmail(
          HELENE_EMAIL,
          `👤 Nouvelle cliente inscrite`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
            <h2 style="color:#1a1a1a;margin:0 0 8px">Nouvelle cliente inscrite ✨</h2>
            <p style="color:#666;margin:0 0 24px">Une nouvelle cliente vient de créer son espace Harmonya.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;color:#1a1a1a"><strong>Nom :</strong> ${escHtml(record.nom || '')} ${escHtml(record.prenom || '')}</p>
              <p style="margin:0;color:#666;font-size:13px">Inscrite le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <a href="https://www.harmonyamassage.fr/admin.html"
               style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
              Voir dans l'admin →
            </a>
          </div>`
        )
      }

      // ── RDV annulé ────────────────────────────────────
      if (type === 'UPDATE' && body.table === 'rendez_vous' &&
          record.statut === 'annulé' && old_record?.statut !== 'annulé') {
        await sendEmail(
          HELENE_EMAIL,
          `❌ RDV annulé — ${escHtml(record.prestation)}`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
            <h2 style="color:#1a1a1a;margin:0 0 8px">Rendez-vous annulé</h2>
            <div style="background:#fff3f3;border:1px solid #ffd0d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#1a1a1a"><strong>Soin :</strong> ${escHtml(record.prestation)}</p>
              <p style="margin:0 0 6px;color:#1a1a1a"><strong>Date :</strong> ${escHtml(record.date)} à ${escHtml(record.heure?.substring(0,5) || '')}</p>
              <p style="margin:0;color:#e05555;font-size:13px">⚠️ Ce créneau est maintenant disponible</p>
            </div>
            <a href="https://www.harmonyamassage.fr/admin.html"
               style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
              Voir le planning →
            </a>
          </div>`
        )
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors })
    }

    // ── MODE B: Direct invocation from frontend ──────────────────────────
    // Requires: to (validated), subject, html
    const { to, subject, html } = body
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing to/subject/html' }), { status: 400, headers: cors })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: cors })
    }

    // Recipient allowlist — must be admin OR a real client in our DB
    const allowed = await isAllowedRecipient(to)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Recipient not allowed' }), { status: 403, headers: cors })
    }

    const result = await sendEmail(to, subject, html)
    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: cors })

  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
})
