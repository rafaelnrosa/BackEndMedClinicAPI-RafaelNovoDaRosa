# MedClinic API

**Etapa 2 — Agendamento, escala e prontuário**  
Projeto avaliativo do Módulo 02 — Back End Node T1

API REST para gerenciamento de uma clínica médica: pacientes, médicos, escalas de trabalho, agendamentos e prontuários.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22 |
| Linguagem | TypeScript (strict: true) |
| Framework | Express 4 |
| ORM | TypeORM 0.3 |
| Banco | PostgreSQL 15 (timestamptz) |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Validação | Zod |
| Testes | Vitest + V8 coverage |
| Container | Docker multi-stage |
| CI/CD | GitHub Actions |
| Nuvem | Render + Neon PostgreSQL |

---

## Pré-requisitos

- Node.js 22+
- Docker e Docker Compose (para banco local)
- PostgreSQL (ou use o docker-compose abaixo)

---

## Execução local

### 1. Banco de dados (Docker)

```bash
docker compose up -d
```

`docker-compose.yml` de referência:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: medclinic
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus valores
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Migrations + seed do admin

```bash
npm run migration:run
```

As migrations criam toda a estrutura e a última faz o seed do usuário administrador.

### 5. Iniciar

```bash
# Desenvolvimento
npm run dev

# Produção (após build)
npm run build
npm start
```

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORT` | Porta de escuta | `3000` |
| `NODE_ENV` | Ambiente (`development` / `production`) | `production` |
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USERNAME` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | `postgres` |
| `DB_NAME` | Nome do banco | `medclinic` |
| `DB_SSL` | Habilitar SSL no banco (`true` / `false`) | `true` |
| `JWT_SECRET` | Segredo para assinar os tokens JWT | `um-segredo-forte` |
| `JWT_EXPIRES_IN` | Validade do token | `8h` |
| `ADMIN_NAME` | Nome do usuário admin criado pelo seed | `Administrador` |
| `ADMIN_EMAIL` | E-mail do admin | `admin@medclinic.com` |
| `ADMIN_PASSWORD` | Senha do admin | `SenhaForte@123` |
| `CLINIC_TIMEZONE` | Fuso da clínica | `America/Sao_Paulo` |

> O arquivo `.env` **não é versionado**. O `.env.example` lista todas as chaves sem valores reais.

---

## Comandos úteis

```bash
npm run build          # compila TypeScript → dist/
npm start              # inicia o servidor (produção)
npm run dev            # inicia com hot-reload (ts-node-dev)
npm run migration:run  # roda migrations + seed
npm run test           # executa os testes
npm run test:cov       # executa com relatório de cobertura
```

---

## Arquitetura e estrutura de pastas

```
src/
├── main.ts              # bootstrap: conecta banco, inicia servidor
├── app.ts               # factory do Express: registra rotas e middlewares
├── config/
│   └── database.ts      # DataSource do TypeORM
├── errors/
│   └── AppError.ts      # erro de domínio com código e status HTTP
├── middlewares/
│   ├── auth.middleware.ts   # valida JWT
│   ├── roles.middleware.ts  # guard de perfil
│   └── error.middleware.ts  # tratamento centralizado (único ponto — RP03)
├── modules/
│   ├── auth/            # login
│   ├── users/           # CRUD de usuários
│   ├── patients/        # CRUD de pacientes
│   ├── doctors/         # CRUD de médicos + agenda (calendar)
│   ├── work-schedule/   # escala de trabalho
│   ├── appointments/    # agendamentos
│   └── medical-records/ # prontuário
├── entities/            # entidades TypeORM
├── utils/
│   ├── pagination.ts    # parseamento de page/pageSize
│   └── schedule.ts      # lógica de fuso e validação de escala
├── database/
│   ├── migrations/      # migrations versionadas (RP06)
│   └── seeds/           # seed do admin (RP07)
└── tests/               # testes unitários (*.spec.ts)
```

