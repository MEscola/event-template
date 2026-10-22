
let arrecadacaoTotal = 0;
let despesasTotal = 0;

const inscricoesCache = new Map();
const MAX_ACOMPANHANTES = 30;

// =====================================================
// UTILITÁRIOS
// =====================================================

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entidades[caractere];
  });
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function mostrarMensagem(texto, tipo = "sucesso") {
  const elemento = document.getElementById("mensagem-admin");
  if (!elemento) return;

  elemento.textContent = texto;
  elemento.className = `message ${
    tipo === "erro" ? "message-error" : "message-info"
  }`;
  elemento.style.display = "block";
}

function ocultarMensagem() {
  const elemento = document.getElementById("mensagem-admin");
  if (!elemento) return;

  elemento.textContent = "";
  elemento.className = "";
  elemento.style.display = "none";
}

function atualizarIndicadoresFinanceiros() {
  const arrecadado = document.getElementById("indicador-arrecadado");
  const despesas = document.getElementById("indicador-despesas");
  const saldo = document.getElementById("indicador-saldo");

  if (arrecadado) {
    arrecadado.textContent = formatarMoeda(arrecadacaoTotal);
  }

  if (despesas) {
    despesas.textContent = formatarMoeda(despesasTotal);
  }

  if (saldo) {
    saldo.textContent = formatarMoeda(arrecadacaoTotal - despesasTotal);
  }
}

function alternarTelaLogada(logado, email = "") {
  const telaLogin = document.getElementById("tela-login");
  const painel = document.getElementById("painel-admin");
  const identificacao = document.getElementById("admin-identificado");

  if (telaLogin) {
    telaLogin.style.display = logado ? "none" : "block";
  }

  if (painel) {
    painel.style.display = logado ? "block" : "none";
  }

  if (identificacao) {
    identificacao.textContent = logado
      ? `Administrador: ${email}`
      : "";
  }
}

function mensagemErroBanco(erro, mensagemPadrao) {
  console.error(mensagemPadrao, erro);

  const mensagemBanco = erro?.message;

  if (
    mensagemBanco &&
    (
      mensagemBanco.includes("Acesso negado") ||
      mensagemBanco.includes("Inscrição") ||
      mensagemBanco.includes("acompanhante") ||
      mensagemBanco.includes("titular") ||
      mensagemBanco.includes("idade") ||
      mensagemBanco.includes("limite") ||
      mensagemBanco.includes("preços") ||
      mensagemBanco.includes("pagamento")
    )
  ) {
    mostrarMensagem(mensagemBanco, "erro");
  } else {
    mostrarMensagem(mensagemPadrao, "erro");
  }
}

// =====================================================
// BUSCA DE INSCRIÇÕES
// =====================================================

function aplicarFiltroInscricoes() {
  const campoBusca = document.getElementById("buscar-inscricao");
  const tabela = document.getElementById("tabela-inscricoes");
  const contador = document.getElementById("contador-inscricoes");

  if (!campoBusca || !tabela) return;

  const termo = normalizarTexto(campoBusca.value);
  const linhas = [...tabela.querySelectorAll("tr[data-search]")];

  let encontrados = 0;

  linhas.forEach((linha) => {
    const textoCadastro = normalizarTexto(linha.dataset.search);
    const corresponde = textoCadastro.includes(termo);

    linha.hidden = !corresponde;

    if (corresponde) {
      encontrados++;
    }
  });

  let linhaSemResultados = document.getElementById(
    "linha-sem-resultados"
  );

  if (linhas.length > 0 && encontrados === 0) {
    if (!linhaSemResultados) {
      linhaSemResultados = document.createElement("tr");
      linhaSemResultados.id = "linha-sem-resultados";

      const celula = document.createElement("td");
      celula.colSpan = 6;

      linhaSemResultados.appendChild(celula);
      tabela.appendChild(linhaSemResultados);
    }

    linhaSemResultados.hidden = false;

    linhaSemResultados.querySelector("td").textContent =
      `Nenhum cadastro encontrado para "${campoBusca.value.trim()}".`;
  } else if (linhaSemResultados) {
    linhaSemResultados.hidden = true;
  }

  if (contador) {
    contador.textContent = termo
      ? `${encontrados} de ${linhas.length} cadastro(s) encontrado(s)`
      : `${linhas.length} cadastro(s) na lista`;
  }
}

