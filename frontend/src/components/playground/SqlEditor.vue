<script setup lang="ts">
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { MSSQL, MySQL, PostgreSQL, SQLite, sql as sqlLang } from '@codemirror/lang-sql';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import type { SupportedDialect } from '@shared/types';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ modelValue: string; dialect: SupportedDialect }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; run: [] }>();

const container = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

/** Resolves CodeMirror SQL dialect extension matching the active dialect. */
function dialectFor(dialect: SupportedDialect) {
  switch (dialect) {
    case 'postgresql':
      return PostgreSQL;
    case 'mysql':
    case 'mariadb':
      return MySQL;
    case 'mssql':
      return MSSQL;
    default:
      return SQLite;
  }
}

const theme = EditorView.theme(
  {
    '&': {
      color: 'var(--color-text)',
      backgroundColor: 'transparent',
      fontSize: '0.875rem',
      height: '100%',
    },
    '.cm-content': { fontFamily: 'var(--font-mono)', caretColor: 'var(--color-primary-500)', padding: '1rem 0' },
    '.cm-cursor': { borderLeftColor: 'var(--color-primary-500)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--color-text-tertiary)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-primary-500) 6%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-text-secondary)' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);

function buildExtensions() {
  return [
    lineNumbers(),
    foldGutter(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    autocompletion(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...completionKeymap,
      indentWithTab,
      {
        key: 'Mod-Enter',
        run: () => {
          emit('run');
          return true;
        },
      },
    ]),
    sqlLang({ dialect: dialectFor(props.dialect), upperCaseKeywords: true }),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) emit('update:modelValue', update.state.doc.toString());
    }),
    EditorView.lineWrapping,
  ];
}

onMounted(() => {
  if (!container.value) return;
  view = new EditorView({
    state: EditorState.create({ doc: props.modelValue, extensions: buildExtensions() }),
    parent: container.value,
  });
});

onBeforeUnmount(() => view?.destroy());

/* Synchronize syntax highlighter when dialect changes. */
watch(
  () => props.dialect,
  () => {
    if (!view) return;
    const selection = view.state.selection;
    view.setState(EditorState.create({ doc: view.state.doc, extensions: buildExtensions(), selection }));
  },
);

/* Synchronize external model value updates into editor state. */
watch(
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  },
);

/** Insert text at cursor position or target offset. */
function insertAtCursor(text: string, pos?: number) {
  if (!view) return;
  const at = pos ?? view.state.selection.main.head;
  view.dispatch({ changes: { from: at, insert: text }, selection: { anchor: at + text.length } });
  view.focus();
}

function handleDrop(event: DragEvent) {
  const text = event.dataTransfer?.getData('text/plain');
  if (!text || !view) return;
  event.preventDefault();
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.doc.length;
  insertAtCursor(text, pos);
}

defineExpose({ insertAtCursor });
</script>

<template>
  <div
    ref="container"
    class="overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80"
    @dragover.prevent
    @drop="handleDrop"
  />
</template>
