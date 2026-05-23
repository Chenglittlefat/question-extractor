<script setup lang="ts">
import type { BaseQuestionType, Project } from '../types/question'

defineProps<{
  project: Project
  baseTypeLabels: Record<BaseQuestionType, string>
}>()

const emit = defineEmits<{
  touch: [message?: string]
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>倒计时配置</h2>
      <p>每种自定义题型拥有独立倒计时，活动抽题后自动读取。</p>
    </div>
    <div class="countdown-grid">
      <label v-for="item in project.questionTypes" :key="item.id" class="count-card">
        <span>{{ item.name }}</span>
        <small>{{ baseTypeLabels[item.baseType] }}</small>
        <input
          v-model.number="item.countdownSeconds"
          min="5"
          max="3600"
          type="number"
          @change="emit('touch', '已保存倒计时配置。')"
        />
      </label>
    </div>
  </section>
</template>
