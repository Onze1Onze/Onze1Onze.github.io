# Arsenal — munição para Owlbear Rodeo
## Instalação
Ative o GitHub Pages na branch main, pasta raiz, e instale https://Onze1Onze.github.io/manifest.json na sala. A versão atual é 1.7.0.
## Uso
Selecione exatamente um token da camada Personagem. A barra aparece à esquerda, abaixo da região Players, e fecha ao desselecionar, selecionar vários itens, apagar o token ou fechar a cena.
Clique nas balas para gastar ou devolver. A engrenagem escolhe a arma com capacidade fixa. A configuração expande temporariamente a mesma janela.
Não há ação no menu superior, menu de contexto, botão de recarga ou de esvaziar.
Pentes têm rolagem horizontal; o revólver usa um tambor circular de 6 posições. Dados anteriores são preservados na chave com.onze1onze.arsenal/ammo.
## Posição
A barra permanece fixa na interface ao mover a câmera. O SDK não permite consultar os limites reais do painel Players: a posição usa uma estimativa baseada na quantidade de jogadores conectados e é limitada pela altura da tela. Painéis do Owlbear recolhidos ou com rolagem podem diferir dessa estimativa.
## Dados
A munição é salva nos metadados do token e sincronizada pelo Owlbear. Permissões de edição são respeitadas. Edições simultâneas de clientes diferentes podem se sobrescrever. O SDK oficial 2.3.0 é carregado via esm.sh.
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

## Handouts (1.12.0)
A bandeja Handouts fica no alto à direita. O mestre clica Teclado de porta para adicionar um teclado ao centro da cena (senha inicial 1998); jogadores usam a opção para ativar a ferramenta de interação. Clique nas teclas do objeto no mapa com essa ferramenta ativa. C limpa e ✓ confirma. O estado do teclado é compartilhado na cena.
O mestre configura pela engrenagem na lista ou pelo menu de contexto do teclado: nome, senha de 1 a 8 dígitos, sempre por cima, reiniciar, resolver, liberar movimento e remover. A senha fica no localStorage do navegador do mestre criador, nunca no SVG nem nos metadados compartilhados. Esse mestre deve estar conectado para validar tentativas; em outro navegador, configure uma nova senha. O controle de configurações valida o papel GM e a conexão local antes de aceitar comandos. Não se trata de um cofre de segurança contra clientes modificados do Owlbear.
Não há destravamento automático de outros objetos nesta primeira versão. O teclado indica ABERTO ao acertar. Para mover, libere o item e use a ferramenta de seleção do Owlbear. A bandeja pode ser recolhida pelo botão −.
