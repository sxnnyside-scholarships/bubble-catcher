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
  let editor = $state<import('monaco-editor').editor.IStandaloneCodeEditor | undefined>(undefined);
  let monaco: typeof import('monaco-editor') | undefined;
  let isInternalChange = false;

  const monacoThemeMap = {
    colorful: 'bubble-colorful',
    light: 'bubble-light',
    dark: 'bubble-dark',
  } as const;

  /* Sync theme changes to Monaco */
  $effect(() => {
    if (editor && monaco && $theme) {
      const themeName = monacoThemeMap[$theme] ?? 'vs-dark';
      monaco.editor.setTheme(themeName);
    }
  });

  /* Sync external value changes (e.g. saved query injection) into Monaco */
  $effect(() => {
    if (!editor) return;
    const current = editor.getValue();
    /* Don't overwrite placeholder with empty string — placeholder is intentional */
    if (value === '' && placeholder && current === placeholder) return;
    if (value !== current) {
      isInternalChange = true;
      editor.setValue(value);
      isInternalChange = false;
    }
  });

  onMount(async () => {
    monaco = await import('monaco-editor');

    /* Define custom colorful theme — vibrant, high-contrast */
    monaco.editor.defineTheme('bubble-colorful', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'string', foreground: 'f9a8d4' },
        { token: 'number', foreground: '7dd3fc' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'operator', foreground: '60a5fa' },
        { token: 'type', foreground: 'a78bfa' },
        { token: 'identifier', foreground: 'e4e4e7' },
        { token: 'delimiter', foreground: '818cf8' },
      ],
      colors: {
        'editor.background': '#0c0e1a',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#1a1040',
        'editor.selectionBackground': '#8b5cf650',
        'editorCursor.foreground': '#c084fc',
        'editorLineNumber.foreground': '#4c1d95',
        'editorLineNumber.activeForeground': '#c084fc',
        'editorWidget.background': '#13152a',
        'editorWidget.border': '#2e1065',
        'editor.lineHighlightBorder': '#2e106530',
      },
    });

    /* Define custom light theme — clean, minimal */
    monaco.editor.defineTheme('bubble-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '4338ca', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'b45309' },
        { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
        { token: 'operator', foreground: '4f46e5' },
        { token: 'type', foreground: '6366f1' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#111827',
        'editor.lineHighlightBackground': '#f9fafb',
        'editor.selectionBackground': '#6366f130',
        'editorCursor.foreground': '#4f46e5',
        'editorLineNumber.foreground': '#d1d5db',
        'editorLineNumber.activeForeground': '#4f46e5',
        'editorWidget.background': '#f9fafb',
        'editorWidget.border': '#e5e7eb',
      },
    });

    /* Define custom dark theme — muted, low-contrast */
    monaco.editor.defineTheme('bubble-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'a78bfa', fontStyle: 'bold' },
        { token: 'string', foreground: '6ee7b7' },
        { token: 'number', foreground: 'fcd34d' },
        { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
        { token: 'operator', foreground: '60a5fa' },
        { token: 'type', foreground: '8b5cf6' },
      ],
      colors: {
        'editor.background': '#111318',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#1a1d2540',
        'editor.selectionBackground': '#a78bfa30',
        'editorCursor.foreground': '#a78bfa',
        'editorLineNumber.foreground': '#3f3f46',
        'editorLineNumber.activeForeground': '#a78bfa',
        'editorWidget.background': '#1a1d25',
        'editorWidget.border': '#2e3140',
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
      if (!isInternalChange) {
        value = editor?.getValue() ?? '';
      }
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
