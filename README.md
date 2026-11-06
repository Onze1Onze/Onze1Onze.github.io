# Arsenal — contador de munição para Owlbear Rodeo
Extensão estática, em português, com munição independente em cada token de personagem.

## Instalação
1. No GitHub, abra Settings → Pages e escolha Deploy from a branch, branch main, pasta / (root).
2. Aguarde o GitHub Pages publicar os arquivos.
3. No Owlbear Rodeo, adicione a extensão personalizada com a URL:
   https://Onze1Onze.github.io/manifest.json
4. Habilite a extensão na sala e abra uma cena.

## Uso
Selecione um único token na camada Personagem: o painel abre automaticamente. Também é possível usar “Munição” no menu do token ou o botão da extensão.
Clique nas balas grandes para alternar entre carregada e gasta. O contador acompanha a quantidade restante.
Use a engrenagem para escolher capacidade de 1 a 60 e formato de pistola, fuzil ou tambor de revólver.
“Recarregar” restaura todas as balas; “Esvaziar” apaga todas.
Ao reduzir a capacidade, as posições excedentes são removidas; ao aumentar, novas posições são carregadas.
Tambores grandes usam círculos concêntricos e ícones menores para caber no painel.

## Dados e permissões
Os dados ficam nos metadados do token, na chave com.onze1onze.arsenal/ammo, e são sincronizados pelo Owlbear Rodeo.
As permissões de edição do token são respeitadas. Uma falha de gravação aparece no painel.
Evite editar o mesmo token simultaneamente: alterações concorrentes podem se sobrescrever.
Nenhum dado é enviado a planilhas ou serviços de telemetria.
O SDK oficial 2.3.0 é importado de esm.sh; conexão à internet é necessária.

## Organização
- manifest.json: configuração da extensão.
- background.html e src/background.js: seleção e menu de contexto.
- index.html, styles.css e src/app.js: painel e configurações.
- src/state.js: regras de capacidade e munição.
- tests/state.test.js: testes das regras.
- icon.svg: ícone.
- .nojekyll: publicação estática sem Jekyll.

Execute os testes com Node.js 18 ou superior: `npm test`.
O projeto não exige build. Para testar a integração, use hospedagem HTTPS e uma sala do Owlbear Rodeo.
Verifique seleção de token, alternância das balas, três layouts, recarga, reabertura da sala e sincronização em um segundo cliente.
O conteúdo anterior foi substituído e permanece recuperável no histórico Git.

## Painel compacto (1.1)
O painel de 280 × 300 px fica à direita do token. A posição é recalculada a cada 100 ms para acompanhar câmera, zoom e movimento do personagem. Clicar no mapa não solta o personagem vinculado. Quando não há espaço para o painel inteiro ao lado do token, ele fica oculto e reaparece ao voltar a essa região. A integração visual deve ser conferida na sala após atualizar.


## Painel fixo e compacto (1.3)
O painel mede 230 × 240 px e é aberto ao lado do token no instante da seleção. Depois de aberto, permanece fixo na tela enquanto a câmera se move ou aplica zoom; selecionar outro token reposiciona o painel uma vez.
