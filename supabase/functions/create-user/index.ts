import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { email, password, full_name, role, church_id, congregation_id } = body

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes: email, password, full_name, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with error object so frontend can read it easily
      })
    }

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    })

    if (authError) {
      console.error('Auth Error:', authError)
      return new Response(JSON.stringify({ error: `Erro no Auth: ${authError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (authData.user) {
      // 2. Insert into profiles (using upsert to handle potential trigger-created profiles)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: full_name,
          email,
          role,
          church_id: church_id || null,
          congregation_id: congregation_id || null,
          created_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Profile Error:', profileError)
        return new Response(JSON.stringify({ error: `Erro no Perfil: ${profileError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ error: "Falha ao criar usuário" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error: any) {
    console.error('Unexpected Function Error:', error)
    const message = error.message || String(error)
    return new Response(JSON.stringify({ error: `Erro inesperado: ${message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
