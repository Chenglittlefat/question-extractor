<script setup lang="ts">
import type { Project } from '../types/question'

defineProps<{
  project: Project
  notice: string
  selectedQuestionsCount: number
}>()

const emit = defineEmits<{
  backHome: []
  save: []
  exportBackup: []
  deleteProject: [id: string]
  startActivity: []
}>()
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">
      <button class="icon-button" type="button" title="返回项目列表" @click="emit('backHome')">←</button>
      <div>
        <h1>{{ project.name }}</h1>
        <span v-if="selectedQuestionsCount" class="ready-badge">{{ selectedQuestionsCount }} 题待抽取</span>
      </div>
      <p>{{ notice }}</p>
    </div>
    <div class="top-actions">
      <button type="button" @click="emit('save')">保存</button>
      <button class="primary" :disabled="!selectedQuestionsCount" type="button" @click="emit('startActivity')">开始抽题</button>
      <button type="button" @click="emit('exportBackup')">导出备份</button>
      <button class="danger" type="button" @click="emit('deleteProject', project.id)">删除项目</button>
    </div>
  </header>
</template>
