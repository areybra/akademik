import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Sinkronkan tema tersimpan dengan atribut data-theme pada <html>.
useThemeStore(pinia).initTheme()

app.mount('#app')