### Padrão de nomes (RNF06)

| Item | Padrão | Exemplo |
|------|--------|---------|
| Arquivos | kebab-case com sufixo descritivo | `patients.service.ts` |
| Classes | PascalCase | `PatientsService` |
| Interfaces | PascalCase com prefixo `I` | `IPatientsRepository` |
| Métodos/funções | camelCase | `findById()` |
| Variáveis | camelCase | `passwordHash` |
| Rotas HTTP | kebab-case | `/api/v1/work-schedule` |
| Colunas do banco | snake_case | `starts_at` |

### Decisões de modelagem

- **Timestamps com fuso**: todas as colunas de instante usam `timestamptz` (RP05), para evitar perda de informação na conversão BRT ↔ UTC.
- **Soft delete em patients e users**: o registro não some do banco, apenas ganha `deleted_at`, preservando integridade referencial.
- **endsAt calculado e guardado**: a consulta guarda o próprio instante de fim no momento do agendamento, calculado a partir do `slotDurationMinutes` do turno. Isso garante que mudanças futuras na escala não alterem consultas já marcadas (RN15).
- **Lock pessimista na linha do médico**: a criação de agendamento usa `SELECT ... FOR UPDATE` na linha do médico, dentro de uma transação, para garantir que duas requisições simultâneas não ocupem o mesmo horário (RF07 / RN10).
- **Injeção por construtor em todas as camadas** (RP02): facilita substituição por dublês nos testes.

---

## Cobertura de testes

**Recorte**: `src/**/*.service.ts`  
**Justificativa**: os services contêm 100% da regra de negócio. Controllers só delegam; repositórios só acessam banco; ambos são verificados pelo teste de aceitação. Incluir entities e migrations na conta inflaria o número sem cobrir regra alguma.

**Limiar**: 80% em `lines`, `branches`, `functions` e `statements`.

**Casos mínimos cobertos**:
- [x] Sobreposição de períodos (5 cenários)
- [x] Criação de agendamento (7 casos: caminho feliz + 6 falhas)
- [x] Validação da escala (sobreposição, encostados, dias diferentes)
- [x] Transição de status (válida, inválida, sem permissão)
- [x] Prontuário (médico com/sem vínculo, admin, secretary)
- [x] Login (credencial correta, e-mail inexistente, senha errada, não revela qual falhou)

---

## Endpoints

| Método | Rota | Perfis |
|--------|------|--------|
| GET | /api/v1/health | público |
| POST | /api/v1/auth/login | público |
| GET | /api/v1/users/me | autenticado |
| POST | /api/v1/users | admin |
| POST | /api/v1/patients | admin, secretary |
| GET | /api/v1/patients | autenticado |
| GET | /api/v1/patients/:id | autenticado |
| PATCH | /api/v1/patients/:id | admin, secretary |
| DELETE | /api/v1/patients/:id | admin |
| POST | /api/v1/doctors | admin |
| GET | /api/v1/doctors | autenticado |
| GET | /api/v1/doctors/:id | autenticado |
| PUT | /api/v1/doctors/:id/work-schedule | admin |
| GET | /api/v1/doctors/:id/work-schedule | autenticado |
| GET | /api/v1/doctors/:id/calendar | autenticado |
| POST | /api/v1/appointments | admin, secretary |
| GET | /api/v1/appointments | autenticado (filtrado por perfil) |
| GET | /api/v1/appointments/:id | autenticado (com posse) |
| PATCH | /api/v1/appointments/:id/status | conforme transição |
| POST | /api/v1/patients/:id/medical-records | doctor com vínculo |
| GET | /api/v1/patients/:id/medical-records | doctor com vínculo, admin |

---

## URL pública

> _A ser preenchida após o deploy no Render_

---

## Board do projeto

> _Link do GitHub Projects a ser inserido_

---

## Autor

Rafael Novo da Rosa — Turma Back End Node T1
