<script setup lang="ts">
import type { Project } from '../types/question'
import { icons } from '../assets/icons'
import SvgIcon from './SvgIcon.vue'

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
      <button class="icon-button" type="button" title="返回项目列表" @click="emit('backHome')">
        <SvgIcon :src="icons.arrowLeft" />
      </button>
      <div>
        <h1>{{ project.name }}</h1>
        <span v-if="selectedQuestionsCount" class="ready-badge">{{ selectedQuestionsCount }} 题待抽取</span>
      </div>
    </div>
    <div class="top-actions">
      <button type="button" @click="emit('save')"><SvgIcon :src="icons.saveFile" />保存</button>
      <button class="primary" :disabled="!selectedQuestionsCount" type="button" @click="emit('startActivity')">
        <SvgIcon :src="icons.shuffle" />开始抽题
      </button>
    </div>
  </header>
</template>
