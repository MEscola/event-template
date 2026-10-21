// =====================================================
// CONFRA REISFIT 2026 — CADASTRO.JS
// Cadastro, acompanhantes, cálculo e confirmação
// =====================================================

const PRECOS_PREVIA = {
    titular: 30,
    acompanhanteAdulto: 30,
    acompanhante11a15: 15
};

const CHAVE_PIX = "DIGITAR A CHAVE PIX AQUI";
const LIMITE_ACOMPANHANTES = 30;

// ---------- Utilitários ----------

function moedaBRL(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterElemento(...ids) {
    for (const id of ids) {
        const elemento = document.getElementById(id);
        if (elemento) return elemento;
    }

    return null;
}

// ---------- Idempotência do cadastro ----------

const CHAVE_TENTATIVA_PENDENTE =
    "confra_reisfit_2026_inscricao_pendente_v1";

function gerarChaveIdempotencia() {
    if (typeof crypto === "undefined") {
        throw new Error(
            "Seu navegador não oferece os recursos necessários para proteger o envio. Atualize o navegador e tente novamente."
        );
    }

    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    // Alternativa para navegadores sem randomUUID.
    if (typeof crypto.getRandomValues === "function") {
        const bytes = crypto.getRandomValues(new Uint8Array(16));

        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, byte =>
            byte.toString(16).padStart(2, "0")
        ).join("");

        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20)
        ].join("-");
    }

    throw new Error(
        "Não foi possível gerar uma chave segura para a inscrição."
    );
}

function obterTentativaPendente(payload) {
    let tentativaSalva;

    try {
        const registro = localStorage.getItem(
            CHAVE_TENTATIVA_PENDENTE
        );

        tentativaSalva = registro ? JSON.parse(registro) : null;
    } catch (erro) {
        console.error("Erro ao consultar tentativa salva:", erro);

        throw new Error(
            "Não foi possível consultar a tentativa anterior neste navegador. Não envie novamente antes de verificar se a inscrição já foi registrada."
        );
    }

    if (tentativaSalva) {
        // Não reutilizar a chave com dados diferentes.
        if (tentativaSalva.payload !== payload) {
            throw new Error(
                "Existe uma tentativa anterior cujo resultado ainda precisa ser confirmado. Para evitar duplicidade, restaure os dados usados naquela tentativa e tente novamente, ou confirme com a organização se a inscrição foi registrada."
            );
        }

        if (!tentativaSalva.chave) {
            throw new Error(
                "A tentativa anterior está inconsistente. Verifique a inscrição com a organização antes de tentar novamente."
            );
        }

        return tentativaSalva.chave;
    }

    const chave = gerarChaveIdempotencia();

    try {
        localStorage.setItem(
            CHAVE_TENTATIVA_PENDENTE,
            JSON.stringify({
                chave,
                payload
            })
        );
    } catch (erro) {
        console.error("Erro ao salvar tentativa:", erro);

        throw new Error(
            "Não foi possível salvar a proteção contra envios duplicados. Verifique as configurações de armazenamento do navegador e tente novamente."
        );
    }

    return chave;
}

function removerTentativaPendente(chave) {
    try {
        const registro = localStorage.getItem(
            CHAVE_TENTATIVA_PENDENTE
        );

        if (!registro) return;

        const tentativa = JSON.parse(registro);

        // Só remover a tentativa que está sendo processada.
        if (tentativa.chave === chave) {
            localStorage.removeItem(CHAVE_TENTATIVA_PENDENTE);
        }
    } catch (erro) {
        // Manter a chave é mais seguro do que apagá-la incorretamente.
        console.error(
            "Não foi possível limpar a tentativa pendente:",
            erro
        );
    }
}

function obterTipoParticipacao() {
    return document.querySelector(
        'input[name="tipo-participacao"]:checked'
    )?.value || "";
}

function estaIndoAcompanhado() {
    return obterTipoParticipacao() === "acompanhantes";
}

// ---------- Categoria por idade ----------

function obterCategoriaIdade(idade) {
    if (!Number.isInteger(idade) || idade < 0 || idade > 120) {
        return null;
    }

    if (idade <= 10) {
        return {
            nome: "Isento",
            valor: 0,
            classe: "categoria-isento"
        };
    }

    if (idade <= 15) {
        return {
            nome: "Meia",
            valor: PRECOS_PREVIA.acompanhante11a15,
            classe: "categoria-meia"
        };
    }

    return {
        nome: "Integral",
        valor: PRECOS_PREVIA.acompanhanteAdulto,
        classe: "categoria-integral"
    };
}

