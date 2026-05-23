<script setup lang="ts">
import type { BaseQuestionType, Project, QuestionTypeConfig } from '../types/question'

defineProps<{
  project: Project
  typeDraft: { name: string; baseType: BaseQuestionType; countdownSeconds: number }
  baseTypeLabels: Record<BaseQuestionType, string>
}>()

const emit = defineEmits<{
  addType: []
  removeType: [id: string]
  toggleDifficulty: [type: QuestionTypeConfig, difficultyId: string]
  touch: [message?: string]
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>题型设置</h2>
      <p>展示名称可自定义，业务规则仍绑定到基础题型。</p>
    </div>
    <div class="inline-form">
      <input v-model.trim="typeDraft.name" type="text" placeholder="自定义题型名称" />
      <select v-model="typeDraft.baseType">
        <option v-for="(label, value) in baseTypeLabels" :key="value" :value="value">{{ label }}</option>
      </select>
      <input v-model.number="typeDraft.countdownSeconds" min="5" max="3600" type="number" />
      <button class="primary" type="button" @click="emit('addType')">新增题型</button>
    </div>
    <div class="table">
      <div class="table-row head">
        <span>启用</span><span>题型名称</span><span>基础题型</span><span>可用难度</span><span>倒计时</span><span>操作</span>
      </div>
      <div v-for="item in project.questionTypes" :key="item.id" class="table-row">
        <label><input v-model="item.enabled" type="checkbox" @change="emit('touch', '已更新题型状态。')" /></label>
        <input v-model.trim="item.name" type="text" @change="emit('touch', '已更新题型名称。')" />
        <select v-model="item.baseType" @change="emit('touch', '已更新基础题型。')">
          <option v-for="(label, value) in baseTypeLabels" :key="value" :value="value">{{ label }}</option>
        </select>
        <div class="chips">
          <label v-for="difficulty in project.difficulties" :key="difficulty.id" class="chip">
            <input
              :checked="item.difficultyIds.includes(difficulty.id)"
              type="checkbox"
              @change="emit('toggleDifficulty', item, difficulty.id)"
            />
            {{ difficulty.name }}
          </label>
        </div>
        <input
          v-model.number="item.countdownSeconds"
          min="5"
          max="3600"
          type="number"
          @change="emit('touch', '已更新题型倒计时。')"
        />
        <button type="button" @click="emit('removeType', item.id)">删除</button>
      </div>
    </div>
  </section>
</template>
