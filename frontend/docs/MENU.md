# Cardápio por categoria

As categorias da home abrem suas próprias rotas:

| Categoria | Rota | Conteúdo nesta entrega |
| --- | --- | --- |
| Hambúrgueres | /cardapio/hamburgueres | Banner, nove produtos, favoritos e cesta |
| Bebidas | /cardapio/bebidas | Em breve |
| Sobremesas | /cardapio/sobremesas | Em breve |
| Entradas | /cardapio/entradas | Em breve |

/cardapio redireciona para hambúrgueres. Uma categoria desconhecida retorna à home.

![Cardápio em desktop, largura de 1440px](menu-desktop.png)

## Conteúdo e imagens

- Os arquivos PNG originais enviados ficam em src/features/menu/assets/images e foram preservados sem recortes ou recompressão.
- O banner preenche 100% da largura disponível, inclusive acima de 1440px, mantendo a proporção de 1440 × 415 e a transparência original. Somente o banner acompanha a largura da tela; as fotos dos produtos continuam limitadas ao tamanho nativo.
- Os nove cartões seguem os nomes e os preços da referência (R$35,90). Os dados ficam em src/features/menu/data/burgers.js.
- Foram recebidas oito fotos distintas de hambúrgueres, uma de nuggets e o banner. Os dois cartões chamados X-Tudo Duplo Frango usam a foto de frango recebida; o combo reúne as fotos do hambúrguer e dos nuggets em CSS.
- As estrelas indicam ausência de avaliações, sem notas fictícias.
- A fonte Road Rage é servida localmente; origem: https://github.com/google/fonts/tree/main/ofl/roadrage. A licença SIL OFL acompanha o arquivo.

## Comportamento

A cesta e os favoritos são compartilhados entre rotas. As seleções persistem em localStorage e continuam funcionando em memória quando o armazenamento está indisponível. A cesta mantém preços em centavos, aceita apenas produtos conhecidos e limita cada quantidade a 99.

Login, cadastro e logout continuam usando a autenticação existente. Os botões de cesta fazem apenas a seleção local; esta entrega não envia pedidos ao backend.

## Validação

Na pasta frontend:

- npm test
- npm run build
- npm run test:e2e

Os testes verificam as quatro rotas, navegação, imagens locais, cesta mista, persistência de favoritos, armazenamento bloqueado e larguras de 320 a 3840px. O banner ocupa toda a largura sem distorção; as fotos dos produtos não são ampliadas e a página não tem rolagem horizontal.
