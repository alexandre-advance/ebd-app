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

    const { userId } = await req.json()

    // 1. Delete from profiles first
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Profile Delete Error:', profileError)
      return new Response(JSON.stringify({ error: `Erro ao excluir perfil: ${profileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Delete from Auth
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Auth Delete Error:', authError)
      return new Response(JSON.stringify({ error: `Erro ao excluir usuário no Auth: ${authError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Unexpected Delete Function Error:', error)
    const message = error.message || String(error)
    return new Response(JSON.stringify({ error: `Erro inesperado na exclusão: ${message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
