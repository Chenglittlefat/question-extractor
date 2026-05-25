<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'current' | 'error'

const appVersion = ref('')
const updateStatus = ref<UpdateStatus>('idle')
const updateMessage = ref('点击检查更新，将与 GitHub 最新发布版本比较。')
const updateDownloadUrl = ref('')

const versionText = computed(() => (appVersion.value ? `v${appVersion.value}` : '获取中'))
const isChecking = computed(() => updateStatus.value === 'checking')

async function loadAppVersion() {
  try {
    appVersion.value = (await window.questionApi?.getVersion()) ?? '0.0.0'
  } catch {
    appVersion.value = '0.0.0'
  }
}

async function checkForUpdates() {
  if (!window.questionApi?.checkForUpdates) {
    updateStatus.value = 'error'
    updateMessage.value = '浏览器预览模式暂不支持检查更新。'
    return
  }

  updateStatus.value = 'checking'
  updateMessage.value = '正在连接 GitHub 检查最新版本...'
  updateDownloadUrl.value = ''

  try {
    const result = await window.questionApi.checkForUpdates()
    appVersion.value = result.currentVersion
    updateDownloadUrl.value = result.downloadUrl || result.releaseUrl

    if (result.hasUpdate) {
      updateStatus.value = 'available'
      updateMessage.value = `发现新版本 v${result.latestVersion}，可以下载更新。`
    } else {
      updateStatus.value = 'current'
      updateMessage.value = `当前已是最新版本 v${result.currentVersion}。`
    }
  } catch {
    updateStatus.value = 'error'
    updateMessage.value = '检查更新失败，请确认网络可访问 GitHub 后重试。'
  }
}

function openDownloadPage() {
  if (!updateDownloadUrl.value) return
  void window.questionApi?.openExternal(updateDownloadUrl.value)
}

onMounted(() => {
  void loadAppVersion()
})
</script>

<template>
  <section class="version-card">
    <div class="version-card-head">
      <div>
        <span>当前版本</span>
        <strong>{{ versionText }}</strong>
      </div>
      <div class="version-actions">
        <button type="button" :disabled="isChecking" @click="checkForUpdates">
          {{ isChecking ? '检查中...' : '检查更新' }}
        </button>
        <button v-if="updateStatus === 'available' && updateDownloadUrl" class="primary" type="button" @click="openDownloadPage">
          下载新版
        </button>
      </div>
    </div>
    <p :class="['update-message', `is-${updateStatus}`]">{{ updateMessage }}</p>
  </section>
</template>