function configurarBuscaInscricoes() {
  const botaoBusca = document.getElementById("btn-toggle-busca");
  const painelBusca = document.getElementById("painel-busca-inscricoes");
  const campoBusca = document.getElementById("buscar-inscricao");
  const botaoLimpar = document.getElementById("btn-limpar-busca");

  if (!botaoBusca || !painelBusca || !campoBusca) return;

  botaoBusca.addEventListener("click", () => {
    const estaAberta = !painelBusca.hidden;

    if (estaAberta) {
      // Fecha a busca e restaura a lista completa.
      campoBusca.value = "";
      aplicarFiltroInscricoes();

      painelBusca.hidden = true;
      botaoBusca.setAttribute("aria-expanded", "false");
      botaoBusca.setAttribute("aria-label", "Localizar cadastro");
      botaoBusca.title = "Localizar cadastro";
    } else {
      // Abre a busca e posiciona o cursor no campo.
      painelBusca.hidden = false;
      botaoBusca.setAttribute("aria-expanded", "true");
      botaoBusca.setAttribute("aria-label", "Fechar busca");
      botaoBusca.title = "Fechar busca";

      campoBusca.focus();
    }
  });

  campoBusca.addEventListener("input", aplicarFiltroInscricoes);

  botaoLimpar?.addEventListener("click", () => {
    campoBusca.value = "";
    aplicarFiltroInscricoes();
    campoBusca.focus();
  });
}

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

    const { data, error: erroAdmin } = await _supabase.rpc("is_admin");

    if (erroAdmin || data !== true) {
      await _supabase.auth.signOut();
      alternarTelaLogada(false);

      mostrarMensagem(
        "Seu usuário não tem permissão de administrador.",
        "erro"
      );

      return false;
    }

    alternarTelaLogada(true, user.email || "");
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

  const email = document.getElementById("login-email")?.value.trim();
  const senha = document.getElementById("login-senha")?.value;
  const botao = document.getElementById("btn-login");

  if (!email || !senha) {
    mostrarMensagem("Informe seu e-mail e sua senha.", "erro");
    return;
  }

  if (botao) botao.disabled = true;

  try {
    const { error } = await _supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      mostrarMensagem(
        "Não foi possível entrar. Confira o e-mail e a senha.",
        "erro"
      );
      return;
    }

    const autorizado = await validarAdministrador();

    if (!autorizado) return;

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

    alternarTelaLogada(false);
    mostrarMensagem("Você saiu do painel.");
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    mostrarMensagem("Não foi possível encerrar a sessão.", "erro");
  }
}

// =====================================================
// ABAS
// =====================================================

function configurarAbas() {
  document.querySelectorAll("[data-aba]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const idSecao = botao.dataset.aba;

      document.querySelectorAll(".admin-section").forEach((secao) => {
        secao.classList.remove("active");
      });

      document.querySelectorAll("[data-aba]").forEach((item) => {
        item.classList.remove("active");
      });

      document.getElementById(idSecao)?.classList.add("active");
      botao.classList.add("active");
    });
  });
}

// =====================================================
// CARREGAMENTO GERAL
// =====================================================

async function carregarPainelADM(verificarPermissao = true) {
  if (verificarPermissao) {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;
  }

  try {
    await Promise.all([
      carregarInscricoes(),
      carregarDespesas()
    ]);

    atualizarIndicadoresFinanceiros();
  } catch (erro) {
    console.error("Erro ao carregar painel:", erro);

    mostrarMensagem(
      "Não foi possível carregar todos os dados do painel.",
      "erro"
    );
  }
}

