# Painel administrativo

O painel usa a API e os registros do PostgreSQL. O visual segue as referências de pedidos, listagem e formulário com menu lateral escuro, seleção roxa e área de trabalho cinza.

## Login e acesso

- Login com admin: true abre /admin/pedidos.
- Login de cliente abre /.
- Visitante sem sessão é enviado a /login; cliente que digita uma rota /admin retorna à home.
- O painel verifica GET /admin/session antes de carregar o conteúdo. A API consulta o papel atual no banco; alterar sessionStorage ou incluir admin no JWT não concede permissão.
- Todas as alterações de produtos, categorias, uploads e status exigem administrador no servidor. Cadastro público continua criando apenas clientes.
- Sair remove a sessão e retorna ao login.

Use uma conta existente cujo campo users.admin seja true, provisionada pelo responsável pelo banco. Este PR não cria credenciais padrão nem promove contas automaticamente.

## Telas e comportamento

| Rota | Funções |
| --- | --- |
| /admin/pedidos | Todos, Em preparo e Entregues; ordenação; detalhes dos itens; mudança de status |
| /admin/produtos | Busca por nome, preço em reais, foto, oferta, edição e exclusão com confirmação |
| /admin/produtos/novo | Nome, descrição opcional, preço, imagem, categoria e oferta |
| /admin/produtos/:id/editar | Alteração dos campos e troca opcional da imagem |
| /admin/categorias | Busca por nome, imagem, nome, descrição e edição |
| /admin/categorias/novo | Nome, descrição e imagem da categoria |
| /admin/categorias/:id/editar | Alteração do nome e da descrição, com troca opcional da imagem |

Estados aceitos: Pedido realizado, Em preparação, Pronto, A caminho e Entregue. O filtro Em preparo reúne os pedidos ainda não entregues. A mudança só aparece como salva após confirmação da API; erros mantêm o valor anterior.

Uploads de produtos e categorias aceitam PNG, JPEG e WebP, até 5 MB. A API verifica extensão, MIME e assinatura do arquivo. No cadastro a imagem é obrigatória; na edição, a foto atual é preservada sem novo arquivo. A exclusão de um produto o remove da vitrine e do catálogo do banco, preservando os snapshots e imagens de pedidos anteriores. A administração de categorias permite cadastro e edição, sem exclusão.

Os nomes de produtos e categorias aceitam de 2 a 120 caracteres. A descrição do produto é opcional, com até 1.000 caracteres; a descrição da categoria é obrigatória no cadastro, com até 500 caracteres. A edição de categorias antigas permite uma descrição vazia.

As categorias do seletor vêm de `GET /categories`. Cadastre-as pelo menu **Categorias** antes de cadastrar produtos; quando o seletor está vazio, o formulário oferece um link para esse cadastro. A API usa `POST /categories`, `GET /categories/:id` e `PUT /categories/:id` para criar, carregar e editar. O nome, a descrição e o arquivo são enviados como `name`, `description` e `file`; o endereço público da categoria é gerado pelo servidor e permanece estável quando ela é renomeada.

Para começar com as quatro categorias e os 40 produtos iniciais, aplique as migrations e execute `npm run seed:catalog` na pasta `backend`. Veja as [instruções da importação](../../backend/catalog/README.md). Os IDs são atribuídos pelo banco e ficam disponíveis no seletor.

## Atualização do banco

A API passa a tratar products.price em **reais**, com DECIMAL(10,2), para aceitar valores como 29.90. O formulário aceita 29,90 e envia 29.90. A migration preserva os valores numéricos anteriores: 29 passa a 29.00, sem multiplicar ou dividir registros.

Na pasta backend, com backend/.env configurado:

    npm ci
    node --env-file=.env ./node_modules/sequelize-cli/lib/sequelize db:migrate
    npm run seed:catalog
    npm run dev

As migrations `20261108120000-product-price-decimal` e `20261108140000-add-live-catalog-metadata` devem ser aplicadas antes de usar estas telas. A primeira converte os preços e recusa rollback para INTEGER se houver centavos; a segunda adiciona descrições e endereços públicos estáveis às categorias. Ela preenche os metadados iniciais dos itens importados usando o histórico da importação, sem substituir nomes, preços, ofertas ou imagens alterados no painel.

Na pasta frontend:

    npm ci
    npm run dev

O proxy /api encaminha as chamadas e as imagens /api/product-file e /api/category-file ao backend na porta 3001. frontend/.env.example usa o nome de variável reconhecido pela aplicação: VITE_API_URL. Em produção, configure um proxy equivalente ou a URL de API com CORS autorizado.

## Publicação na vitrine

A home e os cardápios carregam produtos e categorias de `GET /catalog`, disponível sem autenticação. O checkbox **Produto em oferta** define quais produtos aparecem em **Ofertas do dia**. Cada produto aparece no cardápio da categoria selecionada por `category_id`; mudar a categoria no painel muda esse vínculo. As categorias cadastradas aparecem na navegação da loja e possuem cardápios próprios, mesmo quando ainda estão vazias.

Após uma alteração bem-sucedida no painel, a vitrine consulta os dados atualizados ao voltar à loja ou quando uma aba da loja recebe o aviso de alteração. Ela também atualiza ao recuperar o foco e periodicamente enquanto estiver visível. Falhas de API exibem um erro e opção de tentar novamente; não ativam um catálogo local alternativo. O carrinho usa os preços atuais e remove produtos que deixaram de existir após a atualização do catálogo.

O checkout permanece demonstrativo: usa os produtos da API, mas não envia pedidos nem processa pagamentos. A tela administrativa de pedidos mostra somente pedidos já recebidos pela API. Concluir o checkout demonstrativo não cria pedidos no PostgreSQL.

## Validação

Frontend:

    npm test
    npm run build
    npm run test:e2e

Backend:

    npm run test:admin
    npm run test:env

Os testes de navegador usam respostas de API controladas. Os testes de backend exercitam as rotas Express, JWT, permissões, validação, multipart e status, com modelos de banco e gravação de imagens simulados. Nenhum teste altera registros ou arquivos de um banco real. A migration não foi aplicada a um banco de produção.

## Prévias

Os registros das capturas abaixo são dados de teste usados apenas na revisão visual.

![Pedidos](admin-pedidos-desktop.png)

![Produtos](admin-produtos-desktop.png)

![Cadastro](admin-cadastro-desktop.png)

![Edição](admin-edicao-desktop.png)

![Cadastro mobile](admin-cadastro-mobile.png)
