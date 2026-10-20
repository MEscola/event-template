
/* js/lista.js
 * Confra ReisFit 2026
 * Lista pública: titular, quantidade de pessoas e pagamento.
 */




async function atualizarContadorConfirmados() {
    const contador = document.getElementById("total-confirmados");
    const contadorSection = document.getElementById("contador-confirmados");

    if (!contador || !contadorSection) return;

    // Mantém o contador oculto até confirmar o total.
    contadorSection.hidden = true;

    try {
        const { data, error } = await _supabase.rpc(
            "contar_pessoas_confirmadas"
        );

        if (error) throw error;

        const total = Number(data);

        if (!Number.isFinite(total) || total < 0) {
            throw new Error("Total de confirmados inválido.");
        }

        contador.textContent =
            `${total} ${total === 1 ? "pessoa" : "pessoas"}`;

        // Só exibe o contador a partir de 20 pessoas.
        contadorSection.hidden = total < 20;

    } catch (error) {
        console.error("Erro ao carregar contador:", error);
        contadorSection.hidden = true;
    }
}




async function carregarListaPublica() {
    const container = document.getElementById("lista-alunos-container");
    if (!container) return;

    container.textContent = "Carregando inscrições...";

    try {
        const { data, error } = await _supabase.rpc(
            "listar_inscricoes_publicas"
        );

        if (error) throw error;

        container.replaceChildren();

        if (!Array.isArray(data) || data.length === 0) {
            const mensagem = document.createElement("p");
            mensagem.className = "lista-vazia";
            mensagem.textContent =
                "Nenhuma inscrição realizada até o momento.";
            container.appendChild(mensagem);
            return;
        }

        data.forEach(inscricao => {
            const card = document.createElement("article");
            card.className = "inscricao-card";

            // Cabeçalho: nome do titular e status lado a lado
            const cabecalho = document.createElement("div");
            cabecalho.className = "inscricao-cabecalho";

            const nome = document.createElement("strong");
            nome.className = "inscricao-nome";
            nome.textContent = inscricao.nome_titular || "Titular";

            const status = document.createElement("span");
            status.className = "status-pagamento";

            if (inscricao.status_pagamento === "Pago") {
                status.classList.add("status-pago");
                status.textContent = "Pago";
            } else {
                status.classList.add("status-pendente");
                status.textContent = "Pendente";
            }

            cabecalho.append(nome, status);

            // Quantidade de pessoas abaixo do cabeçalho
            const quantidade = Number(inscricao.quantidade_pessoas);
            const pessoas = document.createElement("p");
            pessoas.className = "inscricao-quantidade";
            pessoas.textContent =
                `${Number.isFinite(quantidade) ? quantidade : 1} ` +
                `${quantidade === 1 ? "pessoa" : "pessoas"} no grupo`;

            card.append(cabecalho, pessoas);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar inscrições públicas:", error);

        container.replaceChildren();

        const mensagem = document.createElement("p");
        mensagem.className = "lista-erro";
        mensagem.textContent =
            "Não foi possível carregar a lista. Tente novamente mais tarde.";

        container.appendChild(mensagem);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    carregarListaPublica();
    atualizarContadorConfirmados();
});