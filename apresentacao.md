# Apresentação — MedClinic API

Rafael Novo da Rosa · Módulo 02 · Back End Node T1

---

## Antes de começar a gravar

Abra estas abas no navegador:

1. GitHub do projeto → https://github.com/rafaelnrosa/BackEndMedClinicAPI-RafaelNovoDaRosa
2. Hoppscotch → https://hoppscotch.io
3. Frontend → arquivo `frontend/index.html`
4. Board → https://github.com/users/rafaelnrosa/projects/3/views/1
5. Terminal do VS Code aberto na pasta do projeto

---

## PARTE 1 — Apresentação (1 minuto)

**O que falar:**

> "Olá, meu nome é Rafael Novo da Rosa. Vou apresentar o projeto final do Módulo 02 — a MedClinic API. É uma API REST para gerenciar uma clínica médica: pacientes, médicos, escalas de trabalho, agendamentos e prontuários. Foi desenvolvida em TypeScript com Express, TypeORM e PostgreSQL. Está publicada no Render e pode ser acessada agora."

---

## PARTE 2 — Repositório (2 minutos)

**O que fazer:** Abrir o GitHub na aba 1.

**O que falar e mostrar, nesta ordem:**

1. Mostrar o README
   > "O README tem a URL pública da API, as variáveis de ambiente, a arquitetura em camadas e os endpoints."

2. Rolar o README até a seção de arquitetura
   > "O projeto segue a separação em camadas: controller recebe a requisição, service executa a regra de negócio e repository faz o acesso ao banco. O controller não conhece TypeORM e o service não conhece código HTTP."

3. Clicar em **Pull requests** → mostrar os 9 PRs fechados
   > "Cada funcionalidade foi desenvolvida numa branch separada e incorporada via pull request."

4. Clicar em qualquer PR → mostrar o check verde
   > "Todo PR passou pelo workflow de validação automática antes de ser mergeado."

5. Clicar na aba **Actions** → mostrar um run verde
   > "Aqui estão os deploys automáticos. Toda vez que um PR é mergeado na main, o GitHub Actions publica a nova versão no Render."

---

## PARTE 3 — Testes (1 minuto)

**O que fazer:** Abrir o terminal do VS Code.

**O que digitar:**
```
npm run test:cov
```

**O que falar enquanto roda:**
> "Os testes são unitários sobre a camada de serviço — onde mora a regra de negócio. Nenhum teste depende de banco ou rede."

**Quando aparecer o resultado, apontar para os números:**
> "80 testes passando. Cobertura de 93% em linhas e 97% em funções — bem acima do mínimo exigido de 80%."

---

## PARTE 4 — API ao vivo (4 minutos)

**O que fazer:** Abrir o Hoppscotch na aba 2.

---

### 4.1 Health — confirmar que está no ar

- Método: `GET`
- URL: `https://medclinic-api-urig.onrender.com/api/v1/health`
- Clicar em Send

**Falar:**
> "Primeiro confirmo que a API está no ar."

Mostrar a resposta: `{"status":"ok"}`

---

### 4.2 Login — pegar o token

- Método: `POST`
- URL: `https://medclinic-api-urig.onrender.com/api/v1/auth/login`
- Body (JSON):
```json
{
  "email": "admin@medclinic.com",
  "password": "SenhaForte@123"
}
```

**Falar:**
> "Faço o login com o usuário administrador criado pelo seed. O token JWT retornado tem validade de 8 horas e carrega o id, nome e perfis do usuário."

Copiar o `accessToken`. No Hoppscotch, ir em **Authorization → Bearer** e colar o token.

---

### 4.3 Erro sem token — envelope padronizado

- Método: `GET`
- URL: `https://medclinic-api-urig.onrender.com/api/v1/patients`
- **Sem** o header de Authorization

**Falar:**
> "Se eu chamar qualquer rota protegida sem token, recebo 401 com o código NAO_AUTENTICADO. Todo erro da API segue o mesmo envelope: statusCode, error e message."

Mostrar: `{"statusCode":401,"error":"NAO_AUTENTICADO","message":"..."}`

Colocar o token de volta no header.

---

### 4.4 Criar médico — operação atômica

