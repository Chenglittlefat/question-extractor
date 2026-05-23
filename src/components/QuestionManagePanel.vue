<script setup lang="ts">
import type { BaseQuestionType, Project, Question } from '../types/question'
import { icons } from '../assets/icons'
import SvgIcon from './SvgIcon.vue'

defineProps<{
  project: Project
  filteredQuestions: Question[]
  filters: {
    keyword: string
    typeId: string
    difficultyId: string
    selected: string
    enabled: string
    tag: string
  }
  baseTypeLabels: Record<BaseQuestionType, string>
  answerText: (answer: string | string[]) => string
}>()

const emit = defineEmits<{
  bulkSelect: [mode: 'allFiltered' | 'invert' | 'none']
  bulkEnabled: [enabled: boolean]
  deleteFilteredQuestions: []
  touch: [message?: string]
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>题目管理</h2>
      <p>只有已选择且启用的题目会进入随机抽取池。</p>
    </div>
    <div class="filters">
      <input v-model.trim="filters.keyword" type="search" placeholder="关键词搜索" />
      <select v-model="filters.typeId">
        <option value="all">全部题型</option>
        <option v-for="item in project.questionTypes" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <select v-model="filters.difficultyId">
        <option value="all">全部难度</option>
        <option v-for="item in project.difficulties" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <select v-model="filters.selected">
        <option value="all">选择状态</option>
        <option value="true">已选择</option>
        <option value="false">未选择</option>
      </select>
      <select v-model="filters.enabled">
        <option value="all">启用状态</option>
        <option value="true">已启用</option>
        <option value="false">已禁用</option>
      </select>
      <input v-model.trim="filters.tag" type="search" placeholder="标签" />
    </div>
    <div class="toolbar">
      <button type="button" @click="emit('bulkSelect', 'allFiltered')">全选筛选结果</button>
      <button type="button" @click="emit('bulkSelect', 'invert')">反选</button>
      <button type="button" @click="emit('bulkSelect', 'none')">取消全选</button>
      <button type="button" @click="emit('bulkEnabled', true)">批量启用</button>
      <button type="button" @click="emit('bulkEnabled', false)">批量禁用</button>
      <button class="danger" type="button" @click="emit('deleteFilteredQuestions')"><SvgIcon :src="icons.trash" />批量删除</button>
    </div>
    <div class="question-list">
      <article v-for="question in filteredQuestions" :key="question.id" class="question-card">
        <div class="question-meta">
          <label><input v-model="question.selected" type="checkbox" @change="emit('touch', '已更新选择状态。')" /> 参与</label>
          <label><input v-model="question.enabled" type="checkbox" @change="emit('touch', '已更新启用状态。')" /> 启用</label>
          <span>{{ question.customTypeName }}</span>
          <span>{{ baseTypeLabels[question.baseType] }}</span>
          <span>{{ question.difficultyName }}</span>
          <span>{{ question.tags.join('、') || '无标签' }}</span>
        </div>
        <h3>{{ question.content }}</h3>
        <ol v-if="question.options.length">
          <li v-for="option in question.options" :key="option.id">{{ option.content }}</li>
        </ol>
        <p>答案：{{ answerText(question.answer) }}</p>
      </article>
      <div v-if="!filteredQuestions.length" class="empty">暂无题目，请先导入。</div>
    </div>
  </section>
</template>
