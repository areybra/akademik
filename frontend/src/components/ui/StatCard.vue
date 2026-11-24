<template>
  <div class="card stat-card" :class="`card-accent-${variant}`">
    <div class="stat-card-content">
      <span class="stat-label">{{ title }}</span>
      <h3 class="stat-value">{{ value }}</h3>
      <p class="stat-trend" v-if="trend">
        <TrendingUp :size="14" class="trend-icon" /> {{ trend }}
      </p>
    </div>
    <div class="stat-icon-wrapper" :class="`icon-bg-${variant}`">
      <slot name="icon" />
    </div>
  </div>
</template>

<script setup>
import { TrendingUp } from "lucide-vue-next";

defineProps({
  title: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  trend: {
    type: String,
    default: "",
  },
  variant: {
    type: String,
    default: "primary",
    validator: (v) =>
      ["primary", "success", "warning", "danger", "info"].includes(v),
  },
});
</script>

<style scoped>
.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-left: 4px solid transparent;
}

.card-accent-primary {
  border-left-color: rgb(var(--accent-500));
}
.card-accent-success {
  border-left-color: rgb(var(--emerald-600));
}
.card-accent-warning {
  border-left-color: rgb(var(--amber-600));
}
.card-accent-danger {
  border-left-color: rgb(var(--danger));
}
.card-accent-info {
  border-left-color: rgb(var(--sky-600));
}

.stat-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: rgb(var(--ink));
  line-height: 1.1;
}

.stat-trend {
  font-size: 0.75rem;
  color: rgb(var(--muted));
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-bg-primary {
  background-color: rgb(var(--accent-50));
  color: rgb(var(--accent-600));
}
.icon-bg-success {
  background-color: rgb(var(--emerald-50));
  color: rgb(var(--emerald-700));
}
.icon-bg-warning {
  background-color: rgb(var(--amber-50));
  color: rgb(var(--amber-700));
}
.icon-bg-danger {
  background-color: rgb(var(--rose-50));
  color: rgb(var(--rose-700));
}
.icon-bg-info {
  background-color: rgb(var(--sky-50));
  color: rgb(var(--sky-700));
}
</style>