function atualizarCategoriaAcompanhante(item) {
    const campoIdade = item.querySelector(".idade-acompanhante");
    const indicador = item.querySelector(".categoria-acompanhante");
    const valorElemento = item.querySelector(".acompanhante-valor");

    if (!campoIdade || !indicador) return;

    const textoIdade = campoIdade.value.trim();

    indicador.className = "categoria-acompanhante";

    if (textoIdade === "") {
        indicador.textContent = "Informe a idade para calcular o valor.";
        indicador.classList.add("categoria-neutra");

        if (valorElemento) valorElemento.textContent = "";
        return;
    }

    const idade = Number(textoIdade);
    const categoria = obterCategoriaIdade(idade);

    if (!categoria) {
        indicador.textContent = "Informe uma idade válida entre 0 e 120.";
        indicador.classList.add("categoria-invalida");

        if (valorElemento) valorElemento.textContent = "";
        return;
    }

    indicador.textContent =
        `${categoria.nome} — ${moedaBRL(categoria.valor)}`;

    indicador.classList.add(categoria.classe);

    // Valor do acompanhante no cabeçalho do bloco.
    if (valorElemento) {
        valorElemento.textContent = categoria.valor === 0
            ? "Grátis"
            : moedaBRL(categoria.valor);
    }
}

// ---------- Numeração dos acompanhantes ----------

function renumerarAcompanhantes() {
    const container = document.getElementById("campos-acompanhantes");

    if (!container) return;

    const itens = container.querySelectorAll(".acompanhante-item");

    itens.forEach((item, indice) => {
        const numero = indice + 1;
        const bolinha = item.querySelector(".acompanhante-numero");
        const rotulo = item.querySelector(".acompanhante-rotulo");
        const botaoRemover = item.querySelector(".remover-acompanhante");
        const campoNome = item.querySelector(".nome-acompanhante");
        const campoIdade = item.querySelector(".idade-acompanhante");

        item.dataset.numero = String(numero);

        if (bolinha) {
            bolinha.textContent = String(numero);
        }

        if (rotulo) {
            rotulo.textContent = `Acompanhante ${numero}`;
        }

        if (botaoRemover) {
            botaoRemover.setAttribute(
                "aria-label",
                `Remover acompanhante ${numero}`
            );
        }

        if (campoNome) {
            campoNome.setAttribute(
                "aria-label",
                `Nome do acompanhante ${numero}`
            );
        }

        if (campoIdade) {
            campoIdade.setAttribute(
                "aria-label",
                `Idade do acompanhante ${numero}`
            );
        }
    });

    atualizarBotaoAdicionar();
}

function atualizarBotaoAdicionar() {
    const container = document.getElementById("campos-acompanhantes");
    const botao = document.getElementById("btn-adicionar-acompanhante");

    if (!container || !botao) return;

    const quantidade = container.querySelectorAll(".acompanhante-item").length;

    botao.disabled = quantidade >= LIMITE_ACOMPANHANTES;
    botao.textContent = quantidade >= LIMITE_ACOMPANHANTES
        ? `Limite de ${LIMITE_ACOMPANHANTES} acompanhantes atingido`
        : "+ Adicionar acompanhante";
}

// ---------- Cálculo do total ----------

function calcularTotalPrevisto() {
    const totalElemento = document.getElementById("total-previsto");
    const boxTotal = document.getElementById("box-total-previsto");
    const tipoParticipacao = obterTipoParticipacao();

    if (boxTotal) {
        boxTotal.hidden = !tipoParticipacao;
    }

    let total = PRECOS_PREVIA.titular;

    const container = document.getElementById("campos-acompanhantes");

    if (container && tipoParticipacao === "acompanhantes") {
        const itens = container.querySelectorAll(".acompanhante-item");

        itens.forEach(item => {
            const campoIdade = item.querySelector(".idade-acompanhante");

            if (!campoIdade) return;

            atualizarCategoriaAcompanhante(item);

            const textoIdade = campoIdade.value.trim();

            // Não adiciona valor até que a idade seja preenchida corretamente.
            if (textoIdade === "") return;

            const categoria = obterCategoriaIdade(Number(textoIdade));

            if (categoria) {
                total += categoria.valor;
            }
        });
    }

    if (totalElemento) {
        totalElemento.textContent = moedaBRL(total);
    }

    return total;
}

