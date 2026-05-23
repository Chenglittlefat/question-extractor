<script setup lang="ts">
import type { Project } from '../types/question'
import { icons } from '../assets/icons'
import SvgIcon from './SvgIcon.vue'

defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  touch: [message?: string]
  soundFile: [event: Event]
  exportBackup: []
  importFile: [event: Event]
  playSound: []
  stopSound: []
}>()
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <h2>主题与音效</h2>
      <p>主题实时预览；倒计时结束会播放默认或自定义提示音。</p>
    </div>
    <div class="settings-grid">
      <div class="setting-block">
        <h3>主题</h3>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: project.themeConfig.currentTheme === 'monochrome' }"
            @click="project.themeConfig.currentTheme = 'monochrome'; emit('touch', '已切换为黑白简约主题。')"
          >
            黑白简约
          </button>
          <button
            type="button"
            :class="{ active: project.themeConfig.currentTheme === 'colorful' }"
            @click="project.themeConfig.currentTheme = 'colorful'; emit('touch', '已切换为彩色主题。')"
          >
            彩色风格
          </button>
          <button
            type="button"
            :class="{ active: project.themeConfig.currentTheme === 'gaussian-blur' }"
            @click="project.themeConfig.currentTheme = 'gaussian-blur'; emit('touch', '已切换为高斯模糊风格。')"
          >
            高斯模糊
          </button>
        </div>
      </div>
      <div class="setting-block">
        <h3>音效</h3>
        <label class="file-button">
          <SvgIcon :src="icons.upload" />
          选择本地音效
          <input accept=".mp3,.wav,.ogg" type="file" @change="emit('soundFile', $event)" />
        </label>
        <label class="field">
          <span>音量</span>
          <input v-model.number="project.soundConfig.volume" max="1" min="0" step="0.05" type="range" @change="emit('touch', '已保存音量。')" />
        </label>
        <label><input v-model="project.soundConfig.loop" type="checkbox" @change="emit('touch', '已保存循环播放设置。')" /> 循环播放</label>
        <div class="toolbar">
          <button type="button" @click="project.soundConfig.type = 'default'; emit('touch', '已恢复默认音效。')">恢复默认</button>
          <button type="button" @click="emit('playSound')"><SvgIcon :src="icons.play" />试听</button>
          <button type="button" @click="emit('stopSound')">停止</button>
        </div>
      </div>
      <div class="setting-block">
        <h3>备份</h3>
        <div class="toolbar">
          <button class="primary" type="button" @click="emit('exportBackup')"><SvgIcon :src="icons.download" />导出 JSON 备份</button>
          <label class="file-button">
            <SvgIcon :src="icons.upload" />
            导入 JSON 备份
            <input accept=".json" type="file" @change="emit('importFile', $event)" />
          </label>
        </div>
      </div>
    </div>
  </section>
</template>