// =====================================================
// INSCRIÇÕES
// =====================================================

async function carregarInscricoes() {
  const tabela = document.getElementById("tabela-inscricoes");
  const contador = document.getElementById("contador-inscricoes");

  try {
    const { data, error } = await _supabase
      .from("inscricoes")
      .select(`
        id,
        nome_titular,
        valor_previsto,
        status_pagamento,
        status_inscricao,
        created_at,
        acompanhantes (
          id,
          nome,
          idade
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const inscricoes = data || [];

    inscricoesCache.clear();

    inscricoes.forEach((inscricao) => {
      inscricoesCache.set(inscricao.id, inscricao);
    });

    let totalArrecadado = 0;
    let totalPessoas = 0;

    inscricoes.forEach((inscricao) => {
      if (inscricao.status_inscricao !== "Ativa") return;

      const acompanhantes = inscricao.acompanhantes || [];

      totalPessoas += 1 + acompanhantes.length;

      if (inscricao.status_pagamento === "Pago") {
        totalArrecadado += Number(inscricao.valor_previsto || 0);
      }
    });

    arrecadacaoTotal = totalArrecadado;

    const indicadorPessoas = document.getElementById("indicador-pessoas");

    if (indicadorPessoas) {
      indicadorPessoas.textContent = totalPessoas;
    }

    atualizarIndicadoresFinanceiros();

    if (!tabela) return;

    if (!inscricoes.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="6">Nenhuma inscrição cadastrada.</td>
        </tr>
      `;

      if (contador) {
        contador.textContent = "0 cadastro(s) na lista";
      }

      return;
    }

    tabela.innerHTML = inscricoes.map((inscricao) => {
      const acompanhantes = inscricao.acompanhantes || [];
      const ativa = inscricao.status_inscricao === "Ativa";
      const pago = inscricao.status_pagamento === "Pago";

      // A busca considera o titular e todos os acompanhantes.
      const textoBusca = normalizarTexto([
        inscricao.nome_titular,
        ...acompanhantes.map((pessoa) => pessoa.nome)
      ].join(" "));

      const listaAcompanhantes = acompanhantes.length
        ? acompanhantes.map((pessoa) => `
            <li>
              ${escaparHTML(pessoa.nome)}
              (${escaparHTML(pessoa.idade)} anos)
            </li>
          `).join("")
        : "<li>Nenhum acompanhante</li>";

      const statusPagamento = pago
        ? '<span class="status-pill status-paid">Pago</span>'
        : '<span class="status-pill status-pending">Pendente</span>';

      const statusInscricao = ativa
        ? '<span class="status-pill status-active">Ativa</span>'
        : '<span class="status-pill status-cancelled">Cancelada</span>';

      const botaoEditar = ativa
        ? `
          <button
            type="button"
            class="admin-btn btn-primary"
            data-acao="editar-inscricao"
            data-id="${escaparHTML(inscricao.id)}">
            Editar dados
          </button>
        `
        : `
          <button
            type="button"
            class="admin-btn btn-neutral"
            disabled
            title="Reative a inscrição para editá-la">
            Editar dados
          </button>
        `;

      const botaoPagamento = `
        <button
          type="button"
          class="admin-btn ${pago ? "btn-warning" : "btn-success"}"
          data-acao="pagamento"
          data-id="${escaparHTML(inscricao.id)}"
          data-status="${pago ? "Pago" : "Pendente"}">
          ${pago ? "Marcar pendente" : "Confirmar pagamento"}
        </button>
      `;

      const botaoStatus = `
        <button
          type="button"
          class="admin-btn btn-neutral"
          data-acao="status-inscricao"
          data-id="${escaparHTML(inscricao.id)}"
          data-status="${ativa ? "Ativa" : "Cancelada"}">
          ${ativa ? "Cancelar inscrição" : "Reativar inscrição"}
        </button>
      `;

      const botaoExcluir = `
        <button
          type="button"
          class="admin-btn btn-danger"
          data-acao="excluir-inscricao"
          data-id="${escaparHTML(inscricao.id)}">
          Excluir definitivamente
        </button>
      `;

      return `
        <tr data-search="${escaparHTML(textoBusca)}">
          <td>
            <strong>${escaparHTML(inscricao.nome_titular)}</strong>
            <div class="muted">
              Cadastro:
              ${
                inscricao.created_at
                  ? escaparHTML(
                      new Date(inscricao.created_at).toLocaleDateString("pt-BR")
                    )
                  : "—"
              }
            </div>
          </td>

          <td>
            ${1 + acompanhantes.length} pessoa(s)
            <details>
              <summary>Ver acompanhantes</summary>
              <ul>${listaAcompanhantes}</ul>
            </details>
          </td>

          <td>${formatarMoeda(inscricao.valor_previsto)}</td>
          <td>${statusPagamento}</td>
          <td>${statusInscricao}</td>

          <td class="acoes-inscricao">
            ${botaoEditar}
            ${botaoPagamento}
            ${botaoStatus}
            ${botaoExcluir}
          </td>
        </tr>
      `;
    }).join("");

    // Reaplica a busca após atualizar a tabela.
    aplicarFiltroInscricoes();
  } catch (erro) {
    console.error("Erro ao carregar inscrições:", erro);

    if (tabela) {
      tabela.innerHTML = `
        <tr>
          <td colspan="6">
            Erro ao carregar inscrições. Verifique o acesso ao banco.
          </td>
        </tr>
      `;
    }

    if (contador) {
      contador.textContent = "Não foi possível carregar os cadastros.";
    }

    throw erro;
  }
}

