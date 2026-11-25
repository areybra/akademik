<template>
  <div v-if="!route.meta.layout || route.meta.layout !== 'auth'" class="min-h-screen">
    <AppLayout>
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition name="fade" mode="out-in">
          <div :key="currentRoute.path" class="min-h-full">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </AppLayout>
  </div>
  <div v-else class="min-h-screen">
    <router-view v-slot="{ Component, route: currentRoute }">
      <transition name="fade" mode="out-in">
        <div :key="currentRoute.path" class="min-h-full">
          <component :is="Component" />
        </div>
      </transition>
    </router-view>
  </div>
  <AlertToast />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AppLayout from './components/layout/AppLayout.vue'
import AlertToast from './components/ui/AlertToast.vue'

const route = useRoute()
const authStore = useAuthStore()

onMounted(() => {
  authStore.initAuth()
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

* {
  @apply antialiased;
}
</style>