// ---------- Aviso: faltam acompanhantes ----------

function mostrarErroAcompanhantes() {
    const card = document.getElementById("card-acompanhantes");
    const erro = document.getElementById("erro-acompanhantes");

    if (!card || !erro) return;

    erro.hidden = false;

    // Reinicia a animação caso o erro apareça mais de uma vez.
    card.classList.remove("com-erro");
    void card.offsetWidth;
    card.classList.add("com-erro");

    card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function limparErroAcompanhantes() {
    const card = document.getElementById("card-acompanhantes");
    const erro = document.getElementById("erro-acompanhantes");

    if (erro) erro.hidden = true;
    if (card) card.classList.remove("com-erro");
}

// ---------- Adicionar acompanhante ----------

function adicionarAcompanhante(focar = true) {
    const container = document.getElementById("campos-acompanhantes");

    if (!container) {
        console.error("Não foi encontrado #campos-acompanhantes no app.html.");
        return;
    }

    if (!estaIndoAcompanhado()) {
        alert("Selecione primeiro a opção de ir com acompanhantes.");
        return;
    }

    const quantidade = container.querySelectorAll(".acompanhante-item").length;

    if (quantidade >= LIMITE_ACOMPANHANTES) {
        alert(`O limite é de ${LIMITE_ACOMPANHANTES} acompanhantes.`);
        return;
    }

    const numero = quantidade + 1;

    const item = document.createElement("div");
    item.className = "acompanhante-item";

    // Cabeçalho do bloco: bolinha numerada + título + valor + remover
    const cabecalho = document.createElement("div");
    cabecalho.className = "acompanhante-cabecalho";

    const titulo = document.createElement("h3");
    titulo.className = "acompanhante-titulo";

    const bolinha = document.createElement("span");
    bolinha.className = "acompanhante-numero";
    bolinha.setAttribute("aria-hidden", "true");
    bolinha.textContent = String(numero);

    const rotulo = document.createElement("span");
    rotulo.className = "acompanhante-rotulo";
    rotulo.textContent = `Acompanhante ${numero}`;

    titulo.append(bolinha, rotulo);

    const valor = document.createElement("span");
    valor.className = "acompanhante-valor";
    valor.setAttribute("aria-live", "polite");

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "remover-acompanhante";
    botaoRemover.textContent = "Remover";
    botaoRemover.setAttribute(
        "aria-label",
        `Remover acompanhante ${numero}`
    );

    botaoRemover.addEventListener("click", () => {
        item.remove();

        // Esconde o aviso quando a pessoa remove um campo.
        limparErroAcompanhantes();

        renumerarAcompanhantes();
        calcularTotalPrevisto();
    });

    cabecalho.append(titulo, valor, botaoRemover);

    // Campo de nome
    const grupoNome = document.createElement("div");
    grupoNome.className = "form-group";

    const labelNome = document.createElement("label");
    labelNome.append("Nome completo");

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.className = "nome-acompanhante";
    inputNome.placeholder = "Nome e sobrenome";
    inputNome.required = true;
    inputNome.minLength = 2;
    inputNome.maxLength = 120;
    inputNome.autocomplete = "off";

    labelNome.appendChild(inputNome);
    grupoNome.appendChild(labelNome);

    // Campo de idade
    const grupoIdade = document.createElement("div");
    grupoIdade.className = "form-group";

    const labelIdade = document.createElement("label");
    labelIdade.append("Idade");

    const inputIdade = document.createElement("input");
    inputIdade.type = "number";
    inputIdade.className = "idade-acompanhante";
    inputIdade.min = "0";
    inputIdade.max = "120";
    inputIdade.step = "1";
    inputIdade.inputMode = "numeric";
    inputIdade.placeholder = "Digite a idade";
    inputIdade.required = true;

    labelIdade.appendChild(inputIdade);

    // Indicador da categoria e do preço
    const indicador = document.createElement("div");
    indicador.className = "categoria-acompanhante categoria-neutra";
    indicador.setAttribute("aria-live", "polite");
    indicador.textContent = "Informe a idade para calcular o valor.";

    // Label (com o input dentro) e, logo abaixo, o indicador.
    grupoIdade.append(labelIdade, indicador);

    item.append(cabecalho, grupoNome, grupoIdade);
    container.appendChild(item);

    inputIdade.addEventListener("input", calcularTotalPrevisto);

    renumerarAcompanhantes();
    calcularTotalPrevisto();

    if (focar) {
        inputNome.focus();
    }
}

// ---------- Participação ----------

function atualizarParticipacao() {
    const card = document.getElementById("card-acompanhantes");
    const container = document.getElementById("campos-acompanhantes");
    const acompanhado = estaIndoAcompanhado();

    if (card) {
        card.hidden = !acompanhado;
    }

    if (!acompanhado && container) {
        container.replaceChildren();
    }

    limparErroAcompanhantes();

    // Abre o primeiro campo para a pessoa não ficar com a seção vazia.
    if (acompanhado && container && container.children.length === 0) {
        adicionarAcompanhante(false);
    }

    renumerarAcompanhantes();
    calcularTotalPrevisto();
}

// ---------- Validar acompanhantes ----------

function acompanhantesEstaoPreenchidos() {
    const container = document.getElementById("campos-acompanhantes");

    if (!container) return false;

    const itens = container.querySelectorAll(".acompanhante-item");

    // É necessário haver pelo menos um acompanhante quando essa opção foi escolhida.
    if (itens.length === 0) return false;

    return Array.from(itens).every(item => {
        const nome =
            item.querySelector(".nome-acompanhante")?.value.trim() || "";

        const idade =
            item.querySelector(".idade-acompanhante")?.value.trim() || "";

        return nome.length >= 2 && idade !== "";
    });
}

function coletarAcompanhantes() {
    const container = document.getElementById("campos-acompanhantes");

    if (!container) return [];

    const itens = container.querySelectorAll(".acompanhante-item");
    const acompanhantes = [];

    if (itens.length > LIMITE_ACOMPANHANTES) {
        throw new Error(
            `O limite é de ${LIMITE_ACOMPANHANTES} acompanhantes.`
        );
    }

    for (const item of itens) {
        const campoNome = item.querySelector(".nome-acompanhante");
        const campoIdade = item.querySelector(".idade-acompanhante");

        const nome = campoNome?.value.trim() || "";
        const textoIdade = campoIdade?.value.trim() || "";
        const idade = Number(textoIdade);

        if (nome.length < 2 || nome.length > 120) {
            throw new Error(
                "Informe o nome completo de cada acompanhante."
            );
        }

        if (
            textoIdade === "" ||
            !Number.isInteger(idade) ||
            idade < 0 ||
            idade > 120
        ) {
            throw new Error(`Informe uma idade válida para ${nome}.`);
        }

        acompanhantes.push({ nome, idade });
    }

    return acompanhantes;
}

// ---------- Confirmação ----------

function mostrarConfirmacao({
    nomeTitular,
    quantidadePessoas,
    totalPrevisto
}) {
    const telaCadastro = document.getElementById("tela-cadastro");
    const telaConfirmacao = document.getElementById("tela-confirmacao");

    const nomeElemento = document.getElementById("confirmacao-nome");
    const pessoasElemento = document.getElementById("confirmacao-pessoas");
    const valorElemento = document.getElementById("confirmacao-valor");
    const chaveElemento = document.getElementById("chave-pix");

    if (
        !telaCadastro ||
        !telaConfirmacao ||
        !nomeElemento ||
        !pessoasElemento ||
        !valorElemento ||
        !chaveElemento
    ) {
        throw new Error(
            "Não foi possível exibir a confirmação. Confira os IDs da tela de confirmação no app.html."
        );
    }

    nomeElemento.textContent = nomeTitular;
    pessoasElemento.textContent = String(quantidadePessoas);
    valorElemento.textContent = moedaBRL(totalPrevisto);
    chaveElemento.textContent = CHAVE_PIX;

    telaCadastro.hidden = true;
    telaConfirmacao.hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Copiar Pix ----------

async function copiarChavePix() {
    const chaveElemento = document.getElementById("chave-pix");
    const mensagem = document.getElementById("mensagem-pix");
    const botao = document.getElementById("btn-copiar-pix");

    if (!chaveElemento || !mensagem) return;

    const chave = chaveElemento.textContent.trim();
    mensagem.textContent = "";

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(chave);
        } else {
            const campoTemporario = document.createElement("textarea");

            campoTemporario.value = chave;
            campoTemporario.setAttribute("readonly", "");
            campoTemporario.style.position = "fixed";
            campoTemporario.style.opacity = "0";

            document.body.appendChild(campoTemporario);
            campoTemporario.select();

            const copiou = document.execCommand("copy");
            campoTemporario.remove();

            if (!copiou) {
                throw new Error("Não foi possível copiar automaticamente.");
            }
        }

        mensagem.textContent = chave === CHAVE_PIX
            ? "Atenção: esta ainda é a chave provisória. Configure a chave Pix real antes de divulgar o site."
            : "Chave Pix copiada. Cole no aplicativo do banco.";

        if (botao) {
            botao.textContent = "Copiar novamente";
        }
    } catch (erro) {
        console.error("Erro ao copiar a chave Pix:", erro);

        mensagem.textContent =
            "Não foi possível copiar automaticamente. Selecione e copie a chave manualmente.";
    }
}

