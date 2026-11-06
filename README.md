# Arsenal — munição para Owlbear Rodeo
## Instalação
Ative o GitHub Pages na branch main, pasta raiz, e instale https://Onze1Onze.github.io/manifest.json na sala. A versão atual é 1.16.0.
## Uso
Selecione exatamente um token da camada Personagem. A barra aparece à esquerda, abaixo da região Players, e fecha ao desselecionar, selecionar vários itens, apagar o token ou fechar a cena.
Clique nas balas para gastar ou devolver. A engrenagem escolhe a arma com capacidade fixa. A configuração expande temporariamente a mesma janela.
A engrenagem permite escolher a arma e o botão ↻ recarrega o carregador.
Pentes têm rolagem horizontal; o revólver usa um tambor circular de 6 posições. Dados anteriores são preservados na chave com.onze1onze.arsenal/ammo.
## Posição
A barra permanece fixa na interface ao mover a câmera. O SDK não permite consultar os limites reais do painel Players: a posição usa uma estimativa baseada na quantidade de jogadores conectados e é limitada pela altura da tela. Painéis do Owlbear recolhidos ou com rolagem podem diferir dessa estimativa.
## Dados
A munição é salva nos metadados do token e sincronizada pelo Owlbear. Permissões de edição são respeitadas. Edições simultâneas de clientes diferentes podem se sobrescrever. O SDK oficial 3.1.0 é carregado via esm.sh.
## Desenvolvimento
Sem build. Execute npm test com Node 18+. Os testes cobrem estado, posicionamento dos tambores e concorrência da seleção com SDK simulado. O teste em uma sala real continua necessário para validar a integração e posição visual.

## Armas
| Arma | Balas | Layout |
| --- | ---: | --- |
| Pistola | 12 | Carregador compacto |
| Revólver | 6 | Tambor circular |
| Fuzil de Caça | 4 | Berço de cartuchos longos |
| Submetralhadora | 20 | Carregador estreito |
| Espingarda | 6 | Cartuchos largos de escopeta |
| Fuzil de Assalto | 30 | Carregador de duas colunas |
| Fuzil de Precisão | 1 | Cartucho longo horizontal |
| Metralhadora | 50 | Cinta de munição |
A capacidade não pode ser editada. Saraivada aparece apenas no Fuzil de Assalto e na Metralhadora; gasta exatamente 10 posições carregadas. Com menos de 10, o botão é desabilitado e a ação não altera os dados.
Cada arma preserva seu carregador por personagem ao trocar de arma. Uma arma nunca usada começa carregada. Dados antigos de fuzil são migrados para Fuzil de Caça; pistola e revólver preservam as posições compatíveis.
O tamanho da barra e a regra de posição abaixo de Players foram mantidos.

## Áudio e animação (1.7.0)
Gastar munição toca um disparo; devolver toca recarga. Cada uma das oito armas tem um perfil sonoro sintetizado próprio (grave, estalo, duração e sequência mecânica), sem gravações externas. Saraivada toca dez disparos no ritmo da arma. Os sons são locais para quem clica e só tocam após a gravação bem-sucedida; alterações recebidas de outros clientes e troca de arma ficam silenciosas. Áudio bloqueado ou indisponível não impede editar munição.
As balas e o contador recebem animações discretas; a preferência de movimento reduzido é respeitada. Tamanho, posição e controles foram preservados.

O botão ↻ restaura todas as balas do carregador da arma selecionada e toca o som de recarga correspondente; fica desabilitado quando o carregador já está cheio.

## Ficha do Google Sheets (1.15.0)
Selecione um token na camada Personagem, abra seu menu contextual nativo e escolha Vincular ficha. Cole o link completo do Google Sheets com a aba correta aberta (gid) e clique Verificar e salvar. A extensão verifica o acesso e os seis números antes de vincular. A planilha precisa permitir leitura sem login: compartilhar como Qualquer pessoa com o link / Leitor, ou publicar a aba na web. Não há OAuth nem edição da planilha. A configuração usa as permissões normais de edição do token. O link fica nos metadados compartilhados do token.

| Recurso | Atual | Máximo |
| --- | --- | --- |
| Vida | M9 (M9:N10) | Q9 (Q9:R10) |
| Sanidade | F9 (F9:G10) | J9 (J9:K10) |
| PE | T9 (T9:U10) | X9 (X9:Y10) |

Nas células mescladas, só o canto superior esquerdo contém o valor. Dados numéricos de fórmulas também são aceitos. A vinculação é individual por token, independente da munição. As barras aparecem à direita da identificação no rodapé esquerdo, fecham ao desselecionar e atualizam a cada 20 segundos enquanto abertas. Em telas estreitas, ficam acima da identificação para não se sobreporem.
Falhas mostram uma mensagem, sem substituir valores válidos por zero. Se já houve leitura bem-sucedida, valores antigos ficam esmaecidos até reconectar. Barras são limitadas visualmente a 0–100%, mas o texto mostra os números reais, inclusive Vida negativa ou pontos acima do máximo. Máximo zero resulta em barra vazia. Leituras param ao fechar ou trocar de personagem.
Links comuns usam a consulta pública gviz F9:X18 com headers=0; links publicados /d/e/ usam CSV da aba inteira e selecionam a linha 9. Publique apenas os dados que deseja expor. Uma cópia da ficha sem essas posições precisa ser adaptada. Publicação e cache do Google podem acrescentar atraso além dos 20 segundos.
Fonte da integração: https://developers.google.com/chart/interactive/docs/spreadsheets

## Defesas e condição de morte (1.16.0)
A ficha também mostra Deslocamento (P16:R18), Defesa (F16:I18), Bloqueio (L16:N18) e Esquiva (J16:K18). Os valores vêm das células P16, F16, L16 e J16; células vazias exibem —. Unidades formatadas, como 9 m, são preservadas quando fornecidas pelo Google.
O painel fica com 174 px de altura normalmente e 218 px durante Morrendo/Morto, mantendo a posição ao lado da identificação. Vida 0 ou negativa ativa Morrendo. Três botões no painel representam marcadores manuais de morte: ao marcar os três, o estado vira Morto. Eles podem ser desmarcados para corrigir cliques, e só funcionam com permissão de edição do token.
Vida positiva remove a condição e zera os marcadores, inclusive após Morto. A condição também é removida ao desvincular a ficha. Trocar de planilha reinicia o acompanhamento.
Um único GM conectado, eleito pelo identificador da sessão, consulta todos os tokens vinculados na cena a cada ciclo de cerca de 20 segundos, mesmo sem seleção. Em cenas grandes, a duração das consultas acrescenta atraso. Sem GM, a consulta no painel do personagem selecionado tenta sincronizar a condição usando as permissões desse usuário. Leituras que falham nunca equivalem a Vida 0. Caches e publicação do Google podem atrasar a detecção.
Uma caveira segue o token em Morrendo; em Morto ela fica maior e o efeito nativo de pós-processamento aplica escala de cinza nos limites do token. Os elementos são locais em cada cliente com a extensão ativa e usam os dados compartilhados da condição; respeitam a visibilidade e não interceptam cliques. Nenhum arquivo de imagem original é sobrescrito. Outros usuários precisam da extensão ativa para ver os efeitos. O shader é aplicado à área do token, podendo dessaturar também o fundo transparente dentro de seus limites.
Referência do efeito nativo: https://docs.owlbear.rodeo/extensions/reference/effects/

Esta versão usa o SDK oficial 3.1.0, que disponibiliza Billboard e Effect para os indicadores de condição.
