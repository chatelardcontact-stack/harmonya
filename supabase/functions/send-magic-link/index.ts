import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL       = 'Harmonya <notifications@harmonyamassage.fr>'
const SITE_URL         = 'https://www.harmonyamassage.fr'

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

// Escape special HTML characters to prevent injection in email bodies
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
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return res.json()
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
    const { email, prenom, redirectTo } = await req.json()

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Sanitize user-provided name — only display as text in email HTML
    const safeName = escHtml(
      (prenom || '').trim().substring(0, 80)  // cap length
    )

    // Validate redirectTo — only allow known origins
    const safeRedirectTo = (() => {
      const fallback = `${SITE_URL}/espace-client.html`
      if (!redirectTo) return fallback
      try {
        const url = new URL(redirectTo)
        const allowed = CORS_ORIGINS.some(o => redirectTo.startsWith(o))
        return allowed ? redirectTo : fallback
      } catch { return fallback }
    })()

    // Use service role to generate magic link
    const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await sbAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: safeRedirectTo,
        data: { full_name: safeName }
      }
    })

    if (error) throw error

    const magicLink = data?.properties?.action_link
    if (!magicLink) throw new Error('No magic link generated')

    // Validate the magic link is a real Supabase URL before embedding it in email
    if (!magicLink.startsWith('https://')) throw new Error('Invalid magic link format')

    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#1a1614;color:#e8ddd0;padding:40px 32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="font-size:1.6rem;letter-spacing:.12em;color:#c9a96e;">HARMONYA</span>
      </div>
      <h2 style="font-size:1.3rem;margin-bottom:8px;">Votre espace client 🌿</h2>
      <p style="color:rgba(232,221,208,.75);line-height:1.8;">Bonjour <strong>${safeName || 'Cliente'}</strong>,</p>
      <p style="color:rgba(232,221,208,.75);line-height:1.8;">
        Cliquez sur le bouton ci-dessous pour accéder à votre espace personnel Harmonya —
        retrouvez vos rendez-vous, documents et l'historique de vos soins.
      </p>
      <a href="${magicLink}" style="display:block;background:#c9a96e;color:#1a1614;text-align:center;padding:16px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem;margin:24px 0;">
        Accéder à mon espace →
      </a>
      <p style="color:rgba(232,221,208,.5);font-size:.8rem;text-align:center;">
        Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.<br>
        Si vous n'avez pas demandé ce lien, ignorez simplement cet email.
      </p>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,.06);text-align:center;">
        <p style="color:rgba(232,221,208,.4);font-size:.75rem;">Harmonya · Institut de massage premium · Illkirch-Graffenstaden</p>
      </div>
    </div>`

    const result = await sendEmail(
      email,
      '🌿 Votre accès à l\'espace client Harmonya',
      html
    )

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-magic-link error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
