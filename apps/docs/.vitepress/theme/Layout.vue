<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import { useRouter } from 'vitepress'
import mediumZoom from 'medium-zoom'

const { Layout } = DefaultTheme
const router = useRouter()

const initZoom = (): void => {
  mediumZoom('.vp-doc img, .VPHero .image-container img', {
    background: 'var(--vp-c-bg)'
  })
}

onMounted(initZoom)
router.onAfterRouteChanged = initZoom
</script>

<template>
  <Layout />
</template>
