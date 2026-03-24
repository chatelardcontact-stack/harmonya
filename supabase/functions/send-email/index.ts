import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const HELENE_EMAIL = 'contact@harmonyamassage.fr'
const FROM_EMAIL = 'Harmonya <notifications@send.harmonyamassage.fr>'

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
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json()
  const { type, record, old_record } = body

  try {
    // ── Nouveau message d'une cliente ─────────────────
    if (type === 'INSERT' && body.table === 'messages' && !record.de_admin) {
      await sendEmail(
        HELENE_EMAIL,
        `💬 Nouveau message — ${record.sujet || 'Sans objet'}`,
        `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Nouveau message reçu</h2>
          <p style="color:#666;margin:0 0 24px">Une cliente t'a envoyé un message depuis son espace.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:.08em">Message</p>
            <p style="margin:0;color:#1a1a1a;line-height:1.6">${record.contenu}</p>
          </div>
          <a href="https://www.harmonyamassage.fr/admin.html"
             style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
            Répondre dans l'admin →
          </a>
        </div>
        `
      )
    }

    // ── Nouvelle cliente inscrite ─────────────────────
    if (type === 'INSERT' && body.table === 'profiles') {
      await sendEmail(
        HELENE_EMAIL,
        `👤 Nouvelle cliente inscrite`,
        `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Nouvelle cliente inscrite ✨</h2>
          <p style="color:#666;margin:0 0 24px">Une nouvelle cliente vient de créer son espace Harmonya.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#1a1a1a"><strong>Nom :</strong> ${record.nom || ''} ${record.prenom || ''}</p>
            <p style="margin:0;color:#666;font-size:13px">Inscrite le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <a href="https://www.harmonyamassage.fr/admin.html"
             style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
            Voir dans l'admin →
          </a>
        </div>
        `
      )
    }

    // ── RDV annulé ────────────────────────────────────
    if (type === 'UPDATE' && body.table === 'rendez_vous' &&
        record.statut === 'annulé' && old_record?.statut !== 'annulé') {
      await sendEmail(
        HELENE_EMAIL,
        `❌ RDV annulé — ${record.prestation}`,
        `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <img src="https://www.harmonyamassage.fr/logo-removebg-preview.png" style="height:40px;margin-bottom:24px;filter:invert(1)" alt="Harmonya">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Rendez-vous annulé</h2>
          <div style="background:#fff3f3;border:1px solid #ffd0d0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;color:#1a1a1a"><strong>Soin :</strong> ${record.prestation}</p>
            <p style="margin:0 0 6px;color:#1a1a1a"><strong>Date :</strong> ${record.date} à ${record.heure?.substring(0,5) || ''}</p>
            <p style="margin:0;color:#e05555;font-size:13px">⚠️ Ce créneau est maintenant disponible</p>
          </div>
          <a href="https://www.harmonyamassage.fr/admin.html"
             style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-size:14px;display:inline-block">
            Voir le planning →
          </a>
        </div>
        `
      )
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
