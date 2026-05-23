<script setup lang="ts">
import type { Project } from '../types/question'

defineProps<{
  project: Project
  notice: string
}>()

const emit = defineEmits<{
  save: []
  exportBackup: []
  deleteProject: [id: string]
}>()
</script>

<template>
  <header class="topbar">
    <div>
      <h1>{{ project.name }}</h1>
      <p>{{ notice }}</p>
    </div>
    <div class="top-actions">
      <button type="button" @click="emit('save')">保存</button>
      <button type="button" @click="emit('exportBackup')">导出备份</button>
      <button class="danger" type="button" @click="emit('deleteProject', project.id)">删除项目</button>
    </div>
  </header>
</template>
