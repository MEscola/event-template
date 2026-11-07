// js/supabase.js

// Substitua com as credenciais que você copiou do painel web do Supabase
const SUPABASE_URL = "https://gmpzyjannvmmwyseguef.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mFm5owARgrRr6-i84PKziw_JFcjmS-R";

// Cria e expõe o cliente para o ecossistema do front
window._supabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);