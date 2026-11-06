// =====================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// =====================================================

async function validarAdministrador() {
  try {
    const {
      data: { user },
      error
    } = await _supabase.auth.getUser();

    if (error || !user) {
      alternarTelaLogada(false);
      return false;
    }

    // Verifica se o usuário é administrador
    const { data: ehAdmin, error: erroAdmin } =
      await _supabase.rpc("is_admin");

    if (erroAdmin || ehAdmin !== true) {
      await _supabase.auth.signOut();
      alternarTelaLogada(false);

      mostrarMensagem(
        "Seu usuário não tem permissão de administrador.",
        "erro"
      );

      return false;
    }

    // Consulta o perfil do administrador autenticado
    const { data: perfil, error: erroPerfil } =
      await _supabase.rpc("meu_perfil_admin");

    if (erroPerfil || !perfil) {
      console.error("Erro ao consultar perfil:", erroPerfil);

      await _supabase.auth.signOut();
      alternarTelaLogada(false);

      mostrarMensagem(
        "Não foi possível identificar seu cadastro de administrador.",
        "erro"
      );

      return false;
    }

    // Verifica se o administrador está ativo
    if (perfil.ativo !== true) {
      await _supabase.auth.signOut();
      alternarTelaLogada(false);

      mostrarMensagem(
        "Seu acesso está inativo. Procure o administrador principal.",
        "erro"
      );

      return false;
    }

    // Guarda os dados do administrador para uso no painel
    window.perfilAdministrador = perfil;

    // Por enquanto, ainda não implementamos a tela de troca de senha.
    // Vamos tratar essa condição na próxima etapa.

    alternarTelaLogada(true);

    return true;

  } catch (erro) {
    console.error("Erro ao validar administrador:", erro);

    alternarTelaLogada(false);

    mostrarMensagem(
      "Não foi possível validar o acesso. Tente novamente.",
      "erro"
    );

    return false;
  }
}

async function entrarNoPainel(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const identificador = document
    .getElementById("login-email")
    ?.value.trim();

  const senha = document.getElementById("login-senha")?.value;
  const botao = document.getElementById("btn-login");

  if (!identificador || !senha) {
    mostrarMensagem("Informe seu e-mail ou nome de usuário e sua senha.", "erro");
    return;
  }

  // Converte alias em e-mail interno
  let emailLogin = identificador;

  if (!identificador.includes("@")) {
    const alias = identificador.toLowerCase();

    const aliasValido = /^[a-z0-9._-]{3,30}$/.test(alias);

    if (!aliasValido) {
      mostrarMensagem("Informe um alias válido.", "erro");
      return;
    }

    emailLogin = `${alias}@confra.invalid`;
  }

  if (botao) botao.disabled = true;

  try {
    const { error } = await _supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senha
    });

    if (error) {
      mostrarMensagem(
        "Não foi possível entrar. Confira o e-mail ou alias e a senha.",
        "erro"
      );
      return;
    }

    const autorizado = await validarAdministrador();

if (!autorizado) return;

// Verifica se o administrador logado é o principal
await configurarAcessoAdministradores();

mostrarMensagem("Login realizado com sucesso.");
await carregarPainelADM(false);

  } catch (erro) {
    console.error("Erro no login:", erro);

    mostrarMensagem(
      "Ocorreu um erro ao tentar entrar no painel.",
      "erro"
    );

  } finally {
    if (botao) botao.disabled = false;
  }
}

// Mostrar ou ocultar senha
function configurarMostrarSenha() {
  const campoSenha = document.getElementById("login-senha");
  const botao = document.getElementById("btn-mostrar-senha");

  if (!campoSenha || !botao) return;

  botao.addEventListener("click", () => {
    const mostrar = campoSenha.type === "password";

    campoSenha.type = mostrar ? "text" : "password";
    botao.textContent = mostrar ? "Ocultar" : "Mostrar";
    botao.setAttribute(
      "aria-label",
      mostrar ? "Ocultar senha" : "Mostrar senha"
    );
    botao.setAttribute("aria-pressed", String(mostrar));
  });
}

// Recuperação de senha
async function recuperarSenha() {
  ocultarMensagem();

  const campoEmail = document.getElementById("login-email");
  const botao = document.getElementById("btn-esqueci-senha");
  const email = campoEmail?.value.trim();

  if (!email) {
    mostrarMensagem(
      "Digite seu e-mail para receber o link de recuperação.",
      "erro"
    );
    campoEmail?.focus();
    return;
  }

  if (botao) botao.disabled = true;

  try {
    const caminhoAtual = window.location.pathname;
    const pastaAtual = caminhoAtual.slice(
      0,
      caminhoAtual.lastIndexOf("/") + 1
    );

    const urlRedefinicao =
      `${window.location.origin}${pastaAtual}redefinir-senha.html`;

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: urlRedefinicao
    });

    if (error) throw error;

    mostrarMensagem(
      "Se esse e-mail estiver cadastrado, você receberá as instruções para redefinir a senha. Confira também a caixa de spam."
    );
  } catch (erro) {
    console.error("Erro ao solicitar recuperação:", erro);

    mostrarMensagem(
      "Não foi possível solicitar a recuperação. Verifique as configurações de URL do Supabase e tente novamente.",
      "erro"
    );
  } finally {
    if (botao) botao.disabled = false;
  }
}

async function sairDoPainel() {
  try {
    const { error } = await _supabase.auth.signOut();
    if (error) throw error;

    arrecadacaoTotal = 0;
    despesasTotal = 0;
    inscricoesCache.clear();

    const campoBusca = document.getElementById("buscar-inscricao");
    const painelBusca = document.getElementById("painel-busca-inscricoes");
    const botaoBusca = document.getElementById("btn-toggle-busca");

    if (campoBusca) campoBusca.value = "";

    if (painelBusca) painelBusca.hidden = true;

    if (botaoBusca) {
      botaoBusca.setAttribute("aria-expanded", "false");
      botaoBusca.setAttribute("aria-label", "Localizar cadastro");
      botaoBusca.title = "Localizar cadastro";
    }

    atualizarIndicadoresFinanceiros();

    const indicadorPessoas = document.getElementById("indicador-pessoas");
    if (indicadorPessoas) indicadorPessoas.textContent = "0";

    window.perfilAdministrador = null;

    alternarTelaLogada(false);
    mostrarMensagem("Você saiu do painel.");
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    mostrarMensagem("Não foi possível encerrar a sessão.", "erro");
  }
}

// =====================================================
// EVENTOS DE AUTENTICAÇÃO
// =====================================================

function configurarEventosAuth() {
  document
    .getElementById("form-login")
    ?.addEventListener("submit", entrarNoPainel);

  configurarMostrarSenha();

  document
    .getElementById("btn-esqueci-senha")
    ?.addEventListener("click", recuperarSenha);

  document
    .getElementById("btn-sair")
    ?.addEventListener("click", sairDoPainel);
}