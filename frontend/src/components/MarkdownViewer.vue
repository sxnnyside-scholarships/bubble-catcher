<script setup lang="ts">
import { marked } from 'marked';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MINGCUTE_ICONS } from '@/design/mingcute-icons';

const props = defineProps<{
  content: string;
}>();

const router = useRouter();
const containerRef = ref<HTMLElement | null>(null);

function renderSvg(name: keyof typeof MINGCUTE_ICONS, extraClass = ''): string {
  const body = MINGCUTE_ICONS[name] || '';
  return `<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" class="inline-block shrink-0 ${extraClass}">${body}</svg>`;
}

/** Process custom Markdown enhancements such as callout alerts */
function preprocessMarkdown(src: string): string {
  if (!src) return '';

  const tipIcon = renderSvg('bulb', 'text-amber-400');
  const warnIcon = renderSvg('alert', 'text-amber-500');
  const noteIcon = renderSvg('info', 'text-blue-400');

  // Transform GitHub-style blockquote alerts [!TIP], [!WARNING], [!NOTE]
  return src
    .replace(
      /> \[!TIP\]\s*\n((?:> .*\n?)+)/g,
      `<div class="callout callout-tip"><div class="callout-header"><span class="callout-icon">${tipIcon}</span> <strong>Consejo / Pro Tip</strong></div><div class="callout-body">$1</div></div>`,
    )
    .replace(
      /> \[!WARNING\]\s*\n((?:> .*\n?)+)/g,
      `<div class="callout callout-warning"><div class="callout-header"><span class="callout-icon">${warnIcon}</span> <strong>Atención / Caution</strong></div><div class="callout-body">$1</div></div>`,
    )
    .replace(
      /> \[!NOTE\]\s*\n((?:> .*\n?)+)/g,
      `<div class="callout callout-note"><div class="callout-header"><span class="callout-icon">${noteIcon}</span> <strong>Nota Didáctica / Insight</strong></div><div class="callout-body">$1</div></div>`,
    )
    .replace(/(<div class="callout-body">)([\s\S]*?)(<\/div>)/g, (_match, p1, p2, p3) => {
      const cleanBody = p2.replace(/^> ?/gm, '').trim();
      const parsedBody = marked.parse(cleanBody, { gfm: true, breaks: false }) as string;
      return `${p1}${parsedBody}${p3}`;
    });
}

const renderedHtml = computed(() => {
  if (!props.content) return '';
  const preprocessed = preprocessMarkdown(props.content);
  return marked.parse(preprocessed, {
    gfm: true,
    breaks: false,
  });
});

/** Attach interactive actions (Copy code and Open in Playground) to rendered code blocks */
function attachCodeBlockButtons() {
  if (!containerRef.value) return;

  const preBlocks = containerRef.value.querySelectorAll('pre');
  preBlocks.forEach((pre) => {
    // Avoid re-attaching
    if (pre.querySelector('.code-actions-bar')) return;

    const codeEl = pre.querySelector('code');
    const rawCode = codeEl ? codeEl.innerText.trim() : pre.innerText.trim();

    const isSql =
      codeEl?.classList.contains('language-sql') ||
      rawCode.toUpperCase().includes('SELECT ') ||
      rawCode.toUpperCase().includes('CREATE TABLE');

    const actionsBar = document.createElement('div');
    actionsBar.className = 'code-actions-bar';

    const copyIcon = renderSvg('copy', 'h-3.5 w-3.5');
    const checkIcon = renderSvg('check', 'h-3.5 w-3.5 text-emerald-400');
    const playIcon = renderSvg('play', 'h-3.5 w-3.5');

    // 1. Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-code-action';
    copyBtn.innerHTML = `<span class="flex items-center gap-1.5">${copyIcon} Copiar</span>`;
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(rawCode);
      copyBtn.innerHTML = `<span class="flex items-center gap-1.5">${checkIcon} ¡Copiado!</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<span class="flex items-center gap-1.5">${copyIcon} Copiar</span>`;
      }, 2000);
    });
    actionsBar.appendChild(copyBtn);

    // 2. Open in Playground (if SQL)
    if (isSql) {
      const playgroundBtn = document.createElement('button');
      playgroundBtn.type = 'button';
      playgroundBtn.className = 'btn-code-action btn-code-action-primary';
      playgroundBtn.innerHTML = `<span class="flex items-center gap-1.5">${playIcon} Probar en Playground</span>`;
      playgroundBtn.addEventListener('click', () => {
        // Store the SQL query in sessionStorage for PlaygroundView to load
        sessionStorage.setItem('bubble_playground_initial_query', rawCode);
        router.push('/dashboard/playground');
      });
      actionsBar.appendChild(playgroundBtn);
    }

    pre.style.position = 'relative';
    pre.appendChild(actionsBar);
  });
}