// ---------- Inicialização ----------

window.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-inscricao");
    const campoTitular = obterElemento("nome_titular", "nome");
    const botaoEnviar = obterElemento(
        "btn-enviar",
        "btn-confirmar-inscricao"
    );

    const botaoAdicionar = document.getElementById(
        "btn-adicionar-acompanhante"
    );

    const botaoCopiarPix = document.getElementById("btn-copiar-pix");

    if (!formulario || !campoTitular || !botaoEnviar) {
        console.error(
            "Confra: confira os IDs form-inscricao, nome/nome_titular e btn-enviar no app.html."
        );
        return;
    }

    document
        .querySelectorAll('input[name="tipo-participacao"]')
        .forEach(radio => {
            radio.addEventListener("change", atualizarParticipacao);
        });

    botaoAdicionar?.addEventListener("click", () => adicionarAcompanhante());
    botaoCopiarPix?.addEventListener("click", copiarChavePix);

    atualizarParticipacao();

    // O navegador pode bloquear o envio antes do evento submit por causa de required.
    // Este evento mostra o aviso HTML quando nome ou idade estiverem vazios.
    formulario.addEventListener("invalid", event => {
        if (
            estaIndoAcompanhado() &&
            event.target.matches(".nome-acompanhante, .idade-acompanhante")
        ) {
            mostrarErroAcompanhantes();
        }
    }, true);

    // O aviso some assim que a pessoa começa a corrigir os campos.
    const containerAcompanhantes =
        document.getElementById("campos-acompanhantes");

    containerAcompanhantes?.addEventListener("input", () => {
        limparErroAcompanhantes();
    });

    let envioEmAndamento = false;
    let inscricaoRegistrada = false;

    formulario.addEventListener("submit", async event => {
        event.preventDefault();

        if (envioEmAndamento || inscricaoRegistrada) {
            return;
        }

        const textoOriginal = botaoEnviar.textContent;

        envioEmAndamento = true;
        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando inscrição...";

        let chaveTentativa = null;
        let requisicaoIniciada = false;
        let resultadoIncerto = false;

        try {
            // 1. Validar titular.
            const nomeTitular = campoTitular.value.trim();

            if (nomeTitular.length < 2 || nomeTitular.length > 120) {
                throw new Error(
                    "Informe o nome completo do titular."
                );
            }

            // 2. Validar tipo de participação.
            const tipoParticipacao = obterTipoParticipacao();

            if (!tipoParticipacao) {
                throw new Error(
                    "Escolha se você vai sozinho(a) ou com acompanhantes."
                );
            }

            // 3. Validar acompanhantes.
            if (
                tipoParticipacao === "acompanhantes" &&
                !acompanhantesEstaoPreenchidos()
            ) {
                mostrarErroAcompanhantes();
                return;
            }

            limparErroAcompanhantes();

            const acompanhantes = coletarAcompanhantes();

            if (
                tipoParticipacao !== "acompanhantes" &&
                acompanhantes.length > 0
            ) {
                throw new Error(
                    "Revise a opção de participação e os acompanhantes informados."
                );
            }

            const totalPrevisto = calcularTotalPrevisto();

            // 4. Verificar conexão com Supabase.
            if (
                typeof _supabase === "undefined" ||
                !_supabase ||
                typeof _supabase.rpc !== "function"
            ) {
                throw new Error(
                    "A conexão com o Supabase não foi inicializada. Atualize a página e tente novamente."
                );
            }

            // 5. Preparar uma representação estável dos dados.
            // A mesma inscrição precisa gerar o mesmo payload.
            const payload = JSON.stringify({
                nomeTitular,
                acompanhantes
            });

            // Reutiliza a chave se esta mesma tentativa já existir.
            chaveTentativa = obterTentativaPendente(payload);

            // 6. Chamar a nova função protegida.
            let resultado;

            requisicaoIniciada = true;

            try {
                resultado = await _supabase.rpc(
                    "criar_inscricao_v2",
                    {
                        p_nome_titular: nomeTitular,
                        p_acompanhantes: acompanhantes,
                        p_chave_idempotencia: chaveTentativa
                    }
                );
            } catch (erroRequisicao) {
                // Não sabemos se o banco gravou a inscrição.
                resultadoIncerto = true;

                console.error(
                    "Falha de comunicação durante a inscrição:",
                    erroRequisicao
                );

                throw new Error(
                    "Não foi possível confirmar o resultado da inscrição. Você pode tentar novamente com os mesmos dados; o sistema reutilizará a mesma chave. Não altere os dados desta tentativa até confirmar o resultado."
                );
            }

            // 7. Tratar erros retornados pelo Supabase.
            if (resultado?.error) {
                console.error(
                    "Erro retornado pelo Supabase:",
                    resultado.error
                );

                if (resultado.error.code) {
                    // Houve uma resposta do banco com erro.
                    // A transação da função foi revertida.
                    removerTentativaPendente(chaveTentativa);

                    throw new Error(
                        "O banco não concluiu a inscrição. Confira os dados e tente novamente. Se o problema continuar, entre em contato com a organização."
                    );
                }

                // Sem código de erro, não presumir que nada foi gravado.
                resultadoIncerto = true;

                throw new Error(
                    "Não foi possível confirmar se a inscrição foi registrada. Tente novamente com os mesmos dados para reutilizar a chave desta tentativa."
                );
            }

            // 8. A função deve retornar o UUID da inscrição.
            const inscricaoId = resultado?.data;

            const uuidValido =
                typeof inscricaoId === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                    .test(inscricaoId);

            if (!uuidValido) {
                // Resposta inesperada: preservar a chave.
                resultadoIncerto = true;

                throw new Error(
                    "A resposta do cadastro não pôde ser confirmada. Tente novamente com os mesmos dados; não será criada uma nova chave para esta tentativa."
                );
            }

            // 9. O banco confirmou a inscrição.
            inscricaoRegistrada = true;
            removerTentativaPendente(chaveTentativa);

            // 10. Mostrar confirmação.
            try {
                mostrarConfirmacao({
                    nomeTitular,
                    quantidadePessoas: 1 + acompanhantes.length,
                    totalPrevisto
                });
            } catch (erroConfirmacao) {
                console.error(
                    "Inscrição registrada, mas houve erro ao exibir a confirmação:",
                    erroConfirmacao
                );

                alert(
                    "Sua inscrição foi registrada, mas não foi possível exibir a tela de confirmação. Não faça outro cadastro. Confira com a organização se necessário."
                );
            }

        } catch (erro) {
            console.error("Erro no cadastro:", erro);

            alert(
                erro.message ||
                "Não foi possível concluir a inscrição. Verifique os dados e tente novamente."
            );

        } finally {
            envioEmAndamento = false;

            if (inscricaoRegistrada) {
                botaoEnviar.disabled = true;
                botaoEnviar.textContent = "Inscrição enviada";
            } else {
                botaoEnviar.disabled = false;
                botaoEnviar.textContent = textoOriginal;
            }

            // Em caso de resultado incerto, a chave permanece salva.
            // Uma nova tentativa com os mesmos dados reutiliza essa chave.
            if (resultadoIncerto) {
                console.warn(
                    "Resultado incerto. A chave de idempotência foi preservada para uma tentativa segura."
                );
            }
        }
    });
});