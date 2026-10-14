# Pesquisa de Inovação — Cursos Técnicos Senac

Aplicação web anônima para uma pesquisa acadêmica sobre a rotina de alunos matriculados em cursos técnicos. O projeto usa HTML, CSS e JavaScript no navegador, Express no servidor e SQLite para armazenar as respostas.

## Requisitos

- Node.js 20 ou superior e npm.

## Instalação

Na pasta do projeto, instale as dependências:

```bash
npm install
```

## Configuração

Copie `.env.example` para `.env` e ajuste as configurações:

```env
PORT=3000
NODE_ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
```

Gere o hash bcrypt da senha administrativa (mínimo de 12 caracteres):

```bash
npm run hash-password -- "uma-senha-forte-com-12-ou-mais"
```

Copie o hash impresso para `ADMIN_PASSWORD_HASH`. Configure `SESSION_SECRET` com uma sequência aleatória longa (pelo menos 32 caracteres). O arquivo `.env` é local e não deve ser versionado. Em produção, use HTTPS e `NODE_ENV=production`.

## Execução

Inicie em modo normal:

```bash
npm start
```

Para desenvolvimento, com reinicialização automática:

```bash
npm run dev
```

- Formulário público: <http://localhost:3000>
- Painel administrativo: <http://localhost:3000/admin>

O painel redireciona para a tela de acesso. Entre com `ADMIN_USERNAME` e a senha correspondente ao hash configurado. A sessão administrativa fica em SQLite e usa cookie HttpOnly, SameSite e validade limitada.

## Respostas e privacidade

O banco `data/responses.sqlite` é criado automaticamente ao iniciar a aplicação. Cada registro guarda o curso, nome do curso quando selecionado “Outros cursos técnicos”, respostas em JSON e data/hora UTC. O identificador é gerado pelo SQLite. Não são solicitados nome, CPF, e-mail nem dados de pacientes. Mantenha o banco local protegido e faça cópias de segurança conforme a necessidade da pesquisa.

As respostas são anônimas, mas texto livre pode identificar alguém se o participante inserir dados pessoais. O formulário orienta a não incluir esses dados; revise as respostas antes de compartilhar os dados exportados.

## Cursos e perguntas

- Edite a lista de cursos e as perguntas que o servidor valida em `src/questions.js`.
- Mantenha a estrutura pública correspondente em `public/js/questions.js`; ela controla a apresentação dinâmica e a ordem das perguntas.
- Cada pergunta possui `id`, `label`, `type` (`radio`, `checkbox` ou `textarea`) e `required`; perguntas de escolha também possuem `options`.
- Para incluir curso, adicione seu identificador e perguntas nas duas estruturas. A validação do servidor só aceita os identificadores, opções e perguntas cadastrados no arquivo `src/questions.js`.

As perguntas abertas são opcionais e limitadas a 2.000 caracteres. Não são coletadas informações reais de pacientes ou de terceiros.

## Painel e exportação

O painel permite filtrar por curso e período, visualizar distribuições objetivas, consultar respostas individuais com paginação e exportar os registros filtrados para CSV. A exportação está disponível apenas após autenticação e limita cada arquivo a 10.000 registros. Campos do CSV são escapados para reduzir riscos de execução de fórmulas em planilhas.