// =====================================================
// EDITAR INSCRIÇÃO
// =====================================================

function adicionarCampoAcompanhante(nome = "", idade = "") {
  const lista = document.getElementById("lista-acompanhantes-edicao");
  if (!lista) return;

  if (
    lista.querySelectorAll(".acompanhante-item").length >=
    MAX_ACOMPANHANTES
  ) {
    mostrarMensagem(
      `O limite é de ${MAX_ACOMPANHANTES} acompanhantes por inscrição.`,
      "erro"
    );
    return;
  }

  const item = document.createElement("div");
  item.className = "acompanhante-item";

  item.innerHTML = `
    <div class="admin-field">
      <label>Nome do acompanhante</label>
      <input
        class="campo-nome-acompanhante"
        maxlength="150"
        required>
    </div>

    <div class="admin-field">
      <label>Idade</label>
      <input
        class="campo-idade-acompanhante"
        type="number"
        min="0"
        max="120"
        step="1"
        required>
    </div>

    <button
      type="button"
      class="admin-btn btn-danger btn-remover-acompanhante">
      Remover
    </button>
  `;

  item.querySelector(".campo-nome-acompanhante").value = nome;
  item.querySelector(".campo-idade-acompanhante").value = idade;

  lista.appendChild(item);
}

function abrirEdicaoInscricao(id) {
  const inscricao = inscricoesCache.get(id);

  if (!inscricao) {
    mostrarMensagem(
      "Não foi possível localizar essa inscrição. Atualize a lista.",
      "erro"
    );
    return;
  }

  if (inscricao.status_inscricao !== "Ativa") {
    mostrarMensagem(
      "Reative a inscrição antes de editar os dados.",
      "erro"
    );
    return;
  }

  const modal = document.getElementById("modal-edicao");
  const formulario = document.getElementById("form-edicao");
  const lista = document.getElementById("lista-acompanhantes-edicao");

  if (!modal || !formulario || !lista) {
    mostrarMensagem(
      "Não foi possível abrir o formulário de edição.",
      "erro"
    );
    return;
  }

  formulario.reset();
  lista.innerHTML = "";

  document.getElementById("edicao-id").value = inscricao.id;
  document.getElementById("edicao-titular").value =
    inscricao.nome_titular || "";

  const avisoPagamento = document.getElementById("aviso-pagamento-edicao");

  if (avisoPagamento) {
    avisoPagamento.style.display =
      inscricao.status_pagamento === "Pago" ? "block" : "none";
  }

  (inscricao.acompanhantes || []).forEach((pessoa) => {
    adicionarCampoAcompanhante(pessoa.nome, pessoa.idade);
  });

  modal.showModal();
}