- Método: `POST`
- URL: `https://medclinic-api-urig.onrender.com/api/v1/doctors`
- Body:
```json
{
  "name": "Dr. João Silva",
  "email": "joao@medclinic.com",
  "password": "SenhaForte@123",
  "crm": "CRM-SP-99999"
}
```

**Falar:**
> "Criar um médico é uma operação atômica. O usuário de acesso e o registro profissional são criados na mesma transação. Se o CRM já existir, nada é gravado — não fica metade no banco."

Mostrar a resposta 201 com `id`, `crm` e `user` aninhado.

---

### 4.5 Agendamento fora da escala — regra de negócio

- Método: `POST`
- URL: `https://medclinic-api-urig.onrender.com/api/v1/appointments`
- Body:
```json
{
  "doctorId": 1,
  "patientId": 1,
  "startsAt": "2026-11-10T16:00:00.000Z"
}
```

**Falar:**
> "Se eu tentar agendar num horário em que o médico não tem turno, recebo 422 com o código HORARIO_FORA_DA_ESCALA. O backend valida se o horário cai num turno, se está alinhado à grade de slots e se a consulta inteira cabe antes do fim do turno."

Mostrar: `{"statusCode":422,"error":"HORARIO_FORA_DA_ESCALA"}`

---

### 4.6 Agendamento duplicado — controle de concorrência

- Tentar criar um agendamento no mesmo horário que já existe (usar `2026-11-03T11:00:00.000Z`)

**Falar:**
> "Se o horário já está ocupado, recebo 409 HORARIO_INDISPONIVEL. O que torna isso especial é que a verificação e a gravação acontecem dentro de uma transação com SELECT FOR UPDATE — um lock pessimista na linha do médico. Isso garante que duas secretárias trabalhando ao mesmo tempo nunca consigam gravar duas consultas no mesmo horário."

Mostrar: `{"statusCode":409,"error":"HORARIO_INDISPONIVEL"}`

---

## PARTE 5 — Board (30 segundos)

**O que fazer:** Abrir a aba 4 do board.

**Falar:**
> "O projeto foi gerenciado com GitHub Projects. Cada card representa uma funcionalidade, tem descrição com o critério de aceitação e está vinculado ao pull request correspondente."

Mostrar os 9 cards na coluna Done.

---

## PARTE 6 — Frontend (2 minutos)

**O que fazer:** Abrir o arquivo `frontend/index.html` na aba 3.

**Falar:**
> "Para fechar, criei um frontend simples em HTML e Bootstrap que consome a mesma API. Isso mostra que o contrato funciona de ponta a ponta."

**Mostrar, nesta ordem:**

1. Tela de login → clicar em Entrar
   > "O login chama POST /auth/login e salva o token no localStorage."

2. Dashboard → mostrar os cards com os totais
   > "O dashboard faz três requisições em paralelo para montar os números."

3. Navegar em Pacientes → mostrar a listagem
   > "Listagem paginada com busca em tempo real por nome."

4. Criar um paciente novo ao vivo
   - Nome: `Maria Souza`
   - CPF: `98765432100`
   > "Formulário chama POST /patients. O CPF é validado no backend."

5. Navegar em Agendamentos → filtrar por status `Agendado`
   > "Filtros chamam GET /appointments com query params."

---

## PARTE 7 — Encerramento (30 segundos)

**Falar:**

> "O projeto implementa todas as regras de negócio do enunciado: controle de acesso por perfil, validação de escala, lock pessimista para concorrência, prontuário com controle por vínculo e ciclo de vida do agendamento com máquina de estados. Obrigado."

---

## Cola rápida — dados para usar durante a gravação

| Item | Valor |
|------|-------|
| URL da API | `https://medclinic-api-urig.onrender.com` |
| E-mail admin | `admin@medclinic.com` |
| Senha admin | `SenhaForte@123` |
| Repositório | `github.com/rafaelnrosa/BackEndMedClinicAPI-RafaelNovoDaRosa` |
| Board | `github.com/users/rafaelnrosa/projects/3/views/1` |
| doctorId de teste | `1` |
| patientId de teste | `1` |
| Horário ocupado | `2026-11-03T11:00:00.000Z` |
| Horário fora da escala | `2026-11-10T16:00:00.000Z` |
