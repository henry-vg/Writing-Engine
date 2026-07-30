# 1.0.0

- [DONE] Configuração genérica de tags
- [DONE] Tag para comentários
- [PENDING] Escape de tags
- [PENDING] Inserção/remoção de tags
- [PENDING] Atualização do preview pelo template
- [PENDING] Handlers que faltam
    - [PENDING] New Text
    - [PENDING] Save Text
    - [PENDING] Save Text As
    - [PENDING] Close Text
    - [PENDING] Close Template
- [PENDING] Revisar style.css

# 1.x.x

- [1.1.0] Importação de arquivo de configuração
    - Tags padrão (bold, italic, underline...)
- [1.2.0] Painel com informações das configurações (tags, warnings...)
    - tags, type, values, replacements, warnings/errors...
- [1.3.0] Autocomplete ao digitar "{"
- [1.4.0] Highlight só no texto visível

---

# Notes

- **Configuração Genérica de Tags**

    ```jsonc
    /* const tags = */ {
        "stanza": {
            "values": [
                "stanza"
            ],
            "replacement": {
                "type": "tag",
                "value": "div",
                "classes": [
                    "stanza"
                ],
                "contentLineWrapping": {
                    "value": "p",
                    "classes": []
                }
            }
        },
        "doubleR": {
            "values": [
                "doubleR"
            ],
            "replacement": {
                "type": "text",
                "value": "\u211d"
            }
        }
    }
    ```