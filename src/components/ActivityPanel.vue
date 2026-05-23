<script setup lang="ts">
import type { ActivityRuntimeState, Question } from '../types/question'

defineProps<{
  activity: ActivityRuntimeState
  currentQuestion?: Question
  selectedQuestionsCount: number
  activityProgress: number
  timerDashOffset: number
  completedQuestions: Question[]
  answerText: (answer: string | string[]) => string
  formatTimer: (seconds: number) => string
  formatDate: (value: string) => string
  elapsedTime: () => string
}>()

const emit = defineEmits<{
  start: []
  finish: []
  pause: []
  resume: []
  reset: []
  reveal: []
  next: []
}>()
</script>

<template>
  <section class="activity-panel">
    <div class="activity-header">
      <div>
        <h2>活动运行</h2>
        <p>{{ selectedQuestionsCount }} 道题已进入抽取池</p>
      </div>
      <button v-if="activity.status === 'idle' || activity.status === 'finished'" class="primary" type="button" @click="emit('start')">
        开始抽题
      </button>
      <button v-else class="danger" type="button" @click="emit('finish')">结束活动</button>
    </div>

    <div v-if="activity.status === 'finished'" class="finish">
      <h3>活动结束</h3>
      <p>总题数 {{ activity.completedQuestionIds.length }}，用时 {{ elapsedTime() }}</p>
      <p>开始 {{ formatDate(activity.startedAt) }}，结束 {{ formatDate(activity.finishedAt) }}</p>
      <div class="finish-list">
        <div v-for="(question, index) in completedQuestions" :key="question.id" class="finish-row">
          <span>{{ index + 1 }}</span>
          <p>{{ question.content }}</p>
          <small>{{ question.customTypeName }} · {{ question.difficultyName }} · {{ answerText(question.answer) }}</small>
        </div>
      </div>
    </div>

    <div v-else-if="currentQuestion" class="stage">
      <div class="stage-meta">
        <span>进度 {{ activity.completedQuestionIds.length }}/{{ activity.completedQuestionIds.length + activity.remainingQuestionIds.length }}</span>
        <span>{{ currentQuestion.customTypeName }}</span>
        <span>{{ currentQuestion.difficultyName }}</span>
      </div>
      <h3>{{ currentQuestion.content }}</h3>
      <ol v-if="currentQuestion.options.length">
        <li v-for="option in currentQuestion.options" :key="option.id">{{ option.content }}</li>
      </ol>
      <div class="timer-wrap">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="timer-track" cx="60" cy="60" r="54" />
          <circle
            class="timer-progress"
            cx="60"
            cy="60"
            r="54"
            :style="{ strokeDashoffset: timerDashOffset }"
          />
        </svg>
        <div :class="['timer', { ended: activity.currentCountdownSeconds === 0 }]">
          {{ formatTimer(activity.currentCountdownSeconds) }}
          <small>倒计时</small>
        </div>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <span :style="{ width: `${activityProgress}%` }"></span>
      </div>
      <div class="activity-actions">
        <button type="button" @click="emit('pause')">暂停</button>
        <button type="button" @click="emit('resume')">继续</button>
        <button type="button" @click="emit('reset')">重置</button>
        <button class="primary" type="button" @click="emit('reveal')">显示正确答案</button>
        <button type="button" @click="emit('next')">下一题</button>
      </div>
      <div v-if="activity.answerVisible" class="answer">
        <strong>正确答案：{{ answerText(currentQuestion.answer) }}</strong>
        <p v-if="currentQuestion.analysis">解析：{{ currentQuestion.analysis }}</p>
        <p v-if="currentQuestion.remark">备注：{{ currentQuestion.remark }}</p>
      </div>
    </div>

    <div v-else class="empty">点击开始后，系统会从已选择且启用的题目中随机抽取。</div>
  </section>
</template>
