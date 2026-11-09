# Projeto CodeBurguer / DevBurger

Frontend React + Vite e backend Node.js + Express + Sequelize, com **PostgreSQL como unico banco de dados**.

A home, as categorias e os cardápios consultam o catálogo público da API em `GET /catalog`, com produtos e categorias persistidos no PostgreSQL. O frontend precisa do backend em execução para exibir o catálogo. O [checkout demonstrativo](frontend/docs/CHECKOUT.md) utiliza esses produtos e preços, mas simula endereço e escolha de pagamento, sem enviar pedidos nem realizar cobranças.

O [painel administrativo](frontend/docs/ADMIN.md) usa a API: login de administrador abre pedidos; clientes entram na home. Inclui alteração de status, CRUD de produtos com descrição, imagem, categoria e oferta, além de cadastro e edição de categorias com nome, descrição e imagem. Marcar **Produto em oferta** publica o produto nas ofertas da home; a categoria selecionada define o cardápio em que ele aparece, pelo vínculo `category_id`.

Para começar com **40 produtos e 4 categorias** no painel e na vitrine, aplique as migrations e execute `npm run seed:catalog` na pasta `backend`. A [importação inicial](backend/catalog/README.md) inclui descrições, imagens e ofertas e preserva alterações quando executada novamente. Alterações salvas no painel passam a aparecer na loja, inclusive em outra aba aberta; sem registros, a vitrine apresenta um catálogo vazio.

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
4. Execute `node --env-file=.env ./node_modules/sequelize-cli/lib/sequelize db:migrate` para aplicar todas as migrations, incluindo preços em reais e os metadados do catálogo.
5. Execute `npm run seed:catalog` para carregar o catálogo inicial, depois `npm run dev`. A API usa a porta 3001.
6. Em outro terminal, na pasta `frontend`: `npm install` e `npm run dev`.
7. Acesse a home para consultar o catálogo, `/register` para cadastrar um usuário e `/login` para entrar. O proxy Vite encaminha `/api` ao backend.

O `backend/.env` nao deve ser enviado ao GitHub. Se uma senha de banco ja foi publicada no codigo, troque-a.

O armazenamento de JWT em `sessionStorage` e temporario para a etapa didatica; antes de producao, reavalie protecao XSS e politica de sessao.
