# Writing Engine

Um editor de texto simples que exporta PDF a partir de um template HTML seu.

Você escreve em texto puro, marcando o que precisa com códigos curtos como `{b:negrito}`. O editor
mostra o resultado ao lado, dentro do template que você abriu, e imprimir esse resultado gera o PDF. O
template é um HTML comum — a tipografia, as margens e o tamanho da página são seus, definidos em CSS.

Além de servir como editor, tanto o comportamento do editor quanto a aparência do documento são
configuráveis: as tags e a sintaxe vivem em `scripts/configs.js`, e o layout vive no template.

## Como rodar

É um site estático: sete scripts, um CSS e um HTML, sem build e sem dependências. Precisa ser
**servido**, não aberto por `file://`, porque usa IndexedDB e a File System Access API:

```
python3 -m http.server 8000
```

e abrir `http://localhost:8000`. Funciona em navegadores Chromium (Chrome, Edge). No Firefox o editor
abre, mas abrir e salvar arquivos ficam indisponíveis.

Nada vai para servidor nenhum. O texto, o template e as preferências ficam no IndexedDB do navegador,
e os arquivos são lidos e gravados direto no disco pelos diálogos nativos.

## O básico

O editor tem duas metades: à esquerda o texto, à direita o preview dentro do template.

1. **Options → Open Template...** escolhe o HTML que dá forma ao documento.
2. **Options → New Text...** ou **Open Text...** escolhe onde o texto vive.
3. Escreva. Cada linha é um parágrafo.
4. **Options → Export To PDF...** abre a impressão do navegador; escolha "Salvar como PDF".

`Ctrl+S` salva, `Ctrl+Shift+S` salva como, `Ctrl+O` abre. O asterisco ao lado do nome do arquivo
indica alteração não salva, e fechar a aba nesse estado pede confirmação.

## Tags

Uma tag é `{alias:conteúdo}`:

```
{1:Capítulo Primeiro}
Uma linha com {b:negrito}, {i:itálico} e {u:sublinhado}.
{c:isto é um comentário e não aparece no PDF}
```

Tags aninham (`{b:{i:ambos}}`) e o conteúdo pode atravessar linhas. Para escrever uma chave literal,
use a barra: `\{`, `\}` e `\\`.

Clique direito no editor abre um menu com as tags e o botão de metadata. Os atalhos são `Ctrl+B`,
`Ctrl+I`, `Ctrl+U` e `Ctrl+1` a `Ctrl+3`. Aplicar duas vezes remove a tag.

As tags que vêm configuradas:

| Alias | Vira | O que faz |
|---|---|---|
| `1` `2` `3` | `h1` `h2` `h3` | títulos |
| `b` `i` `u` `s` | `b` `i` `u` `s` | negrito, itálico, sublinhado, riscado |
| `stanza` | `div.stanza` | bloco de versos, cada linha um parágrafo |
| `c` | — | comentário: fica no texto, não vai para o PDF |
| `doubleR` | `ℝ` | troca a tag por um caractere fixo |

## Metadata

Um bloco no topo do arquivo, entre linhas de `---`:

```
---
title: O Porto
author: Henry
date: 2026-07
lang: pt-BR
---
```

Cada chave alimenta o placeholder `$chave$` no template, e `$body$` recebe o texto convertido. O botão
de metadata no menu de contexto insere o bloco já com as chaves que o template espera — ele lê os
`$...$` do próprio template.

## Configurando o editor

Tudo em `scripts/configs.js`. Adicionar uma tag é editar só esse arquivo:

```js
bold: {
    values: ["b", "bold"],              // aliases; o primeiro é o que o editor insere
    button: {                           // opcional: sem isso a tag não aparece na UI
        container: "contextMenu",       // "contextMenu" (ícone) | "titlesDropdown" (texto)
        label: "Bold",
        shortcut: "b",                  // Ctrl+B, e compõe o tooltip
        icon: "M15.6 10.79c...",        // path de um SVG 24x24
    },
    replacement: {
        type: "htmlTag",                // "htmlTag" | "text" | "none"
        value: "b",
        contentLineWrapping: {          // envolve cada linha do conteúdo
            value: "p",
        },
    },
},
```

Os três tipos de `replacement`:

- **`htmlTag`** vira um elemento. Com `block: true` ele fecha a linha antes de abrir (títulos,
  estrofes); com `classes` recebe classes que o CSS do template estiliza.