function coletarAcompanhantesEdicao() {
  const itens = [
    ...document.querySelectorAll(
      "#lista-acompanhantes-edicao .acompanhante-item"
    )
  ];

  if (itens.length > MAX_ACOMPANHANTES) {
    throw new Error(
      `O limite é de ${MAX_ACOMPANHANTES} acompanhantes.`
    );
  }

  return itens.map((item) => {
    const nome = item
      .querySelector(".campo-nome-acompanhante")
      .value.trim();

    const idadeTexto = item
      .querySelector(".campo-idade-acompanhante")
      .value;

    if (!nome) {
      throw new Error("Informe o nome de todos os acompanhantes.");
    }

    if (idadeTexto.trim() === "") {
      throw new Error("Informe a idade de todos os acompanhantes.");
    }

    const idade = Number(idadeTexto);

    if (!Number.isInteger(idade) || idade < 0 || idade > 120) {
      throw new Error(
        "Informe idades inteiras entre 0 e 120 anos."
      );
    }

    return { nome, idade };
  });
}

async function salvarEdicaoInscricao(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const id = document.getElementById("edicao-id").value;
  const nomeTitular = document
    .getElementById("edicao-titular")
    .value.trim();

  const botao = document.getElementById("btn-salvar-edicao");
  const inscricaoOriginal = inscricoesCache.get(id);

  if (!id || !nomeTitular) {
    mostrarMensagem("Informe o nome do titular.", "erro");
    return;
  }

  let acompanhantes;

  try {
    acompanhantes = coletarAcompanhantesEdicao();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
    return;
  }

  if (
    inscricaoOriginal?.status_pagamento === "Pago" &&
    !confirm(
      "Esta inscrição está marcada como paga.\n\n" +
      "A alteração de acompanhantes ou idades pode mudar o valor previsto. " +
      "O pagamento continuará marcado como pago.\n\n" +
      "Deseja salvar as alterações?"
    )
  ) {
    return;
  }

  if (botao) botao.disabled = true;

  try {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;

    const { data, error } = await _supabase.rpc(
      "admin_editar_inscricao",
      {
        p_inscricao_id: id,
        p_nome_titular: nomeTitular,
        p_acompanhantes: acompanhantes
      }
    );

    if (error) throw error;

    document.getElementById("modal-edicao").close();

    mostrarMensagem(
      `Inscrição atualizada. Novo valor previsto: ${formatarMoeda(data)}.`
    );

    await carregarPainelADM(false);
  } catch (erro) {
    mensagemErroBanco(
      erro,
      "Não foi possível salvar a inscrição. Verifique os dados e tente novamente."
    );
  } finally {
    if (botao) botao.disabled = false;
  }
}

// =====================================================
// EXCLUSÃO DEFINITIVA DE INSCRIÇÃO
// =====================================================

async function excluirInscricaoDefinitivamente(id) {
  const inscricao = inscricoesCache.get(id);

  if (!inscricao) {
    mostrarMensagem(
      "Inscrição não encontrada. Atualize a lista antes de excluir.",
      "erro"
    );
    return;
  }

  const nomeEsperado = inscricao.nome_titular;

  const confirmacao = prompt(
    `ATENÇÃO: esta ação é definitiva.\n\n` +
    `Titular: ${nomeEsperado}\n` +
    `Valor previsto: ${formatarMoeda(inscricao.valor_previsto)}\n` +
    `Acompanhantes: ${(inscricao.acompanhantes || []).length}\n\n` +
    `A inscrição e seus acompanhantes serão apagados do banco.\n` +
    `Despesas registradas separadamente serão preservadas.\n\n` +
    `Para confirmar, digite EXCLUIR:`
  );

  if (confirmacao === null) return;

  if (confirmacao.trim().toLocaleUpperCase() !== "EXCLUIR") {
    mostrarMensagem("Digite 'EXCLUIR' para confirmar.", "erro");
    return;
  }

  if (!confirm("Confirma a exclusão DEFINITIVA desta inscrição?")) {
    return;
  }

  try {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;

    const { error } = await _supabase.rpc(
      "admin_excluir_inscricao",
      {
        p_inscricao_id: id
      }
    );

    if (error) throw error;

    mostrarMensagem("Inscrição excluída definitivamente.");
    await carregarPainelADM(false);
  } catch (erro) {
    mensagemErroBanco(
      erro,
      "Não foi possível excluir a inscrição. Verifique as permissões do banco."
    );
  }
}

