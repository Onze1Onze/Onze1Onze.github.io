# Extensão Owlbear Rodeo: Status Tracker (HP & Sanidade)

Esta extensão para Owlbear Rodeo exibe uma foto selecionável e barras de Vida (HP) e Sanidade (SAN) no canto inferior esquerdo da tela, com os dados sincronizados automaticamente a partir de uma planilha do Google Sheets.

## Arquivos da Extensão

O pacote da extensão é composto pelos seguintes arquivos:

| Arquivo | Descrição |
| :--- | :--- |
| `manifest.json` | O arquivo de configuração principal da extensão. |
| `index.html` | A interface do usuário (UI) e a lógica de integração com o Owlbear Rodeo SDK e o Google Sheets. |
| `icon.svg` | Ícone da extensão (usado no menu de ações). |
| `icon.png` | Ícone da extensão (usado no manifest). |
| `README.md` | Este guia de instalação e configuração. |

## 1. Configuração da Planilha Google Sheets

A extensão espera que os dados de HP e Sanidade estejam em um formato específico para que a leitura seja feita corretamente.

### Estrutura de Dados

A extensão lê a **segunda linha (linha 2)** da planilha, assumindo que os valores estão nas seguintes colunas:

| Coluna | Dado Esperado | Exemplo de Valor |
| :--- | :--- | :--- |
| **A** | HP Atual | `10` |
| **B** | HP Máximo | `20` |
| **C** | Sanidade Atual | `5` |
| **D** | Sanidade Máxima | `10` |

**Importante:** A extensão lê apenas a linha 2. As células devem conter apenas números.

### Compartilhamento da Planilha

Para que a extensão consiga ler os dados, a planilha deve estar **pública para visualização**.

1.  Na sua planilha do Google Sheets, clique em **"Compartilhar"**.
2.  Em "Acesso geral", mude para **"Qualquer pessoa com o link"**.
3.  Certifique-se de que a permissão esteja como **"Leitor"**.

## 2. Hospedagem da Extensão

O Owlbear Rodeo exige que o arquivo `manifest.json` esteja hospedado em um servidor web público com HTTPS. Você pode usar serviços gratuitos como **GitHub Pages**, **Netlify** ou **Vercel**.

1.  Crie uma pasta com todos os arquivos (`manifest.json`, `index.html`, `icon.svg`, `icon.png`).
2.  Hospede essa pasta em um serviço de sua preferência.
3.  Anote o **URL completo** do seu arquivo `manifest.json` (ex: `https://seu-usuario.github.io/status-tracker/manifest.json`).

## 3. Instalação no Owlbear Rodeo

1.  Abra o Owlbear Rodeo.
2.  Clique no ícone de **Extensões** (geralmente um quebra-cabeça).
3.  Clique em **"Adicionar Extensão Personalizada"**.
4.  Cole o **URL completo** do seu `manifest.json` (obtido na etapa 2).
5.  Clique em **"Adicionar"**.

## 4. Uso e Configuração da Extensão

Após a instalação, um novo ícone aparecerá no canto superior esquerdo do Owlbear Rodeo.

1.  Clique no ícone da extensão para ativá-la.
2.  A interface de status aparecerá no canto inferior esquerdo.
3.  **Clique na área da foto** para abrir o painel de configurações.
4.  Preencha os campos:
    *   **URL da Imagem:** O link direto para a foto do seu personagem.
    *   **ID da Planilha Google:** O ID da sua planilha. Você o encontra na URL da planilha, entre `/d/` e `/edit` (ex: `https://docs.google.com/spreadsheets/d/`**`SEU_ID_AQUI`**`/edit`).
    *   **Nome da Aba:** O nome exato da aba (página) da planilha onde estão os dados (ex: `Página1`).
5.  Clique em **"Salvar"**.

A extensão começará a buscar os dados da sua planilha a cada 5 segundos e atualizará as barras de HP e Sanidade.

---
**Nota:** O código usa a técnica de exportação CSV do Google Sheets (`/gviz/tq?tqx=out:csv`) para ler os dados sem a necessidade de autenticação complexa (API Key ou OAuth), o que exige que a planilha esteja **pública para visualização**.