- **`text`** descarta o conteúdo e o troca por `value` — útil para símbolos.
- **`none`** não gera saída: é o comentário.

Os caracteres da sintaxe também são configuração, e mudá-los muda a linguagem inteira de uma vez:

```js
const tagSyntax = {
    open: "{",
    close: "}",
    separator: ":",
    escape: "\\",
};
```

Outros ajustes no mesmo arquivo: `defaultLineWrapping` (o que envolve cada linha no topo do
documento), `metadataFence`, `defaultTheme`, `previewDebounceDelay` e o par
`highlightWindowSize`/`highlightWindowStep`.

## Configurando o template

O template é HTML puro com `$body$` e os `$chave$` da sua metadata. É onde ficam a tipografia, o
tamanho da página e as margens — via `@page` do CSS de impressão. Veja `template-example.html`.

Como o template roda no preview como um documento de verdade, o `<script>` dele também roda: o
exemplo usa isso para formatar a data e trocar as aspas retas por curvas. É o que dá o poder — e o
motivo de tratar template como código de confiança, já que ele tem acesso à mesma origem do editor.

## Como funciona por dentro

Sete scripts carregados com `defer`, na ordem em que dependem um do outro:

| Arquivo | Papel |
|---|---|
| `elements.js` | referências do DOM |
| `configs.js` | tags, sintaxe, chaves do IndexedDB, textos da UI |
| `indexed-db.js` | `dbGet`/`dbSet`/`dbDelete`, que degradam com aviso em vez de estourar |
| `utils.js` | parser, renderização, arquivos, diálogos |
| `handlers.js` | um `handleX` por evento |
| `listeners.js` | liga evento a handler |
| `init.js` | estado mutável e bootstrap |

O editor são duas camadas empilhadas: um `<textarea>` de texto transparente sobre um `<pre>` que
recebe o texto colorido. A invariante que sustenta isso é
`editorHighlight.textContent === editorInput.value` — os dois têm exatamente os mesmos caracteres, ou
o caret desalinha do que se vê.

Duas funções fazem o trabalho:

- **`computeText()`** — o texto mudou: separa metadata do corpo, mapeia os pares de tags e redesenha o
  highlight.
- **`computeTemplate()`** — troca `$chave$` pela metadata e `$body$` pelo texto convertido, e joga no
  `srcdoc` do preview.

Duas otimizações que moldam o código, ambas medidas num documento de 500KB:

- Mover o caret não redesenha nada quando a tag sob ele não mudou (105,8ms → 0,1ms), e o highlight só
  cria `<span>` numa janela ao redor do caret. Fora da janela o texto sai escapado de uma vez. Como
  todos os caracteres continuam lá, errar a janela nunca desalinha o caret — no pior caso um trecho
  fica sem cor até você clicar nele.
- O preview espera `previewDebounceDelay` antes de reconstruir, porque trocar o `srcdoc` recarrega o
  iframe, e o scroll é restaurado depois da recarga.

## Limites conhecidos

- **Precisa ser servido** e é Chromium-only para abrir/salvar, como dito acima.
- **A permissão de escrita não sobrevive ao reload.** O arquivo é lembrado, a permissão não: o
  primeiro salvamento depois de um F5 pede confirmação ao navegador.
- **O texto não salvo não sobrevive ao reload.** O IndexedDB guarda o que foi aberto ou salvo, não o
  que está sendo digitado.
- **`Ctrl+N` não existe** — o Chrome reserva esse atalho e o evento não chega à página.
- **Clique direito não mostra as sugestões de ortografia**, porque o menu de contexto do editor ocupa
  o lugar do menu nativo.
- **Numeração de página no rodapé não funciona.** `@bottom-center` com `counter(page)` é Paged Media,
  que nenhum navegador implementa; sai em engines como PrinceXML ou WeasyPrint.
- **Metadata dentro de `<script>`.** Os valores são escapados como HTML, o que resolve texto e
  atributo; dentro de um `<script>` o parser de JS não interpreta entidades, então um apóstrofo no
  valor quebraria o script do template.
- **Uma linha inválida invalida o bloco de metadata inteiro**, silenciosamente.

## Próximos passos

- Importar as configurações de um arquivo, em vez de editar `configs.js`
- Painel mostrando as tags configuradas e avisos de configuração
- Autocomplete ao digitar o caractere de abertura
- Reposicionar a janela do highlight ao rolar, não só ao mover o caret
