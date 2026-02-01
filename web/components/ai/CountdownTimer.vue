<script setup lang="ts">
/**
 * CountdownTimer Component
 * Shows remaining time before auto-approval (5-minute window)
 */

const props = defineProps<{
  deadline: Date | null;
}>();

const emit = defineEmits<{
  expired: [];
}>();

const timeRemaining = ref('');
const isExpired = ref(false);
const percentage = ref(100);

let interval: ReturnType<typeof setInterval> | null = null;

const updateTimer = () => {
  if (!props.deadline) {
    timeRemaining.value = '--:--';
    return;
  }

  const now = new Date();
  const diff = props.deadline.getTime() - now.getTime();

  if (diff <= 0) {
    timeRemaining.value = '00:00';
    isExpired.value = true;
    percentage.value = 0;
    if (interval) clearInterval(interval);
    emit('expired');
    return;
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  timeRemaining.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Calculate percentage (5 minutes = 300000ms)
  percentage.value = Math.max(0, Math.min(100, (diff / 300000) * 100));
};

onMounted(() => {
  updateTimer();
  interval = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

watch(() => props.deadline, () => {
  isExpired.value = false;
  updateTimer();
});
</script>

<template>
  <div class="countdown-timer" :class="{ expired: isExpired, warning: percentage < 20 }">
    <div v-if="!isExpired" class="timer-display">
      <span class="icon">⏱️</span>
      <span class="time">{{ timeRemaining }}</span>
      <span class="label">còn lại</span>
    </div>
    <div v-else class="timer-display expired">
      <span class="icon">✅</span>
      <span class="label">Auto-approved</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${percentage}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.countdown-timer {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  font-family: 'SF Mono', monospace;
}

.countdown-timer.warning {
  background: #fef3c7;
  border-color: #fcd34d;
}

.countdown-timer.expired {
  background: #dcfce7;
  border-color: #86efac;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon {
  font-size: 16px;
}

.time {
  font-size: 18px;
  font-weight: 600;
  color: #0369a1;
}

.countdown-timer.warning .time {
  color: #d97706;
}

.label {
  font-size: 12px;
  color: #64748b;
}

.timer-display.expired .label {
  color: #16a34a;
  font-weight: 500;
}

.progress-bar {
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #0ea5e9;
  transition: width 1s linear;
}

.countdown-timer.warning .progress-fill {
  background: #f59e0b;
}
</style>
