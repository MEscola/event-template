# Estrutura do banco de dados

## Visão geral

O projeto utiliza PostgreSQL por meio do Supabase. O banco atual possui duas tabelas principais, utilizadas no gerenciamento das inscrições e das despesas do evento.

## Tabela `cadastro_arraia`

Armazena os dados das inscrições, informações sobre acompanhantes e crianças, contribuições e situação dos pagamentos.

| Coluna | Tipo | Permite nulo | Valor padrão |
|---|---|---|---|
| `id` | bigint | Não | — |
| `created_at` | timestamptz | Não | `now()` |
| `nome` | text | Sim | — |
| `tipo_grupo` | text | Sim | — |
| `qtd_conjuge` | integer | Sim | `0` |
| `qtd_amigos` | integer | Sim | `0` |
| `criancas` | text | Sim | — |
| `leva_caldo` | text | Sim | — |
| `categoria_prato` | text | Sim | — |
| `sabor_prato` | text | Sim | — |
| `total_pix` | numeric | Sim | — |
| `status_pix` | text | Sim | `Pendente` |

**Chave primária:** `id`.

## Tabela `gastos_arraia`

Armazena as despesas do evento e os dados necessários para a prestação de contas.

| Coluna | Tipo | Permite nulo | Valor padrão |
|---|---|---|---|
| `id` | bigint | Não | — |
| `created_at` | timestamptz | Não | `timezone('utc', now())` |
| `descricao` | text | Não | — |
| `valor` | numeric | Não | — |
| `categoria` | text | Não | — |
| `url_nota` | text | Sim | — |

**Chave primária:** `id`.

## Segurança e acesso

O Row Level Security (RLS) está habilitado nas duas tabelas.

Entretanto, as políticas atuais permitem operações públicas amplas, incluindo alterações e exclusões de inscrições e operações administrativas sobre despesas. Essas políticas precisam ser revisadas antes de reutilizar o projeto em um novo evento.

A configuração definitiva deverá separar:

- Operações públicas necessárias ao cadastro.
- Leitura pública dos dados estritamente necessários à transparência.
- Operações administrativas autorizadas por autenticação e permissões verificadas no banco.

O acesso administrativo não deve depender apenas de senhas ou verificações executadas no navegador.

## Observações

- Os nomes das tabelas são específicos do evento original.
- O esquema deve ser validado e adaptado antes da utilização em outro evento.
- Este documento descreve a estrutura atual; não substitui um script SQL de criação do banco.
