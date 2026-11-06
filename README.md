# Arsenal — munição para Owlbear Rodeo
## Instalação
Ative o GitHub Pages na branch main, pasta raiz, e instale https://Onze1Onze.github.io/manifest.json na sala. A versão atual é 1.5.0.
## Uso
Selecione exatamente um token da camada Personagem. A barra aparece à esquerda, abaixo da região Players, e fecha ao desselecionar, selecionar vários itens, apagar o token ou fechar a cena.
Clique nas balas para gastar ou devolver. A engrenagem configura capacidade (1–60) e formato de pistola, fuzil ou revólver. A configuração expande temporariamente a mesma janela.
Não há ação no menu superior, menu de contexto, botão de recarga ou de esvaziar.
Pentes têm rolagem horizontal; revólveres usam tambores circulares de até 12 posições, também acessíveis por rolagem horizontal. Dados anteriores são preservados na chave com.onze1onze.arsenal/ammo.
## Posição
A barra permanece fixa na interface ao mover a câmera. O SDK não permite consultar os limites reais do painel Players: a posição usa uma estimativa baseada na quantidade de jogadores conectados e é limitada pela altura da tela. Painéis do Owlbear recolhidos ou com rolagem podem diferir dessa estimativa.
## Dados
A munição é salva nos metadados do token e sincronizada pelo Owlbear. Permissões de edição são respeitadas. Edições simultâneas de clientes diferentes podem se sobrescrever. O SDK oficial 2.3.0 é carregado via esm.sh.
## Desenvolvimento
Sem build. Execute npm test com Node 18+. Os testes cobrem estado, posicionamento dos tambores e concorrência da seleção com SDK simulado. O teste em uma sala real continua necessário para validar a integração e posição visual.
