# Event Template

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Mobile First](https://img.shields.io/badge/Design-Mobile--First-0EA5E9?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?style=flat-square&logo=githubpages&logoColor=white)


Template de aplicação web para organização e gerenciamento de eventos, desenvolvido com HTML, CSS, JavaScript e Supabase.

O projeto serve como ponto de partida para criar páginas de inscrição, listas de participantes, painel administrativo e transparência financeira, adaptando os recursos às necessidades de cada evento.

## Funcionalidades

- Cadastro de participantes e acompanhantes.
- Seleção de itens ou contribuições, conforme a configuração do evento.
- Consulta da lista de participantes.
- Painel administrativo para gerenciamento de informações e controle financeiro.
- Página de transparência com indicadores e prestação de contas.

> Os recursos disponíveis dependem da configuração do projeto Supabase e dos ajustes realizados para cada evento.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Supabase — banco de dados PostgreSQL e serviços de backend.
- GitHub Pages — opção para hospedagem das páginas estáticas.

## Como configurar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/MEscola/event-template.git
cd event-template
```

### 2. Configure o Supabase

Crie um projeto no [Supabase](https://supabase.com/) ou utilize um projeto existente destinado ao evento.

No painel do Supabase, obtenha a URL do projeto e a chave pública (`anon` ou `publishable`, conforme a interface disponível).

Copie o arquivo de exemplo:

```bash
cp js/supabase.example.js js/supabase.js
```

Edite `js/supabase.js` e preencha os valores correspondentes ao seu projeto:

```javascript
const SUPABASE_URL = "SUA_SUPABASE_URL";
const SUPABASE_ANON_KEY = "SUA_CHAVE_PUBLICA";
```

O arquivo `js/supabase.js` é ignorado pelo Git e não deve ser enviado ao repositório.

**Segurança:** utilize somente a chave pública no frontend. Nunca exponha chaves `service_role` ou `secret`. Configure as políticas de Row Level Security (RLS) nas tabelas do Supabase para controlar o acesso aos dados.

### 3. Configure o banco de dados

Crie as tabelas, colunas, relacionamentos e políticas de acesso necessárias às funcionalidades que serão utilizadas.

Os nomes das tabelas e as políticas devem corresponder às consultas realizadas pelos arquivos JavaScript do projeto.

### 4. Execute a aplicação

Como o projeto utiliza páginas estáticas, você pode abrir `index.html` no navegador ou executar um servidor HTTP local para testar a aplicação.

Para publicar no GitHub Pages, configure a hospedagem do repositório e confirme que os arquivos necessários estão disponíveis no ambiente de publicação.

## Estrutura do projeto

```text
event-template/
├── assets/
│   └── images/
├── css/
│   └── style.css
├── docs/
│   ├── gif/
│   └── screenshots/
├── js/
│   ├── supabase.example.js
│   ├── adm.js
│   ├── cadastro.js
│   ├── lista.js
│   └── transparencia.js
├── adm.html
├── app.html
├── index.html
├── lista.html
├── manutencao.html
├── transparencia.html
├── .gitignore
└── README.md
```

## Personalização

Antes de utilizar o template em um novo evento:

1. Atualize os textos, títulos, imagens e identidade visual.
2. Configure as datas, regras de inscrição, valores e demais parâmetros do evento.
3. Prepare o banco de dados e as políticas de segurança no Supabase.
4. Implemente autenticação e autorização adequadas para o painel administrativo.
5. Teste o cadastro, as consultas, as operações administrativas e a transparência antes da publicação.

## Segurança

A chave pública do Supabase não substitui as regras de autorização. As operações permitidas devem ser controladas no banco de dados por meio de RLS e, quando necessário, de autenticação e verificação de permissões.

O painel administrativo não deve depender apenas de senhas armazenadas no código HTML ou JavaScript.

## Licença

Defina uma licença antes de distribuir ou permitir o uso do projeto por terceiros.