<script setup lang="ts">
import type { Project, ReadinessItem } from '../types/question'

defineProps<{
  project: Project
  selectedQuestionsCount: number
  selectedQuestionRate: number
  importReady: boolean
  activityReadyItems: ReadinessItem[]
}>()

const emit = defineEmits<{
  touch: [message?: string]
}>()

function readyCount(items: ReadinessItem[]) {
  return items.filter((item) => item.ready).length
}
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>项目配置</h2>
      <p>基础信息会随题型、题库、主题和音效一起保存。</p>
    </div>
    <div class="overview-grid">
      <article class="overview-card primary-overview">
        <span>活动准备度</span>
        <strong>{{ readyCount(activityReadyItems) }}/{{ activityReadyItems.length }}</strong>
        <p>开始前需要项目名称、启用题型、启用难度和至少一道已选启用题目。</p>
      </article>
      <article class="overview-card">
        <span>题库规模</span>
        <strong>{{ project.questions.length }}</strong>
        <p>{{ selectedQuestionsCount }} 道题进入抽取池，占题库 {{ selectedQuestionRate }}%。</p>
      </article>
      <article class="overview-card">
        <span>导入状态</span>
        <strong>{{ importReady ? '可生成模板' : '需补配置' }}</strong>
        <p>模板会根据当前题型、难度和基础题型自动生成。</p>
      </article>
    </div>
    <div class="form-grid">
      <label class="field">
        <span>项目名称</span>
        <input v-model.trim="project.name" type="text" @change="emit('touch', '已更新项目名称。')" />
      </label>
      <label class="field">
        <span>创建时间</span>
        <input :value="new Date(project.createdAt).toLocaleString()" type="text" readonly />
      </label>
      <label class="field wide">
        <span>项目描述</span>
        <textarea v-model.trim="project.description" rows="4" @change="emit('touch', '已更新项目描述。')" />
      </label>
    </div>
    <div class="stats">
      <strong>{{ project.questionTypes.length }}</strong><span>题型</span>
      <strong>{{ project.difficulties.length }}</strong><span>难度</span>
      <strong>{{ project.questions.length }}</strong><span>题目</span>
      <strong>{{ selectedQuestionsCount }}</strong><span>参与抽取</span>
    </div>
    <div class="readiness-list">
      <div v-for="item in activityReadyItems" :key="item.label" :class="['readiness-item', { ready: item.ready }]">
        <span>{{ item.ready ? '✓' : '!' }}</span>
        <strong>{{ item.label }}</strong>
        <small>{{ item.ready ? '已满足' : '待处理' }}</small>
      </div>
    </div>
  </section>
</template>
