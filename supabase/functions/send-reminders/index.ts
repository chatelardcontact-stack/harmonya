import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = 'Harmonya <notifications@harmonyamassage.fr>'

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

function frenchDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

serve(async (req) => {
  // Allow GET for manual triggering from cron, POST for webhook
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Fetch all confirmed/pending RDVs for tomorrow that have a client email
    const { data: rdvs, error } = await sb
      .from('rendez_vous')
      .select('*')
      .eq('date', tomorrowStr)
      .in('statut', ['confirmé', 'en_attente'])
      .not('client_email', 'is', null)

    if (error) throw error

    let sent = 0
    const results = []

    for (const rdv of rdvs || []) {
      const prenom = rdv.client_prenom || 'Cliente'
      const dateLabel = frenchDate(rdv.date)
      const heureLabel = rdv.heure ? rdv.heure.substring(0, 5) : '—'
      const lieu = rdv.lieu === 'domicile'
        ? `À domicile — ${rdv.adresse_domicile || 'votre adresse'}`
        : 'Au cabinet · 1A rue de la Poste, 67400 Illkirch-Graffenstaden'

      const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#1a1614;color:#e8ddd0;padding:40px 32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:28px;"><span style="font-size:1.6rem;letter-spacing:.12em;color:#c9a96e;">HARMONYA</span></div>
        <h2 style="font-size:1.3rem;margin-bottom:8px;">Rappel — Votre séance demain 🌿</h2>
        <p style="color:rgba(232,221,208,.75);line-height:1.8;">Bonjour <strong>${prenom}</strong>,</p>
        <p style="color:rgba(232,221,208,.75);line-height:1.8;">Nous vous rappelons que votre séance est prévue pour <strong>demain</strong>.</p>
        <div style="background:rgba(201,169,110,.08);border:1px solid rgba(201,169,110,.2);border-radius:8px;padding:18px 20px;margin:20px 0;">
          <div style="color:#c9a96e;font-weight:600;font-size:1rem;margin-bottom:10px;">${rdv.prestation || 'Soin Harmonya'}</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:.88rem;color:rgba(232,221,208,.75);">
            <div>📅 <strong>${dateLabel}</strong></div>
            <div>🕐 <strong>${heureLabel}</strong></div>
            <div>📍 ${lieu}</div>
            ${rdv.frais_km ? `<div>🚗 Frais de déplacement : ${rdv.frais_km}€</div>` : ''}
          </div>
        </div>
        <p style="color:rgba(232,221,208,.6);font-size:.85rem;line-height:1.7;">En cas d'empêchement, merci de nous prévenir le plus tôt possible au <a href="tel:0626142589" style="color:#c9a96e;">06 26 14 25 89</a>.</p>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,.06);text-align:center;">
          <p style="color:rgba(232,221,208,.4);font-size:.75rem;">Harmonya · Institut de massage premium · Illkirch-Graffenstaden</p>
          <p style="color:rgba(232,221,208,.4);font-size:.75rem;">À demain 💛</p>
        </div>
      </div>`

      const result = await sendEmail(
        rdv.client_email,
        `⏰ Rappel — Votre séance Harmonya demain à ${heureLabel}`,
        html
      )
      results.push({ email: rdv.client_email, rdv_id: rdv.id, result })
      sent++
    }

    return new Response(
      JSON.stringify({ success: true, sent, date: tomorrowStr, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-reminders error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
