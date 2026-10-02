# Hinário Digital — Backend REST API (`hinos_canticos_api`)

API REST desenvolvida em **Node.js**, **TypeScript**, **Fastify**, **Prisma ORM** e **PostgreSQL**, com validação via **Zod**, documentação interativa **OpenAPI/Swagger** e busca de hinos com suporte a acentuação e diacríticos em português.

---

## 1. Requisitos

* **Node.js**: v20.x ou superior
* **npm**: v10.x ou superior
* **PostgreSQL**: v12 ou superior (opcional para execução imediata em modo de desenvolvimento através do mecanismo resiliente em memória)

---

## 2. Instalação

Aceda ao diretório da API e instale as dependências:

```bash
cd hinos_canticos_api
npm install
```

Gere o cliente do Prisma ORM:

```bash
npm run db:generate
```

---

## 3. Variáveis de Ambiente

Copie o ficheiro de exemplo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Configurações disponíveis:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta em que o servidor HTTP irá escutar |
| `HOST` | `0.0.0.0` | Endereço de interface de rede |
| `NODE_ENV` | `development` | Ambiente (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://...` | String de conexão com o banco de dados PostgreSQL |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem permitida para requisições do frontend |
| `HINOS_JSON_PATH`| `../hinos_canticos_conversor/output/hinos.json` | Caminho do arquivo JSON de dados dos hinos |

---

## 4. PostgreSQL e Migrations

Para criar as tabelas e índices estruturais e de texto no PostgreSQL:

```bash
# Executar as migrações no banco
npm run db:migrate

# Ou sincronizar diretamente o schema
npm run db:push
```

As migrações versionadas encontram-se em:
```text
prisma/migrations/20261002000000_init/migration.sql
```

---

## 5. Importação dos Hinos (JSON -> PostgreSQL)

O script de importação automatizado lê o arquivo JSON consolidado, valida a estrutura com Zod, detecta e corrige potenciais inconsistências, faz o upsert (evitando duplicações) e exibe um relatório formatado:

```bash
npm run db:import
```

Também disponível como seed:
```bash
npm run db:seed
```

### Relatório de Importação
Durante a execução, o script apresenta:
* Duração total em segundos
* Total de hinos processados
* Total de hinos inseridos
* Total de hinos atualizados
* Lista de avisos e eventuais erros

---

## 6. Execução

### Modo de Desenvolvimento (Hot-reload)

```bash
npm run dev
```

O servidor iniciará em `http://localhost:3000`.

### Documentação Swagger / OpenAPI

Aceda à documentação interativa no navegador:
👉 **`http://localhost:3000/docs`**

### Modo de Produção

```bash
npm run build
npm run start
```

---

## 7. Testes Automatizados

Para executar a suite de testes automatizados com Vitest:

```bash
npm run test
```

Testa:
* Integridade e Health check (`GET /api/health`)
* Listagem paginada (`GET /api/hinos`)
* Consulta detalhada de hino com estrofes (`GET /api/hinos/:numero`)
* Busca insensível a acentos em português (`GET /api/hinos/search`)
* Busca por número, autor e letra
* Navegação sequencial (anterior e seguinte)
* Validação de parâmetros e erros 400/404

---

## 8. Endpoints da API

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado de saúde, uptime e status do banco |
| `GET` | `/api/hinos?page=1&limit=20&sort=asc` | Listagem paginada de hinos |
| `GET` | `/api/hinos/:numero` | Detalhes completos do hino e suas estrofes |
| `GET` | `/api/hinos/search?q=termo&page=1&limit=20` | Pesquisa por número, título, autor ou letra |
| `GET` | `/api/hinos/:numero/anterior` | Hino anterior ao número informado |
| `GET` | `/api/hinos/:numero/seguinte` | Hino seguinte ao número informado |
| `GET` | `/docs` | Documentação interativa OpenAPI/Swagger |

---

## 9. Deploy

Para implantar em servidores cloud ou VPS (Render, Railway, Fly.io, AWS, DigitalOcean):

1. Configure a variável `DATABASE_URL` com a URL do seu PostgreSQL de produção.
2. Defina `NODE_ENV=production` e `PORT=8080` (ou porta atribuída pelo provedor).
3. Configure `CORS_ORIGIN` com a URL pública do frontend (ex: `https://hinariodigital.com`).
4. Execute:
   ```bash
   npm install --omit=dev
   npm run db:generate
   npm run db:migrate
   npm run db:import
   npm run build
   npm run start
   ```
