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
  back: []
  start: []
  finish: []
  pause: []
  resume: []
  reset: []
  reveal: []
  next: []
}>()

const baseLabels = {
  single: '单选题',
  multiple: '多选题',
  trueFalse: '判断题',
  shortAnswer: '简答题',
}

function isCorrectOption(question: Question, option: { label?: string; content: string }) {
  const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
  return answers.includes(option.label ?? '') || answers.includes(option.content)
}
</script>

<template>
  <section class="activity-view">
    <header class="figma-header">
      <div class="header-left">
        <button class="icon-button" type="button" title="返回项目" @click="emit('back')">←</button>
        <strong>{{ currentQuestion ? currentQuestion.customTypeName : '活动运行' }}</strong>
      </div>
      <div class="activity-top-progress">
        <span>{{ activity.completedQuestionIds.length || 1 }} / {{ activity.completedQuestionIds.length + activity.remainingQuestionIds.length || selectedQuestionsCount }}</span>
        <div><i :style="{ width: `${activityProgress}%` }"></i></div>
      </div>
    </header>

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

    <div v-else-if="currentQuestion" class="activity-layout">
      <div class="question-side">
        <div class="question-main">
          <div class="stage-meta">
            <span>{{ currentQuestion.customTypeName }}</span>
            <span>{{ currentQuestion.difficultyName }}</span>
            <span>{{ baseLabels[currentQuestion.baseType] }}</span>
            <b v-if="activity.currentCountdownSeconds === 0">时间到</b>
          </div>

          <p class="activity-question">{{ currentQuestion.content }}</p>

          <div v-if="currentQuestion.options.length && currentQuestion.baseType !== 'shortAnswer'" class="activity-options">
            <div
              v-for="option in currentQuestion.options"
              :key="option.id"
              :class="['activity-option', { correct: activity.answerVisible && isCorrectOption(currentQuestion, option) }]"
            >
              <span>{{ option.label || option.order }}</span>
              <p>{{ option.content }}</p>
              <strong v-if="activity.answerVisible && isCorrectOption(currentQuestion, option)">✓</strong>
            </div>
          </div>

          <div v-if="currentQuestion.baseType === 'trueFalse' && !activity.answerVisible" class="true-false-row">
            <div>正确</div>
            <div>错误</div>
          </div>

          <div v-if="activity.answerVisible" class="answer figma-answer">
            <strong>✓ 正确答案</strong>
            <p>{{ answerText(currentQuestion.answer) }}</p>
            <small v-if="currentQuestion.analysis">{{ currentQuestion.analysis }}</small>
          </div>
        </div>

        <div class="activity-actions figma-actions">
          <button type="button" :disabled="activity.currentCountdownSeconds === 0" @click="activity.status === 'paused' ? emit('resume') : emit('pause')">
            {{ activity.status === 'paused' ? '▶ 继续' : 'Ⅱ 暂停' }}
          </button>
          <button type="button" @click="emit('reset')">↻ 重置</button>
          <span></span>
          <button v-if="!activity.answerVisible" type="button" @click="emit('reveal')">◎ 显示答案</button>
          <button v-else type="button" @click="emit('reveal')">◎ 隐藏答案</button>
          <button class="primary" type="button" @click="emit('next')">
            {{ activity.remainingQuestionIds.length ? '下一题' : '完成活动' }}
          </button>
        </div>
      </div>

      <aside class="countdown-side">
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
        <div class="countdown-caption">
          <p>{{ activity.status === 'paused' ? '已暂停' : activity.currentCountdownSeconds === 0 ? '时间已到' : '倒计时进行中' }}</p>
          <small>第 {{ activity.completedQuestionIds.length || 1 }} 题 / 共 {{ activity.completedQuestionIds.length + activity.remainingQuestionIds.length || selectedQuestionsCount }} 题</small>
        </div>
      </aside>
    </div>

    <div v-else class="empty activity-empty">
      <p>点击开始后，系统会从已选择且启用的题目中随机抽取。</p>
      <button class="primary" type="button" @click="emit('start')">开始抽题</button>
    </div>
  </section>
</template>
