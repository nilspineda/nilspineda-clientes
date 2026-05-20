import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  try {
    const { user_id, new_password } = await req.json()

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "Faltan user_id o new_password" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: "Contraseña actualizada" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})