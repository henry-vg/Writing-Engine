# 1.0.0

- [DONE] Configuração genérica de tags
- [DONE] Tag para comentários
- [DONE] Atualização do preview pelo template
- [DONE] Toolbar e atalhos gerados pela config
- [PENDING] Escape de tags
- [PENDING] Inserção/remoção de tags
    - `handleFormattingButtonClick` está vazia; base em `old/addEditorTag.js`
    - preservar o undo (atribuir `editorInput.value` zera a pilha)
- [PENDING] Handlers que faltam
    - [DONE] Close Text
    - [DONE] Close Template
    - [PENDING] New Text
    - [PENDING] Save Text
    - [PENDING] Save Text As
    - [PENDING] Confirmação antes de fechar texto/template
- [PENDING] Persistir o buffer em edição
    - hoje o `dbSet` só roda ao abrir o arquivo, então F5 perde o texto não salvo apesar do `*`
- [PENDING] Preview: debounce + preservar o scroll
    - hoje o `srcdoc` recarrega o iframe a cada tecla e o scroll volta ao topo
- [PENDING] Highlight: não reescrever o `innerHTML` inteiro a cada `selectionchange`
- [PENDING] Revisar style.css

# 1.x.x

- [1.1.0] Importação de arquivo de configuração
    - Tags padrão (bold, italic, underline...)
- [1.2.0] Painel com informações das configurações (tags, warnings...)
    - tags, type, values, replacements, warnings/errors...
    - hoje uma linha inválida invalida o bloco de metadata inteiro, sem aviso
- [1.3.0] Autocomplete ao digitar "{"
- [1.4.0] Highlight só no texto visível

---

# Limitações Conhecidas

- **Rodapé com número de página** — o `@bottom-center` com `counter(page)` do `template-example.html`
  é margin box de Paged Media, que nenhum navegador implementa. Na impressão esse rodapé não sai; só
  funcionaria em engines como PrinceXML/WeasyPrint.
- **Templates são código confiável** — o preview é um iframe `srcdoc` sem `sandbox` (necessário para o
  `contentWindow.print()`), então o `<script>` do template roda same-origin e alcança o editor.
- **Metadata vai crua para o template** — `$chave$` é substituída sem escape, logo um valor com `<`
  altera a estrutura do HTML gerado.

---

# Notes

- **Configuração Genérica de Tags**

    Uma tag é reconhecida como `{alias ` + conteúdo + `}` (o espaço faz parte do delimitador). Os
    aliases aceitam letras e dígitos. Adicionar uma tag exige editar apenas `configs.js`.

    ```jsonc
    /* const defaultLineWrapping = */ { "value": "p", "classes": [] } // envolve cada linha no topo do documento

    /* const tags = */ {
        "bold": {
            "values": ["b", "bold"],            // aliases; values[0] é o que a toolbar insere
            "button": {                         // opcional: sem isso a tag não aparece na UI
                "container": "toolbar",         // "toolbar" (ícone) | "titlesDropdown" (texto)
                "label": "Bold",
                "shortcut": "b",                // Ctrl+B; também compõe o tooltip
                "icon": "M15.6 10.79c..."       // path do SVG 24x24; só no container "toolbar"
            },
            "replacement": {
                "type": "htmlTag",              // "htmlTag" | "text" | "none"
                "value": "b",
                "contentLineWrapping": {        // envolve cada linha do conteúdo
                    "value": "p",
                    "classes": []
                }
            }
        },
        "title1": {
            "values": ["1", "title1", "title"],
            "button": {
                "container": "titlesDropdown",
                "label": "Title 1",
                "shortcut": "1"
            },
            "replacement": {
                "type": "htmlTag",
                "value": "h1",
                "block": true                   // fecha a linha aberta antes de abrir
            }
        },
        "stanza": {
            "values": ["stanza"],
            "replacement": {
                "type": "htmlTag",
                "value": "div",
                "block": true,
                "classes": ["stanza"],
                "contentLineWrapping": {
                    "value": "p",
                    "classes": []
                }
            }
        },
        "doubleR": {
            "values": ["doubleR"],
            "replacement": {
                "type": "text",                 // conteúdo é descartado e trocado por "value"
                "value": "ℝ"
            }
        },
        "comment": {
            "values": ["c", "comment"],
            "replacement": {
                "type": "none"                  // não gera saída; pintada como comentário no editor
            }
        }
    }
    ```
