// Copie este arquivo para js/supabase.js
// e preencha com os dados do seu projeto Supabase.

// Importante:
// - Use somente a chave pública anon ou publishable no frontend.
// - Nunca coloque uma chave service_role ou secret no navegador.
// - Configure corretamente as políticas RLS do banco.
// - O arquivo js/supabase.js deve permanecer fora do Git.

const SUPABASE_URL = "SUA_SUPABASE_URL";
const SUPABASE_ANON_KEY = "SUA_CHAVE_PUBLICA_ANON";

const _supabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