// =====================================================
// ALTERAR PAGAMENTO
// =====================================================

async function alterarPagamento(id, statusAtual) {
  const novoStatus = statusAtual === "Pago" ? "Pendente" : "Pago";

  const mensagem = novoStatus === "Pago"
    ? "Confirma que o pagamento desta inscrição foi recebido?"
    : "Marcar este pagamento como pendente?";

  if (!confirm(mensagem)) return;

  try {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;

    const { error } = await _supabase
      .from("inscricoes")
      .update({ status_pagamento: novoStatus })
      .eq("id", id);

    if (error) throw error;

    mostrarMensagem(
      novoStatus === "Pago"
        ? "Pagamento confirmado."
        : "Pagamento marcado como pendente."
    );

    await carregarPainelADM(false);
  } catch (erro) {
    console.error("Erro ao alterar pagamento:", erro);
    mostrarMensagem(
      "Não foi possível atualizar o pagamento.",
      "erro"
    );
  }
}

// =====================================================
// CANCELAR OU REATIVAR INSCRIÇÃO
// =====================================================

async function alterarStatusInscricao(id, statusAtual) {
  const novoStatus = statusAtual === "Ativa" ? "Cancelada" : "Ativa";

  const mensagem = novoStatus === "Cancelada"
    ? "Cancelar esta inscrição? Os dados serão mantidos no sistema."
    : "Reativar esta inscrição?";

  if (!confirm(mensagem)) return;

  try {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;

    const { error } = await _supabase
      .from("inscricoes")
      .update({ status_inscricao: novoStatus })
      .eq("id", id);

    if (error) throw error;

    mostrarMensagem(
      novoStatus === "Cancelada"
        ? "Inscrição cancelada. Os dados foram preservados."
        : "Inscrição reativada."
    );

    await carregarPainelADM(false);
  } catch (erro) {
    console.error("Erro ao alterar inscrição:", erro);
    mostrarMensagem(
      "Não foi possível atualizar a inscrição.",
      "erro"
    );
  }
}

// =====================================================
// DESPESAS
// =====================================================

