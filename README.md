# TODOs

## Configurar o CodeMirror

O editor agora é o CodeMirror 5.65.21, com o fonte em `vendor/codemirror/` (script clássico, sem build,
funciona por `file://`). Está rodando com as opções padrão, e três coisas que funcionavam pararam até
configurarmos:

- Ligar `lineWrapping`: hoje linha longa rola na horizontal em vez de quebrar
- Devolver a cor às tags e à metadata, agora como modo do CodeMirror
- Devolver efeito ao botão de spellcheck: exige `inputStyle: "contenteditable"` e `spellcheck: true`

Também sumiu o duplo clique que aparava os espaços da seleção; agora vale a seleção de palavra do
próprio CodeMirror.

## Geral

- Remover elementos de metadada se vazios no template
- Adicionar template padrão
- Rever menu
- Não atualizar preview se não estiver visível
- Adicionar opções para fonte no editor
- Adicionar imagens
- Adicionar atalhos de editor
    - Duplicar linha
    - Remover linha
    - Multicursores
    - Highlight em palavras iguais
    - Change all occurences
- Escrever README.md
- Escrever help
- Corrigir desalinhamento de ctrl+f no browser
- Recuar 4 espaços com tab
- Description de metadata na tooltip