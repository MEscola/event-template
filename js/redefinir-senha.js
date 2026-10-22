document.addEventListener("DOMContentLoaded", async () => {
  const mensagem = document.getElementById("mensagem");
  const formulario = document.getElementById("form-senha");
  const campoSenha = document.getElementById("nova-senha");
  const campoConfirmar = document.getElementById("confirmar-senha");

  // Usa o cliente Supabase já criado em js/supabase.js.
  const supabase = window._supabase;

  if (!supabase) {
    mensagem.textContent =
      "Não foi possível conectar ao Supabase. Verifique js/supabase.js.";
    return;
  }

  mensagem.textContent = "Validando link de recuperação...";

  try {
    // O Supabase pode devolver os tokens no fragmento da URL.
    const hash = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const tipo = hash.get("type");

    if (accessToken && refreshToken && tipo === "recovery") {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) throw error;
    } else {
      // Também aceita o fluxo PKCE, que usa um código na query string.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
          throw new Error(
            "Link inválido ou expirado. Solicite um novo e-mail de recuperação."
          );
        }
      }
    }

    mensagem.textContent = "Link validado. Defina sua nova senha.";
    formulario.hidden = false;
  } catch (erro) {
    console.error("Erro ao validar recuperação:", erro);

    mensagem.textContent =
      erro.message ||
      "Não foi possível validar o link. Solicite outro e-mail de recuperação.";
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const senha = campoSenha.value;
    const confirmar = campoConfirmar.value;

    if (senha.length < 8) {
      mensagem.textContent =
        "A senha deve ter pelo menos 8 caracteres.";
      return;
    }

    if (senha !== confirmar) {
      mensagem.textContent = "As senhas não coincidem.";
      return;
    }

    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    mensagem.textContent = "Salvando nova senha...";

    try {
      const { error } = await supabase.auth.updateUser({
        password: senha
      });

      if (error) throw error;

      mensagem.textContent =
        "Senha alterada com sucesso! Você já pode voltar ao painel administrativo.";

      formulario.reset();
      formulario.hidden = true;

      await supabase.auth.signOut();
    } catch (erro) {
      console.error("Erro ao alterar senha:", erro);

      mensagem.textContent =
        erro.message || "Não foi possível alterar a senha.";
    } finally {
      botao.disabled = false;
    }
  });
});
