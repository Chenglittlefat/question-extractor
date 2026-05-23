<script setup lang="ts">
import type { Project } from '../types/question'

interface NavTab {
  id: string
  label: string
  icon: string
}

defineProps<{
  tabs: readonly NavTab[]
  projects: Project[]
  activeProjectId: string
  activeTab: string
  dataPath: string
}>()

const emit = defineEmits<{
  'update:activeProjectId': [value: string]
  'update:activeTab': [value: string]
  createProject: []
  projectChanged: []
}>()

function changeProject(event: Event) {
  emit('update:activeProjectId', (event.target as HTMLSelectElement).value)
  emit('projectChanged')
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="mark">Q</span>
      <div>
        <strong>抽题助手</strong>
        <small>离线题库与活动工作台</small>
      </div>
    </div>

    <label class="field">
      <span>当前项目</span>
      <select :value="activeProjectId" @change="changeProject">
        <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>

    <button class="primary full" type="button" @click="emit('createProject')">新建项目</button>

    <nav>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        <span class="nav-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="sidebar-status">
      <span>本地数据</span>
      <strong>{{ projects.length }} 个项目</strong>
      <small>{{ dataPath || '浏览器预览模式' }}</small>
    </div>
  </aside>
</template>
