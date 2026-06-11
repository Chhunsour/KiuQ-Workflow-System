<template>
  <div class="pie-chart-container flex items-center justify-center gap-6">
    <div class="svg-pie-wrapper" ref="container">
      <svg viewBox="0 0 200 200" width="100%" height="100%" class="svg-pie">
        <!-- Center Hole and Outer Ring -->
        <g>
          <circle
            v-for="(slice, idx) in slices"
            :key="idx"
            cx="100"
            cy="100"
            r="70"
            fill="transparent"
            :stroke="slice.color"
            stroke-width="20"
            :stroke-dasharray="slice.dashArray"
            :stroke-dashoffset="slice.dashOffset"
            transform="rotate(-90 100 100)"
            class="pie-slice"
            :class="{ 'pie-slice--active': hoveredIndex === idx }"
            @mouseenter="hoverSlice(idx, $event)"
            @mouseleave="clearHover"
          />
        </g>

        <!-- Center Text -->
        <circle cx="100" cy="100" r="55" fill="var(--card-bg)" />
        <g class="center-text">
          <text x="100" y="95" text-anchor="middle" class="center-label">Total</text>
          <text x="100" y="120" text-anchor="middle" class="center-value">{{ totalSum }}</text>
        </g>
      </svg>
    </div>

    <!-- Legends -->
    <div class="pie-legends flex flex-col gap-2">
      <div
        v-for="(slice, idx) in slices"
        :key="idx"
        class="pie-legend flex items-center gap-2 text-xs font-semibold"
        :class="{ 'opacity-60': hoveredIndex !== null && hoveredIndex !== idx }"
      >
        <span class="legend-dot" :style="{ backgroundColor: slice.color }" />
        <span class="legend-label text-text-muted">{{ slice.label }}</span>
        <span class="legend-val text-text-main ml-auto font-bold">{{ slice.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  data: { label: string; value: number }[];
  colors?: string[];
}>(), {
  colors: () => ['#15D6C2', '#22c55e', '#f59e0b', '#ec4899', '#6366f1', '#a855f7', '#14b8a6']
});

const hoveredIndex = ref<number | null>(null);

const totalSum = computed(() => props.data.reduce((acc, d) => acc + d.value, 0));

// Compute dash arrays and offsets for SVG circles
const slices = computed(() => {
  const total = totalSum.value || 1;
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82
  
  let currentOffset = 0;

  return props.data.map((d, idx) => {
    const percentage = d.value / total;
    const sliceLength = percentage * circumference;
    const dashArray = `${sliceLength} ${circumference - sliceLength}`;
    const dashOffset = -currentOffset;
    
    currentOffset += sliceLength;

    return {
      label: d.label,
      value: d.value,
      color: props.colors[idx % props.colors.length],
      dashArray,
      dashOffset
    };
  });
});

const hoverSlice = (index: number, event: MouseEvent) => {
  hoveredIndex.value = index;
};

const clearHover = () => {
  hoveredIndex.value = null;
};
</script>

<script lang="ts">
export default {
  name: 'PieChart'
};
</script>

<style scoped>
.pie-chart-container {
  width: 100%;
}
.svg-pie-wrapper {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}
.svg-pie {
  display: block;
  overflow: visible;
}
.pie-slice {
  cursor: pointer;
  transition: stroke-width 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease;
}
.pie-slice:hover,
.pie-slice--active {
  stroke-width: 25;
  opacity: 0.9;
}
.center-label {
  font-size: 13px;
  font-weight: 700;
  fill: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.center-value {
  font-family: 'Jost Numbers', system-ui, sans-serif;
  font-size: 26px;
  font-weight: 950;
  fill: var(--text-main);
}
.pie-legends {
  flex: 1;
}
.pie-legend {
  transition: opacity 120ms ease;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-label {
  white-space: nowrap;
}
</style>
