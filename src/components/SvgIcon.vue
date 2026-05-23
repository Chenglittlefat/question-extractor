<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    size?: number
    label?: string
  }>(),
  { size: 16, label: '' },
)

const style = computed(() => ({
  '--icon-src': `url("${props.src}")`,
  '--icon-size': `${props.size}px`,
}))
</script>

<template>
  <span class="svg-icon" :aria-hidden="label ? undefined : 'true'" :aria-label="label || undefined" :style="style" />
</template>
