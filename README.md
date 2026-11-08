# Projeto CodeBurguer / DevBurger

Frontend React + Vite e backend Node.js + Express + Sequelize, com **PostgreSQL como unico banco de dados**.

As telas do cardápio e do [checkout demonstrativo](frontend/docs/CHECKOUT.md) podem ser testadas executando apenas o frontend. O checkout simula endereço e escolha de pagamento, sem enviar pedidos nem realizar cobranças.

## Autenticacao

- Cadastro: `POST /users` (tela `/register`).
- Login: `POST /login` (tela `/login`) retorna JWT.
- Frontend: React Hook Form e Zod.
- Backend: Routes → Controllers → Services → Repositories → Models.
- Cadastro publico cria somente usuarios comuns; senhas sao protegidas por bcrypt.
- Pedidos, produtos e categorias persistem no PostgreSQL. Nao e necessario MongoDB.

## Rodar localmente

1. Instale Node.js 20.6+ e PostgreSQL. Crie o banco `codeburguer`.
2. Na pasta `backend`: `npm install` e `npm run setup:env`.
3. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no arquivo `backend/.env`.
4. Execute `npx sequelize-cli db:migrate` e `npm run dev`. A API usa a porta 3001.
5. Em outro terminal, na pasta `frontend`: `npm install` e `npm run dev`.
6. Acesse `/register` para cadastrar um usuario e `/login` para entrar. O proxy Vite encaminha `/api` ao backend.

O `backend/.env` nao deve ser enviado ao GitHub. Se uma senha de banco ja foi publicada no codigo, troque-a.

O armazenamento de JWT em `sessionStorage` e temporario para a etapa didatica; antes de producao, reavalie protecao XSS e politica de sessao.
