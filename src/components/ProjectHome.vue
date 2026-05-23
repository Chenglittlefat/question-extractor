<script setup lang="ts">
import { ref } from 'vue'
import { icons } from '../assets/icons'
import type { Project } from '../types/question'
import SvgIcon from './SvgIcon.vue'

defineProps<{
  projects: Project[]
}>()

const emit = defineEmits<{
  openProject: [id: string]
  createProject: []
  deleteProject: [id: string]
  openSettings: []
}>()

const pendingDeleteId = ref('')

function selectedCount(project: Project) {
  return project.questions.filter((question) => question.selected && question.enabled).length
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : '-'
}
</script>

<template>
  <div class="home-shell">
    <header class="home-header">
      <div class="home-brand">
        <span class="mark"><SvgIcon :src="icons.appLogo" :size="18" /></span>
        <strong>抽题助手</strong>
      </div>
      <div class="home-actions">
        <button type="button" @click="emit('openSettings')"><SvgIcon :src="icons.settings" />设置</button>
        <button class="primary" type="button" @click="emit('createProject')"><SvgIcon :src="icons.plus" />新建项目</button>
      </div>
    </header>

    <main class="home-main">
      <div class="home-title">
        <div>
          <h1>我的项目</h1>
          <p>创建和管理您的抽题活动</p>
        </div>
        <span>{{ projects.length }} 个项目</span>
      </div>

      <div v-if="projects.length === 0" class="home-empty">
        <SvgIcon :src="icons.projectFolder" :size="52" />
        <strong>还没有项目</strong>
        <p>新建一个抽题活动开始配置题型、难度和题库。</p>
        <button class="primary" type="button" @click="emit('createProject')"><SvgIcon :src="icons.plus" />新建项目</button>
      </div>

      <div v-else class="project-grid">
        <article v-for="project in projects" :key="project.id" class="project-tile" @click="emit('openProject', project.id)">
          <div class="project-tile-head">
            <div>
              <h2>{{ project.name }}</h2>
              <p v-if="project.description">{{ project.description }}</p>
            </div>
            <button class="icon-danger" type="button" title="删除项目" @click.stop="pendingDeleteId = project.id">
              <SvgIcon :src="icons.trash" :size="15" />
            </button>
          </div>

          <div class="project-tile-meta">
            <span><SvgIcon :src="icons.bookOpen" :size="12" />{{ project.questions.length }} 题</span>
            <span><SvgIcon :src="icons.checkSquare" :size="12" />{{ selectedCount(project) }} 已选</span>
            <span><SvgIcon :src="icons.layers" :size="12" />{{ project.questionTypes.length }} 题型</span>
            <span>{{ formatDate(project.updatedAt) }}</span>
          </div>

          <div class="project-tile-tags">
            <span v-for="type in project.questionTypes.slice(0, 4)" :key="type.id">{{ type.name }}</span>
            <span v-if="project.questionTypes.length > 4">+{{ project.questionTypes.length - 4 }}</span>
          </div>
        </article>
      </div>
    </main>

    <div v-if="pendingDeleteId" class="modal-backdrop">
      <div class="modal-card small">
        <h3>删除项目</h3>
        <p>此操作不可撤销，确认删除该项目及所有题目吗？</p>
        <div class="modal-actions">
          <button type="button" @click="pendingDeleteId = ''">取消</button>
          <button class="danger" type="button" @click="emit('deleteProject', pendingDeleteId); pendingDeleteId = ''">
            <SvgIcon :src="icons.trash" />删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
