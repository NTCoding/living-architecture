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

const initEclairLinkHandler = (): void => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    if (link === null) return

    const href = link.getAttribute('href')
    if (href === null || !href.startsWith('/eclair/')) return

    event.preventDefault()
    window.location.href = href
  })
}

onMounted(() => {
  initZoom()
  initEclairLinkHandler()
})
router.onAfterRouteChanged = initZoom
</script>

<template>
  <Layout />
</template>