onMounted(() => {
  attachCodeBlockButtons();
});

watch(renderedHtml, () => {
  nextTick(() => {
    attachCodeBlockButtons();
  });
});
</script>

<template>
  <div
    ref="containerRef"
    class="markdown-viewer prose dark:prose-invert max-w-none text-[var(--color-text)]"
    v-html="renderedHtml"
  />
</template>

<style>
.markdown-viewer {
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--color-text);
}

.markdown-viewer h1 {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.markdown-viewer h2 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.markdown-viewer h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.markdown-viewer p {
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.markdown-viewer ul,
.markdown-viewer ol {
  margin-bottom: 1.25rem;
  padding-left: 1.5rem;
  color: var(--color-text-secondary);
}

.markdown-viewer ul {
  list-style-type: disc;
}

.markdown-viewer ol {
  list-style-type: decimal;
}

.markdown-viewer li {
  margin-bottom: 0.35rem;
}

.markdown-viewer hr {
  margin: 2rem 0;
  border-color: var(--color-border);
}

.markdown-viewer strong {
  color: var(--color-text);
  font-weight: 600;
}

/* Code Blocks & Inline Code */
.markdown-viewer code:not(pre code) {
  background-color: var(--color-surface-tertiary);
  color: var(--color-pink-400);
  padding: 0.15rem 0.4rem;
  border-radius: 0.375rem;
  font-size: 0.875em;
  font-family: var(--font-mono);
  border: 1px solid var(--color-border);
}

.markdown-viewer pre {
  position: relative;
  background: #0d1117;
  border: 1px solid var(--color-border);
  border-radius: 0.875rem;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  overflow-x: auto;
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.4);
}

.markdown-viewer pre code {
  color: #e6edf3;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  background: transparent;
  padding: 0;
  border: none;
}

/* Code Action Bar */
.code-actions-bar {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.35rem;
  z-index: 10;
}

.btn-code-action {
  font-size: 0.725rem;
  font-weight: 600;
  padding: 0.25rem 0.55rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-code-action:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transform: translateY(-1px);
}

.btn-code-action-primary {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.4));
  border-color: rgba(167, 139, 250, 0.4);
  color: #ffffff;
}

.btn-code-action-primary:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(236, 72, 153, 0.6));
}

/* Tables */
.markdown-viewer table {
  width: 100%;
  margin: 1.5rem 0;
  border-collapse: collapse;
  overflow-x: auto;
  display: block;
}

.markdown-viewer th {
  background-color: var(--color-surface-tertiary);
  color: var(--color-text);
  font-weight: 600;
  text-align: left;
  padding: 0.65rem 1rem;
  border: 1px solid var(--color-border);
}

.markdown-viewer td {
  padding: 0.65rem 1rem;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.markdown-viewer tr:nth-child(even) td {
  background-color: var(--color-surface-secondary);
}

/* Callout Alerts */
.callout {
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  border: 1px solid transparent;
}

.callout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.callout-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.callout-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.callout-body {
  font-size: 0.875rem;
  line-height: 1.6;
}

.callout-body p {
  color: inherit;
  margin-bottom: 0.5rem;
}

.callout-body p:last-child {
  margin-bottom: 0;
}

.callout-body strong {
  color: inherit;
  font-weight: 700;
  filter: brightness(1.2);
}

.callout-body code {
  color: inherit;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.15em 0.4em;
  border-radius: 0.35rem;
  font-size: 0.85em;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.callout-tip {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.callout-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fde68a;
}

.callout-note {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}
</style>
