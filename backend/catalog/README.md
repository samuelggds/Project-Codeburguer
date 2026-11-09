# Catálogo inicial da loja

Esta importação cadastra no PostgreSQL os produtos que já aparecem na home e nos cardápios. Eles passam a aparecer em **Listar produtos** e podem ser editados, marcados como oferta ou excluídos pelo administrador. As categorias ficam disponíveis no formulário de cadastro.

| Categoria | Produtos |
| --- | ---: |
| Hambúrgueres | 11 |
| Bebidas | 9 |
| Sobremesas | 11 |
| Entradas | 9 |
| **Total** | **40** |

Os quatro produtos da home — X-Tudo especial da casa, Waffles, Panquecas e Misto-quente — entram como ofertas. Os preços são os mesmos da vitrine; R$ 35,90 é armazenado como `35.90`. As imagens originais acompanham o catálogo, inclusive as composições com duas fotos e o combo de nuggets.

## Importar

Na pasta `backend`, com as dependências instaladas e o `.env` apontando para o banco que sua API utiliza:

```sh
node --env-file=.env ./node_modules/sequelize-cli/lib/sequelize db:migrate
npm run seed:catalog
```

Depois, atualize a página do dashboard. Se a API não estiver rodando, inicie-a com `npm run dev`.

O comando copia as imagens para `backend/uploads` e cadastra as categorias e produtos em uma transação. Não cria contas, não altera permissões de administrador e não cria pedidos. Ele é executado explicitamente, sem importar dados a cada inicialização do servidor.

## Repetir a importação

Uma tabela de controle identifica os itens por suas chaves de origem. Repetir o comando não duplica itens importados nem sobrescreve alterações feitas no dashboard. Produtos importados que foram excluídos também não são recriados.

Categorias existentes de mesmo nome são reutilizadas. Produtos com o mesmo nome podem ser itens distintos no cardápio original; por isso a identificação usa a chave do item, e não somente o nome. Produtos cadastrados manualmente não são substituídos.

Mantenha a tabela de controle da importação: remover esse histórico elimina a garantia de que uma próxima execução reconheça itens já importados.

## Conferir ou atualizar o pacote

A importação não depende do frontend instalado. O manifesto e suas imagens já estão incluídos nesta pasta.

Para validar o pacote sem conectar ao banco, execute na pasta `backend`:

```sh
node scripts/seed-catalog.cjs --dry-run
```

Para conferir a correspondência com os arquivos atuais da vitrine, na raiz do repositório:

```sh
node backend/catalog/build-catalog.mjs --check
```

O gerador lê os módulos locais da home e dos cardápios, preservando chaves, preços, categorias e imagens. Para atualizar o pacote após uma mudança intencional nesses dados, execute o mesmo comando sem `--check` e revise o diff. Atualizar o pacote não substitui registros que já foram importados e editados no banco.

## Limite desta etapa

A importação fornece os registros iniciais ao painel. A home e os cardápios ainda usam os dados demonstrativos locais; alterações no dashboard não aparecem automaticamente na vitrine. O checkout continua sendo uma simulação, sem enviar pedidos ao PostgreSQL.

## Prévias

Capturas com o catálogo importado em um banco PostgreSQL de teste e servido pela API real:

![Produtos importados no dashboard](../../frontend/docs/admin-catalog-initial.png)

![Categorias disponíveis no cadastro](../../frontend/docs/admin-catalog-categories.png)
