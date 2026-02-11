<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores';

  let {
    value = $bindable(''),
    language = 'sql',
    placeholder = '',
  }: {
    value: string;
    language?: string;
    placeholder?: string;
  } = $props();

  let editorContainer: HTMLDivElement;
  let editor: import('monaco-editor').editor.IStandaloneCodeEditor | undefined;
  let monaco: typeof import('monaco-editor') | undefined;

  const monacoThemeMap = {
    colorful: 'bubble-colorful',
    light: 'vs',
    dark: 'vs-dark',
  } as const;

  $effect(() => {
    if (editor && monaco && $theme) {
      const themeName = monacoThemeMap[$theme] ?? 'vs-dark';
      monaco.editor.setTheme(themeName);
    }
  });

  onMount(async () => {
    monaco = await import('monaco-editor');

    /* Define custom colorful theme */
    monaco.editor.defineTheme('bubble-colorful', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'string', foreground: 'f9a8d4' },
        { token: 'number', foreground: '93c5fd' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'operator', foreground: '60a5fa' },
        { token: 'type', foreground: 'a78bfa' },
      ],
      colors: {
        'editor.background': '#0f1117',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#1a1d2740',
        'editor.selectionBackground': '#8b5cf640',
        'editorCursor.foreground': '#a78bfa',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#a78bfa',
      },
    });

    editor = monaco.editor.create(editorContainer, {
      value: value || placeholder,
      language,
      theme: monacoThemeMap[$theme] ?? 'vs-dark',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
      suggestOnTriggerCharacters: true,
      tabSize: 2,
      wordWrap: 'on',
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      bracketPairColorization: { enabled: true },
    });

    editor.onDidChangeModelContent(() => {
      value = editor?.getValue() ?? '';
    });

    /* Clear placeholder on first focus */
    if (value === '' && placeholder) {
      editor.onDidFocusEditorText(() => {
        if (editor?.getValue() === placeholder) {
          editor.setValue('');
        }
      });
    }

    return () => {
      editor?.dispose();
    };
  });
</script>

<div bind:this={editorContainer} class="h-full w-full"></div>
