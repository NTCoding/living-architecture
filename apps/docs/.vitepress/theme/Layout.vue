<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import mediumZoom from 'medium-zoom'
import { initEclairLinkHandler } from './eclairLinkHandler'

const { Layout } = DefaultTheme
const router = useRouter()

let cleanupEclairHandler: (() => void) | null = null

const initZoom = (): void => {
  mediumZoom('.vp-doc img, .VPHero .image-container img', {
    background: 'var(--vp-c-bg)'
  })
}

onMounted(() => {
  initZoom()
  cleanupEclairHandler = initEclairLinkHandler()
})

onUnmounted(() => {
  if (cleanupEclairHandler !== null) {
    cleanupEclairHandler()
    cleanupEclairHandler = null
  }
})

router.onAfterRouteChanged = initZoom
</script>

<template>
  <Layout />
</template>
