# TODOs

O editor é o CodeMirror 5.65.21, com o fonte em `vendor/codemirror/` (script clássico, sem build,
funciona por `file://`). As opções ficam em `editorOptions`, e os atalhos do editor em
`editorShortcuts`, ambos no `configs.js`.

- Remover elementos de metadada se vazios no template
- Adicionar template padrão
- Rever menu
- Não atualizar preview se não estiver visível
- Adicionar opções para fonte no editor
- Adicionar imagens
- Escrever README.md
- Escrever help
- Recuar 4 espaços com tab
- Description de metadata na tooltip
- Devolver o duplo clique que aparava os espaços da seleção, se fizer falta
- verificar se estamos fazendo algo que o codemirror já faz sozinho (não queremos reinventar a roda)