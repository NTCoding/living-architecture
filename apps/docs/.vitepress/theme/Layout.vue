<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import mediumZoom from 'medium-zoom'

const { Layout } = DefaultTheme
const router = useRouter()

let cleanupEclairHandler: (() => void) | null = null

const initZoom = (): void => {
  mediumZoom('.vp-doc img, .VPHero .image-container img', {
    background: 'var(--vp-c-bg)'
  })
}

const initEclairLinkHandler = (): (() => void) => {
  const handler = (event: MouseEvent): void => {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    if (link === null) return

    const href = link.getAttribute('href')
    if (href === null || !href.startsWith('/eclair/')) return

    event.preventDefault()
    window.location.href = href
  }

  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
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
