
/* js/transparencia.js */

window.addEventListener("DOMContentLoaded", () => {
    carregarPortalTransparencia();
});

const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const escaparHTML = (valor) =>
    String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);

function formatarData(data) {
    if (!data) return "—";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) return "—";

    return dataObj.toLocaleDateString("pt-BR");
}

function obterLinkComprovante(url) {
    if (!url) {
        return '<span style="color:#888;font-style:italic;font-size:12px;">Não anexado</span>';
    }

    try {
        const endereco = new URL(url);

        if (!["https:", "http:"].includes(endereco.protocol)) {
            return '<span style="color:#888;font-size:12px;">Link indisponível</span>';
        }

        return `
            <a
                href="${escaparHTML(endereco.href)}"
                target="_blank"
                rel="noopener noreferrer"
                style="color:#2ec4b6;font-weight:bold;text-decoration:none;
                       padding:4px 10px;border-radius:6px;font-size:12px;
                       border:1px solid rgba(46,196,182,0.3);"
            >
                Ver comprovante
            </a>
        `;
    } catch {
        return '<span style="color:#888;font-size:12px;">Link indisponível</span>';
    }
}

async function carregarPortalTransparencia() {
    const txtGeralArrecadado = document.getElementById("transp-geral-arrecadado");
    const txtGeralGasto = document.getElementById("transp-geral-gasto");
    const txtGeralSaldo = document.getElementById("transp-geral-saldo");

    const txtAlunos = document.getElementById("transp-alunos");
    const txtParceiros = document.getElementById("transp-parceiros");
    const txtArrecadacao = document.getElementById("transp-arrecadacao");

    const blocoCategorias = document.getElementById("transp-resumo-categorias");
    const tabelaCorpo = document.getElementById("tabela-transp-corpo");

    const txtTotalGasto = document.getElementById("transp-total-gasto");
    const txtSaldoFinal = document.getElementById("transp-saldo-final");
    const lblTextoSaldo = document.getElementById("label-saldo-texto");

    if (!tabelaCorpo) {
        console.error("Não foi encontrado o elemento #tabela-transp-corpo.");
        return;
    }

    // 1. BUSCAR A ARRECADAÇÃO PELA FUNÇÃO RPC
    // A função retorna somente o total das inscrições ativas e pagas.
    let arrecadacaoTotal = 0;

    const { data: totalRecebido, error: erroArrecadacao } =
        await _supabase.rpc("portal_total_arrecadado");

    if (erroArrecadacao) {
        console.error("Erro ao carregar arrecadação:", erroArrecadacao);

        if (txtGeralArrecadado) {
            txtGeralArrecadado.innerText = "Indisponível";
        }

        if (txtArrecadacao) {
            txtArrecadacao.innerText = "Indisponível";
        }
    } else {
        arrecadacaoTotal = Number(totalRecebido) || 0;
    }

    // 2. BUSCAR AS DESPESAS DA CONFRA
    const { data: despesas, error: erroDespesas } = await _supabase
        .from("despesas")
        .select("id, descricao, valor, categoria, url_comprovante, created_at")
        .order("created_at", { ascending: false });

    if (erroDespesas) {
        console.error("Erro ao carregar despesas:", erroDespesas);

        tabelaCorpo.innerHTML = `
            <tr>
                <td colspan="5" style="padding:30px;text-align:center;color:#F44336;">
                    Não foi possível carregar as despesas.
                </td>
            </tr>
        `;

        if (blocoCategorias) {
            blocoCategorias.innerHTML = `
                <p style="color:#888;font-size:13px;">
                    Não foi possível carregar o resumo das despesas.
                </p>
            `;
        }

        // Não exibir um saldo aparentemente correto sem conhecer as despesas.
        if (txtGeralGasto) txtGeralGasto.innerText = "Indisponível";
        if (txtGeralSaldo) txtGeralSaldo.innerText = "Indisponível";
        if (txtTotalGasto) txtTotalGasto.innerText = "Indisponível";
        if (txtSaldoFinal) txtSaldoFinal.innerText = "Indisponível";

        if (lblTextoSaldo) {
            lblTextoSaldo.innerText = "Não foi possível calcular o saldo:";
        }

        return;
    }

    // 3. CALCULAR O TOTAL GASTO E AGRUPAR POR CATEGORIA
    let custosTotal = 0;
    const resumoCategorias = {};

    tabelaCorpo.innerHTML = "";

    const emojis = {
        "Descartáveis": "📦",
        "Bebidas": "🥤",
        "Brindes/Bingo": "🎁",
        "Decoração": "🎨",
        "Outros": "📋",
        "Logística": "🚚",
        "Infraestrutura": "🎪",
        "Alimentação": "🍖",
        "Carvão": "🔥",
        "Aluguel": "🏠"
    };

    if (despesas && despesas.length > 0) {
        despesas.forEach((despesa) => {
            const valorGasto = Number(despesa.valor) || 0;
            const categoria = despesa.categoria || "Outros";
            const descricao = despesa.descricao || "Sem descrição";

            custosTotal += valorGasto;

            resumoCategorias[categoria] =
                (resumoCategorias[categoria] || 0) + valorGasto;

            const comprovante = obterLinkComprovante(
                despesa.url_comprovante
            );

            tabelaCorpo.innerHTML += `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.08);font-size:13px;">
                    <td style="padding:10px 6px;color:#aaa;">
                        ${escaparHTML(categoria)}
                    </td>

                    <td style="padding:10px 6px;color:#fff;">
                        ${escaparHTML(descricao)}
                    </td>

                    <td style="padding:10px 6px;color:#fff;font-weight:bold;white-space:nowrap;">
                        ${formatarMoeda(valorGasto)}
                    </td>

                    <td style="padding:10px 6px;color:#aaa;white-space:nowrap;">
                        ${formatarData(despesa.created_at)}
                    </td>

                    <td style="padding:10px 6px;text-align:center;">
                        ${comprovante}
                    </td>
                </tr>
            `;
        });

        // 4. RESUMO POR CATEGORIA, DO MAIOR PARA O MENOR GASTO
        if (blocoCategorias) {
            blocoCategorias.innerHTML = "";

            Object.entries(resumoCategorias)
                .sort((a, b) => b[1] - a[1])
                .forEach(([categoria, valor]) => {
                    const emoji = emojis[categoria] || "📋";

                    blocoCategorias.innerHTML += `
                        <div style="display:flex;justify-content:space-between;
                                    align-items:center;gap:12px;font-size:14px;
                                    color:#ddd;margin-bottom:8px;">
                            <span>
                                ${emoji} ${escaparHTML(categoria)}
                            </span>

                            <span style="font-family:monospace;color:#fff;white-space:nowrap;">
                                ${formatarMoeda(valor)}
                            </span>
                        </div>
                    `;
                });
        }
    } else {
        tabelaCorpo.innerHTML = `
            <tr>
                <td colspan="5" style="padding:30px;text-align:center;color:#888;">
                    Nenhuma despesa registrada.
                </td>
            </tr>
        `;

        if (blocoCategorias) {
            blocoCategorias.innerHTML = `
                <p style="color:#888;font-size:13px;">
                    Nenhuma despesa para resumir.
                </p>
            `;
        }
    }

    // 5. CALCULAR O SALDO
    const saldoFinal = arrecadacaoTotal - custosTotal;

    // 6. ATUALIZAR OS VALORES DO RESUMO GERAL
    if (!erroArrecadacao) {
        if (txtGeralArrecadado) {
            txtGeralArrecadado.innerText = formatarMoeda(arrecadacaoTotal);
        }

        if (txtArrecadacao) {
            txtArrecadacao.innerText = formatarMoeda(arrecadacaoTotal);
        }
    }

    if (txtGeralGasto) {
        txtGeralGasto.innerText = formatarMoeda(custosTotal);
    }

    if (txtGeralSaldo) {
        txtGeralSaldo.innerText = erroArrecadacao
            ? "Indisponível"
            : formatarMoeda(saldoFinal);

        txtGeralSaldo.style.color = erroArrecadacao
            ? "#888"
            : saldoFinal >= 0 ? "#2ec4b6" : "#F44336";
    }

    if (txtTotalGasto) {
        txtTotalGasto.innerText = formatarMoeda(custosTotal);
    }

    if (txtSaldoFinal) {
        txtSaldoFinal.innerText = erroArrecadacao
            ? "Indisponível"
            : formatarMoeda(saldoFinal);

        txtSaldoFinal.style.color = erroArrecadacao
            ? "#888"
            : saldoFinal >= 0 ? "#2ec4b6" : "#F44336";
    }

    if (lblTextoSaldo) {
        if (erroArrecadacao) {
            lblTextoSaldo.innerText =
                "Não foi possível calcular o saldo:";
        } else if (saldoFinal < 0) {
            lblTextoSaldo.innerText =
                "Déficit após todos os gastos registrados:";
        } else {
            lblTextoSaldo.innerText =
                "Saldo após todos os gastos registrados:";
        }
    }

    // Esses dois campos eram específicos do portal antigo do Arraiá.
    // A Confra não possui, neste código, uma separação entre alunos e parceiros.
    if (txtAlunos) txtAlunos.innerText = "—";
    if (txtParceiros) txtParceiros.innerText = "—";
}
