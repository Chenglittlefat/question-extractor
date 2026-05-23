<script setup lang="ts">
import type { Project } from '../types/question'

defineProps<{
  project: Project
  difficultyDraft: { name: string }
}>()

const emit = defineEmits<{
  addDifficulty: []
  moveDifficulty: [index: number, direction: 1 | -1]
  removeDifficulty: [id: string]
  touch: [message?: string]
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>难度设置</h2>
      <p>难度可排序，导入题目时必须匹配已有难度。</p>
    </div>
    <div class="inline-form">
      <input v-model.trim="difficultyDraft.name" type="text" placeholder="难度名称" />
      <button class="primary" type="button" @click="emit('addDifficulty')">新增难度</button>
    </div>
    <div class="list">
      <div v-for="(item, index) in project.difficulties" :key="item.id" class="list-item">
        <label><input v-model="item.enabled" type="checkbox" @change="emit('touch', '已更新难度状态。')" /> 启用</label>
        <input v-model.trim="item.name" type="text" @change="emit('touch', '已更新难度名称。')" />
        <span>排序 {{ item.order }}</span>
        <button type="button" @click="emit('moveDifficulty', index, -1)">上移</button>
        <button type="button" @click="emit('moveDifficulty', index, 1)">下移</button>
        <button type="button" @click="emit('removeDifficulty', item.id)">删除</button>
      </div>
    </div>
  </section>
</template>
