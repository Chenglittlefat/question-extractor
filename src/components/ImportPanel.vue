<script setup lang="ts">
import type { ImportEncoding, ImportRow } from '../types/question'
import { icons } from '../assets/icons'
import SvgIcon from './SvgIcon.vue'

defineProps<{
  importEncoding: ImportEncoding
  importRows: ImportRow[]
  importValidCount: number
}>()

const emit = defineEmits<{
  'update:importEncoding': [value: ImportEncoding]
  exportTemplate: []
  importFile: [event: Event]
  confirmImport: []
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>题目导入</h2>
      <p>支持 CSV/TSV 表格、UTF-8/UTF-16 文本识别和 JSON 备份恢复。</p>
    </div>
    <div class="toolbar">
      <button class="primary" type="button" @click="emit('exportTemplate')"><SvgIcon :src="icons.download" />生成导入模板</button>
      <label class="file-button">
        <SvgIcon :src="icons.upload" />
        导入题目或备份
        <input accept=".csv,.tsv,.json,.xlsx,.xls" type="file" @change="emit('importFile', $event)" />
      </label>
      <select :value="importEncoding" @change="emit('update:importEncoding', ($event.target as HTMLSelectElement).value as ImportEncoding)">
        <option value="auto">自动识别编码</option>
        <option value="utf-8">UTF-8</option>
        <option value="utf-16le">UTF-16LE</option>
        <option value="utf-16be">UTF-16BE</option>
        <option value="gb18030">GBK / GB18030</option>
      </select>
      <button :disabled="!importValidCount" type="button" @click="emit('confirmImport')">确认导入 {{ importValidCount }} 道</button>
    </div>
    <div v-if="importRows.length" class="import-preview">
      <div
        v-for="row in importRows"
        :key="`${row.row}-${row.question?.id ?? row.question?.content ?? 'invalid'}-${row.errors.join('|')}`"
        :class="['preview-row', { invalid: row.errors.length }]"
      >
        <strong>第 {{ row.row }} 行</strong>
        <span>{{ row.question?.content || '未生成题目' }}</span>
        <small>{{ row.errors.length ? row.errors.join('；') : '校验通过' }}</small>
      </div>
    </div>
  </section>
</template>
