import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json()
  const event = body.event

  if (event === 'invitee.created') {
    const payload    = body.payload
    const invitee    = payload.invitee
    const eventInfo  = payload.event
    const eventType  = payload.event_type
    const email      = invitee.email
    const startTime  = new Date(eventInfo.start_time)
    const prestation = eventType.name
    const duration   = eventType.duration
    const eventUri   = eventInfo.uri
    const date       = startTime.toISOString().split('T')[0]
    const heure      = startTime.toTimeString().substring(0, 8)

    const { data: clientId } = await supabase.rpc('get_user_id_by_email', { p_email: email })

    const rdvData: Record<string, unknown> = {
      date, heure, prestation,
      statut: 'confirmé',
      notes: `${duration} min`,
      calendly_uri: eventUri
    }
    if (clientId) rdvData.client_id = clientId

    const { error } = await supabase
      .from('rendez_vous')
      .upsert(rdvData, { onConflict: 'calendly_uri' })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  if (event === 'invitee.canceled') {
    const eventUri = body.payload?.event?.uri
    if (eventUri) await supabase.from('rendez_vous').update({ statut: 'annulé' }).eq('calendly_uri', eventUri)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  return new Response(JSON.stringify({ ok: true, ignored: event }), { status: 200 })
})
