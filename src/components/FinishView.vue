<script setup lang="ts">
import type { Project, Question } from '../types/question'

defineProps<{
  project: Project
  completedQuestions: Question[]
  elapsedTime: string
  answerText: (answer: string | string[]) => string
}>()

const emit = defineEmits<{
  retry: []
  home: []
}>()
</script>

<template>
  <div class="finish-view">
    <header class="figma-header">
      <div class="header-left">
        <button class="icon-button" type="button" @click="emit('home')">⌂</button>
        <strong>{{ project.name }}</strong>
      </div>
      <button type="button" @click="emit('retry')">↻ 再来一次</button>
    </header>

    <main class="finish-main">
      <div class="finish-hero">
        <div class="award-mark">✓</div>
        <h1>活动已完成！</h1>
        <p>所有题目已完成抽取</p>
      </div>

      <div class="finish-stats">
        <div>
          <strong>{{ completedQuestions.length }}</strong>
          <span>总题数</span>
        </div>
        <div>
          <strong>{{ completedQuestions.length }}</strong>
          <span>已完成</span>
        </div>
        <div>
          <strong>{{ elapsedTime }}</strong>
          <span>活动用时</span>
        </div>
      </div>

      <section class="finish-table">
        <header>本次已抽取题目</header>
        <div v-for="(question, index) in completedQuestions" :key="question.id" class="finish-item">
          <span>{{ index + 1 }}</span>
          <div>
            <p>{{ question.content }}</p>
            <small>{{ question.customTypeName }} · {{ question.difficultyName }} · {{ answerText(question.answer) }}</small>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