async function carregarDespesas() {
  const tabela = document.getElementById("tabela-despesas");

  try {
    const { data, error } = await _supabase
      .from("despesas")
      .select(`
        id,
        descricao,
        valor,
        categoria,
        url_comprovante,
        url_nota_fiscal,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const despesas = data || [];

    despesasTotal = despesas.reduce(
      (total, despesa) => total + Number(despesa.valor || 0),
      0
    );

    atualizarIndicadoresFinanceiros();

    if (!tabela) return;

    if (!despesas.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="5">Nenhuma despesa cadastrada.</td>
        </tr>
      `;
      return;
    }

    tabela.innerHTML = despesas.map((despesa) => {
      const criarLink = (url, texto) => {
        if (!url) return "";

        try {
          const endereco = new URL(url);

          if (!["https:", "http:"].includes(endereco.protocol)) {
            return "";
          }

          return `
            <a
              href="${escaparHTML(endereco.href)}"
              target="_blank"
              rel="noopener noreferrer">
              ${texto}
            </a>
          `;
        } catch {
          return "";
        }
      };

      const linkComprovante = criarLink(
        despesa.url_comprovante,
        "Ver comprovante"
      );

      const linkNotaFiscal = criarLink(
        despesa.url_nota_fiscal,
        "Ver nota fiscal"
      );

      const links = [
        linkComprovante,
        linkNotaFiscal
      ].filter(Boolean);

      const dataFormatada = despesa.created_at
        ? new Date(despesa.created_at).toLocaleDateString("pt-BR")
        : "—";

      return `
        <tr>
          <td>${escaparHTML(despesa.descricao)}</td>
          <td>${escaparHTML(despesa.categoria || "—")}</td>
          <td>${formatarMoeda(despesa.valor)}</td>
          <td>
            ${links.length ? links.join("<br>") : "Não informado"}
          </td>
          <td>
            ${escaparHTML(dataFormatada)}
            <button
              type="button"
              class="admin-btn btn-danger"
              data-acao="excluir-despesa"
              data-id="${escaparHTML(despesa.id)}">
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (erro) {
    console.error("Erro ao carregar despesas:", erro);

    if (tabela) {
      tabela.innerHTML = `
        <tr>
          <td colspan="5">
            Erro ao carregar despesas. Verifique a coluna
            url_nota_fiscal e as permissões do banco.
          </td>
        </tr>
      `;
    }

    throw erro;
  }
}


async function salvarDespesa(evento) {
  evento.preventDefault();
  ocultarMensagem();

  const campoDescricao = document.getElementById("despesa-descricao");
  const campoValor = document.getElementById("despesa-valor");
  const campoCategoria = document.getElementById("despesa-categoria");
  const campoComprovante = document.getElementById("despesa-comprovante");
  const campoNotaFiscal = document.getElementById("despesa-nota-fiscal");
  const formulario = document.getElementById("form-despesa");
  const botao = document.getElementById("btn-salvar-despesa");

  const descricao = campoDescricao.value.trim();
  const valor = Number(campoValor.value);
  const categoria = campoCategoria.value;
  const comprovante = campoComprovante.value.trim();
  const arquivo = campoNotaFiscal.files[0] || null;

  if (!descricao) {
    mostrarMensagem("Informe a descrição da despesa.", "erro");
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    mostrarMensagem("Informe um valor válido maior que zero.", "erro");
    return;
  }

  if (comprovante) {
    try {
      const url = new URL(comprovante);

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Link inválido");
      }
    } catch {
      mostrarMensagem(
        "Informe um link válido para o comprovante.",
        "erro"
      );
      return;
    }
  }

  if (arquivo) {
    const tiposPermitidos = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    const extensoesPermitidas = /\.(pdf|jpe?g|png|webp)$/i;

    if (
      !tiposPermitidos.includes(arquivo.type) ||
      !extensoesPermitidas.test(arquivo.name)
    ) {
      mostrarMensagem(
        "A nota fiscal deve ser um arquivo PDF, JPG, PNG ou WEBP.",
        "erro"
      );
      return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      mostrarMensagem(
        "A nota fiscal deve ter no máximo 10 MB.",
        "erro"
      );
      return;
    }
  }

  if (botao) botao.disabled = true;

  let caminhoArquivoEnviado = null;

  try {
    const autorizado = await validarAdministrador();

    if (!autorizado) return;

    let urlNotaFiscal = null;

    if (arquivo) {
      mostrarMensagem("Enviando nota fiscal...");

      const nomeSeguro = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      caminhoArquivoEnviado =
        `${Date.now()}-${nomeSeguro}`;

      const { error: erroUpload } = await _supabase.storage
        .from("notas-fiscais")
        .upload(caminhoArquivoEnviado, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type
        });

      if (erroUpload) throw erroUpload;

      const { data: arquivoPublico } = _supabase.storage
        .from("notas-fiscais")
        .getPublicUrl(caminhoArquivoEnviado);

      urlNotaFiscal = arquivoPublico.publicUrl;
    }

    const { error: erroCadastro } = await _supabase
      .from("despesas")
      .insert({
        descricao,
        valor,
        categoria: categoria || null,
        url_comprovante: comprovante || null,
        url_nota_fiscal: urlNotaFiscal
      });

    if (erroCadastro) throw erroCadastro;

    formulario.reset();

    mostrarMensagem(
      arquivo
        ? "Despesa cadastrada e nota fiscal enviada com sucesso."
        : "Despesa cadastrada com sucesso."
    );

    await carregarPainelADM(false);
  } catch (erro) {
    console.error("Erro ao salvar despesa ou enviar nota fiscal:", erro);

    if (caminhoArquivoEnviado) {
      const { error: erroRemocao } = await _supabase.storage
        .from("notas-fiscais")
        .remove([caminhoArquivoEnviado]);

      if (erroRemocao) {
        console.error(
          "Não foi possível remover o arquivo enviado:",
          erroRemocao
        );
      }
    }

    mostrarMensagem(
      `Não foi possível salvar a despesa ou enviar a nota fiscal: ${
        erro.message || "verifique as configurações do Supabase."
      }`,
      "erro"
    );
  } finally {
    if (botao) botao.disabled = false;
  }
}


async function excluirDespesa(id) {
  if (
    !confirm(
      "Deseja excluir esta despesa? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  try {
    const autorizado = await validarAdministrador();
    if (!autorizado) return;

    const { error } = await _supabase
      .from("despesas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    mostrarMensagem("Despesa excluída.");
    await carregarPainelADM(false);
  } catch (erro) {
    console.error("Erro ao excluir despesa:", erro);
    mostrarMensagem(
      "Não foi possível excluir a despesa.",
      "erro"
    );
  }
}

// =====================================================
// EVENTOS
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  configurarAbas();
  configurarBuscaInscricoes();

  document
    .getElementById("form-login")
    ?.addEventListener("submit", entrarNoPainel);

  document
    .getElementById("btn-sair")
    ?.addEventListener("click", sairDoPainel);

  document
    .getElementById("form-despesa")
    ?.addEventListener("submit", salvarDespesa);

  document
    .getElementById("btn-atualizar-inscricoes")
    ?.addEventListener("click", async () => {
      const autorizado = await validarAdministrador();
      if (!autorizado) return;

      try {
        await carregarInscricoes();
        mostrarMensagem("Lista de inscrições atualizada.");
      } catch {
        mostrarMensagem(
          "Não foi possível atualizar a lista.",
          "erro"
        );
      }
    });

  document
    .getElementById("form-edicao")
    ?.addEventListener("submit", salvarEdicaoInscricao);

  document
    .getElementById("btn-adicionar-acompanhante")
    ?.addEventListener("click", () => {
      adicionarCampoAcompanhante();
    });

  document
    .getElementById("btn-cancelar-edicao")
    ?.addEventListener("click", () => {
      document.getElementById("modal-edicao")?.close();
    });

  document
    .getElementById("lista-acompanhantes-edicao")
    ?.addEventListener("click", (evento) => {
      const botao = evento.target.closest(
        ".btn-remover-acompanhante"
      );

      if (!botao) return;

      botao.closest(".acompanhante-item")?.remove();
    });

  document.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const { acao, id, status } = botao.dataset;

    // Evita cliques repetidos durante uma operação.
    if (botao.disabled) return;

    botao.disabled = true;

    try {
      if (acao === "editar-inscricao") {
        abrirEdicaoInscricao(id);
      } else if (acao === "excluir-inscricao") {
        await excluirInscricaoDefinitivamente(id);
      } else if (acao === "pagamento") {
        await alterarPagamento(id, status);
      } else if (acao === "status-inscricao") {
        await alterarStatusInscricao(id, status);
      } else if (acao === "excluir-despesa") {
        await excluirDespesa(id);
      }
    } finally {
      // A tabela pode ter sido redesenhada durante a operação.
      botao.disabled = false;
    }
  });

  const autorizado = await validarAdministrador();

  if (autorizado) {
    await carregarPainelADM(false);
  }
});
