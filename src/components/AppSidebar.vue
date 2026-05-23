<script setup lang="ts">
import type { Project } from '../types/question'
import SvgIcon from './SvgIcon.vue'

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
</script>

<template>
  <aside class="sidebar">
    <nav>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        <span class="nav-icon"><SvgIcon :src="tab.icon" :size="15" /></span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </aside>
</template>
