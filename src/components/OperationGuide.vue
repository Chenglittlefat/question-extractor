<script setup lang="ts">
import { ref } from 'vue'
import guideMarkdown from '../help/operation-guide.md?raw'

type GuideTab = 'guide' | 'import'

const activeTab = ref<GuideTab>('guide')

const importHeaders = [
  '题型',
  '基础题型',
  '难度',
  '题干',
  '选项1',
  '选项2',
  '选项3',
  '选项4',
  '选项5',
  '选项6',
  '选项7',
  '选项8',
  '正确答案',
  '解析',
  '是否启用',
  '标签',
  '备注',
]

const importSamples = [
  [
    '理论单选',
    '单选题',
    '简单',
    '离线抽题软件的数据主要保存在哪里？',
    '本地',
    '云端',
    '浏览器缓存',
    '临时剪贴板',
    '外部网盘',
    '',
    '',
    '',
    'A',
    '单选题可用数字编号、字母编号或选项内容作为答案。',
    '是',
    '示例;单选',
    '单选题可以超过 4 个选项。',
  ],
  [
    '案例多选',
    '多选题',
    '中等',
    '以下哪些能力属于离线抽题软件？',
    '项目保存',
    '随机抽题',
    '倒计时',
    '批量导入',
    '本地备份',
    '显示答案',
    '',
    '',
    'ABCD',
    '多选答案可用 ABCD 连写，也可用逗号、分号、顿号、竖线分隔。',
    '是',
    '示例;多选',
    '选项超过 8 个时可继续新增选项9、选项10。',
  ],
  [
    '快速判断',
    '判断题',
    '简单',
    '判断题可以不填写选项，只填写正确答案。',
    '正确',
    '错误',
    '',
    '',
    '',
    '',
    '',
    '',
    '正确',
    '判断题答案支持正确、错误、是、否、true、false。',
    '是',
    '示例;判断',
    '选项1/选项2 可填，也可以留空。',
  ],
  [
    '主观简答',
    '简答题',
    '困难',
    '请说明导入前为什么建议先下载模板。',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '模板包含当前项目需要的题型、难度、选项和答案列，能减少格式错误。',
    '简答题答案不能为空，填写普通文本即可。',
    '是',
    '示例;简答',
    '简答题不需要填写选项。',
  ],
]

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
  <section class="guide-tabs" aria-label="帮助分栏">
    <button :class="{ active: activeTab === 'guide' }" type="button" @click="activeTab = 'guide'">操作说明</button>
    <button :class="{ active: activeTab === 'import' }" type="button" @click="activeTab = 'import'">导入提示</button>
  </section>
  <article v-if="activeTab === 'guide'" class="operation-guide markdown-body" v-html="renderedGuide"></article>
  <article v-else class="operation-guide import-guide">
    <div class="import-guide-head">
      <h1>导入提示</h1>
      <p>下面是一份可参考的模拟数据，覆盖单选、多选、判断和简答。题型、难度名称需要与当前项目配置保持一致。</p>
    </div>
    <div class="import-rules-grid">
      <div>
        <strong>选项列</strong>
        <p>使用 <code>选项1</code>、<code>选项2</code>... 多列填写，空列会自动忽略，超过模板列数可继续新增。</p>
      </div>
      <div>
        <strong>答案列</strong>
        <p>单选填 1 个答案；多选用 <code>;</code>、<code>,</code>、<code>、</code> 或 <code>|</code> 分隔，也支持 JSON 数组和 <code>ABCD</code> 连写。</p>
      </div>
      <div>
        <strong>答案匹配</strong>
        <p>单选和多选的答案可写选项内容、数字编号或字母编号，例如 <code>1</code>、<code>A</code> 或 <code>项目保存</code>。</p>
      </div>
    </div>
    <div class="sample-table-wrap">
      <table class="sample-import-table">
        <thead>
          <tr>
            <th v-for="header in importHeaders" :key="header">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in importSamples" :key="row[0]">
            <td v-for="(cell, index) in row" :key="`${row[0]}-${importHeaders[index]}`">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
