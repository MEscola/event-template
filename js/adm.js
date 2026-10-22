
async function salvarDespesa(evento) {
  evento.preventDefault();
  ocultarMensagem();

  // Localiza os campos do formulário.
  const campoDescricao = document.getElementById("despesa-descricao");
  const campoValor = document.getElementById("despesa-valor");
  const campoCategoria = document.getElementById("despesa-categoria");
  const campoComprovante = document.getElementById("despesa-comprovante");
  const campoNotaFiscal = document.getElementById("despesa-nota-fiscal");
  const formulario = document.getElementById("form-despesa");
  const botao = document.getElementById("btn-salvar-despesa");

  // Verifica se os campos existem antes de acessar suas propriedades.
  if (
    !campoDescricao ||
    !campoValor ||
    !campoCategoria ||
    !campoComprovante ||
    !campoNotaFiscal ||
    !formulario
  ) {
    console.error("Campos ausentes no formulário de despesas:", {
      descricao: !!campoDescricao,
      valor: !!campoValor,
      categoria: !!campoCategoria,
      comprovante: !!campoComprovante,
      notaFiscal: !!campoNotaFiscal,
      formulario: !!formulario
    });

    mostrarMensagem(
      "Não foi possível localizar todos os campos do formulário. Confira o adm.html.",
      "erro"
    );
    return;
  }

  const descricao = campoDescricao.value.trim();
  const valorTexto = campoValor.value.trim();
  const categoria = campoCategoria.value.trim();
  const comprovante = campoComprovante.value.trim();
  const arquivoNotaFiscal = campoNotaFiscal.files?.[0] || null;

  const valor = Number(valorTexto.replace(",", "."));

  if (!descricao) {
    mostrarMensagem("Informe a descrição da despesa.", "erro");
    campoDescricao.focus();
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    mostrarMensagem(
      "Informe um valor válido maior que zero.",
      "erro"
    );
    campoValor.focus();
    return;
  }

  // Valida o link do comprovante, quando informado.
  if (comprovante) {
    try {
      const url = new URL(comprovante);

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Protocolo inválido");
      }
    } catch {
      mostrarMensagem(
        "Informe um link válido para o comprovante.",
        "erro"
      );
      campoComprovante.focus();
      return;
    }
  }

  // Valida a nota fiscal, quando anexada.
  if (arquivoNotaFiscal) {
    const tiposPermitidos = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    const extensoesPermitidas = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "webp"
    ];

    const extensao = arquivoNotaFiscal.name
      .split(".")
      .pop()
      .toLowerCase();

    if (
      !tiposPermitidos.includes(arquivoNotaFiscal.type) ||
      !extensoesPermitidas.includes(extensao)
    ) {
      mostrarMensagem(
        "A nota fiscal deve ser um PDF ou uma imagem JPG, PNG ou WEBP.",
        "erro"
      );
      return;
    }

    const tamanhoMaximo = 10 * 1024 * 1024;

    if (arquivoNotaFiscal.size > tamanhoMaximo) {
      mostrarMensagem(
        "A nota fiscal deve ter no máximo 10 MB.",
        "erro"
      );
      return;
    }
  }

  if (botao) botao.disabled = true;

  let caminhoNotaFiscal = null;

  try {
    const autorizado = await validarAdministrador();

    if (!autorizado) return;

    // Faz o upload da nota fiscal, se houver arquivo selecionado.
    if (arquivoNotaFiscal) {
      const extensao = arquivoNotaFiscal.name
        .split(".")
        .pop()
        .toLowerCase();

      const nomeArquivo = `${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await _supabase
        .storage
        .from("notas-fiscais")
        .upload(nomeArquivo, arquivoNotaFiscal, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivoNotaFiscal.type
        });

      if (erroUpload) {
        console.error("Erro no upload da nota fiscal:", erroUpload);
        throw erroUpload;
      }

      caminhoNotaFiscal = nomeArquivo;
    }

    // Obtém a URL pública do arquivo enviado.
    let urlNotaFiscal = null;

    if (caminhoNotaFiscal) {
      const { data } = _supabase
        .storage
        .from("notas-fiscais")
        .getPublicUrl(caminhoNotaFiscal);

      urlNotaFiscal = data?.publicUrl || null;

      if (!urlNotaFiscal) {
        throw new Error("Não foi possível obter a URL da nota fiscal.");
      }
    }

    // Salva a despesa e os links no banco de dados.
    const { error } = await _supabase
      .from("despesas")
      .insert({
        descricao,
        valor,
        categoria: categoria || null,
        url_comprovante: comprovante || null,
        url_nota_fiscal: urlNotaFiscal
      });

    if (error) {
      console.error("Erro ao salvar despesa no banco:", error);
      throw error;
    }

    formulario.reset();

    mostrarMensagem("Despesa cadastrada com sucesso.");

    await carregarPainelADM(false);

  } catch (erro) {
    console.error("Erro ao salvar despesa:", erro);

    mostrarMensagem(
      `Não foi possível cadastrar a despesa. ${
        erro?.message || "Verifique as permissões do Storage e do banco."
      }`,
      "erro"
    );

  } finally {
    if (botao) botao.disabled = false;
  }
}
