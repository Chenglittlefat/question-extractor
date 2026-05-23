<script setup lang="ts">
import guideMarkdown from '../help/operation-guide.md?raw'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderInline = (value: string) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

function renderMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const html: string[] = []
  let listOpen = false

  const closeList = () => {
    if (!listOpen) return
    html.push('</ul>')
    listOpen = false
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      return
    }

    if (trimmed.startsWith('### ')) {
      closeList()
      html.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`)
      return
    }

    if (trimmed.startsWith('## ')) {
      closeList()
      html.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`)
      return
    }

    if (trimmed.startsWith('# ')) {
      closeList()
      html.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`)
      return
    }

    if (trimmed.startsWith('- ')) {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${renderInline(trimmed.slice(2))}</li>`)
      return
    }

    closeList()
    html.push(`<p>${renderInline(trimmed)}</p>`)
  })

  closeList()
  return html.join('')
}

const renderedGuide = renderMarkdown(guideMarkdown)
</script>

<template>
  <article class="operation-guide markdown-body" v-html="renderedGuide"></article>
</template>
