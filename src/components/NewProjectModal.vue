<script setup lang="ts">
import { reactive } from 'vue'
import { icons } from '../assets/icons'
import SvgIcon from './SvgIcon.vue'

const emit = defineEmits<{
  close: []
  create: [payload: { name: string; description: string }]
}>()

const draft = reactive({ name: '', description: '' })

function create() {
  const name = draft.name.trim()
  if (!name) return
  emit('create', { name, description: draft.description.trim() })
}
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" @click.stop>
      <div class="modal-head">
        <h3>新建项目</h3>
        <button class="icon-button" type="button" @click="emit('close')"><SvgIcon :src="icons.x" /></button>
      </div>
      <div class="modal-body">
        <label class="field">
          <span>项目名称 <b>*</b></span>
          <input v-model.trim="draft.name" type="text" placeholder="输入项目名称" @keyup.enter="create" />
        </label>
        <label class="field">
          <span>项目描述</span>
          <textarea v-model.trim="draft.description" rows="3" placeholder="描述这个活动的内容和范围（可选）" />
        </label>
        <p>将自动创建基础题型和难度，您可以在项目中自定义修改。</p>
      </div>
      <div class="modal-actions">
        <button type="button" @click="emit('close')">取消</button>
        <button class="primary" :disabled="!draft.name.trim()" type="button" @click="create"><SvgIcon :src="icons.plus" />创建项目</button>
      </div>
    </div>
  </div>
</template>
