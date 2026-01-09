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

const isEclairPath = (href: string): boolean => {
  const basePath = href.split('#')[0]
  return basePath === '/eclair' || basePath.startsWith('/eclair/') || basePath.startsWith('/eclair?')
}

const initEclairLinkHandler = (): (() => void) => {
  const handler = (event: MouseEvent): void => {
    // Let browser handle modifier keys and middle-click
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return

    const target = event.target
    if (!(target instanceof Element)) return

    const link = target.closest('a')
    if (link === null) return

    const href = link.getAttribute('href')
    if (href === null || !isEclairPath(href)) return

    // Force full page navigation to eclair, bypassing VitePress router
    event.preventDefault()
    event.stopImmediatePropagation()
    window.location.href = href
  }

  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
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
