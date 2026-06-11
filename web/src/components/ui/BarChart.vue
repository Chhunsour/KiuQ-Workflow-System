<template>
  <div class="svg-chart-container" ref="container">
    <svg :viewBox="`0 0 ${width} ${height}`" width="100%" height="100%" class="svg-chart">
      <!-- Defs for bar rounded shapes and colors -->
      <defs>
        <!-- Bar Gradient -->
        <linearGradient :id="`bar-grad-${chartId}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="1.0" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.65" />
        </linearGradient>
      </defs>

      <!-- Grid Lines -->
      <g v-if="!horizontal" class="chart-grid">
        <line
          v-for="tick in gridTicks"
          :key="tick"
          x1="40"
          :y1="tick"
          :x2="width - 10"
          :y2="tick"
          stroke="var(--border)"
          stroke-width="1"
        />
      </g>

      <!-- Bars -->
      <g>
        <rect
          v-for="(bar, idx) in bars"
          :key="idx"
          :x="bar.x"
          :y="bar.y"
          :width="bar.w"
          :height="bar.h"
          rx="6"
          ry="6"
          :fill="`url(#bar-grad-${chartId})`"
          class="chart-bar"
          :class="{ 'chart-bar--active': hoveredIndex === idx }"
          @mouseenter="hoverBar(idx, $event)"
          @mouseleave="clearHover"
        />
      </g>

      <!-- Labels (X or Y Axis) -->
      <g class="axis-labels">
        <text
          v-for="(label, idx) in labels"
          :key="idx"
          :x="label.x"
          :y="label.y"
          :text-anchor="label.anchor"
          :dominant-baseline="label.baseline"
          class="axis-text"
        >
          {{ label.text }}
        </text>
      </g>

      <!-- Y Axis Values (Vertical Mode) or X Axis Values (Horizontal Mode) -->
      <g v-if="!horizontal" class="axis-labels Y-labels">
        <text
          v-for="(val, idx) in yLabels"
          :key="idx"
          x="30"
          :y="val.y"
          text-anchor="end"
          dominant-baseline="middle"
          class="axis-text"
        >
          {{ val.label }}
        </text>
      </g>
    </svg>

    <!-- Floating Interactive Tooltip -->
    <div
      v-if="hoveredIndex !== null && tooltipData"
      class="chart-tooltip card"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
    >
      <div class="tooltip-label">{{ tooltipData.label }}</div>
      <div class="tooltip-value">{{ tooltipData.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  horizontal?: boolean;
}>(), {
  color: '#15D6C2',
  height: 220,
  horizontal: false
});

const chartId = Math.random().toString(36).substring(2, 9);
const width = ref(600);
const container = ref<HTMLDivElement | null>(null);
const hoveredIndex = ref<number | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    width.value = entry.contentRect.width || 600;
  }
});

onMounted(() => {
  if (container.value) {
    width.value = container.value.clientWidth || 600;
    resizeObserver.observe(container.value);
  }
});

onBeforeUnmount(() => {
  if (container.value) resizeObserver.unobserve(container.value);
});

const values = computed(() => props.data.map(d => d.value));
const maxVal = computed(() => Math.max(...values.value, 10));

// Grid calculations
const gridTicks = computed(() => {
  const step = (props.height - 40) / 4;
  return Array.from({ length: 5 }, (_, i) => props.height - 30 - i * step);
});

// Bars definitions
const bars = computed(() => {
  if (!props.data.length) return [];

  const max = maxVal.value;
  if (props.horizontal) {
    const startX = 80;
    const chartWidth = width.value - startX - 20;
    const chartHeight = props.height - 20;
    const barSpacing = chartHeight / props.data.length;
    const barHeight = Math.max(barSpacing * 0.6, 8);

    return props.data.map((d, idx) => {
      const w = Math.max((d.value / (max || 1)) * chartWidth, 4);
      const x = startX;
      const y = 10 + idx * barSpacing + (barSpacing - barHeight) / 2;
      return { x, y, w, h: barHeight };
    });
  } else {
    const startY = 15;
    const chartWidth = width.value - 60;
    const chartHeight = props.height - 45;
    const barSpacing = chartWidth / props.data.length;
    const barWidth = Math.max(barSpacing * 0.6, 8);

    return props.data.map((d, idx) => {
      const h = Math.max((d.value / (max || 1)) * chartHeight, 4);
      const x = 50 + idx * barSpacing + (barSpacing - barWidth) / 2;
      const y = props.height - 30 - h;
      return { x, y, w: barWidth, h };
    });
  }
});

// Grid labels
const labels = computed(() => {
  if (props.horizontal) {
    const chartHeight = props.height - 20;
    const barSpacing = chartHeight / props.data.length;
    return props.data.map((d, idx) => {
      const y = 10 + idx * barSpacing + barSpacing / 2;
      return {
        text: d.label,
        x: 70,
        y,
        anchor: 'end',
        baseline: 'middle'
      };
    });
  } else {
    const chartWidth = width.value - 60;
    const barSpacing = chartWidth / props.data.length;
    return props.data.map((d, idx) => {
      const x = 50 + idx * barSpacing + barSpacing / 2;
      return {
        text: d.label,
        x,
        y: props.height - 10,
        anchor: 'middle',
        baseline: 'auto'
      };
    });
  }
});

const yLabels = computed(() => {
  return Array.from({ length: 4 }).map((_, i) => {
    const val = (maxVal.value / 3) * i;
    const stepY = (props.height - 40) / 3;
    const y = props.height - 30 - i * stepY;
    return {
      label: Math.round(val),
      y
    };
  });
});

const tooltipData = computed(() => {
  if (hoveredIndex.value === null) return null;
  return props.data[hoveredIndex.value];
});

const hoverBar = (index: number, event: MouseEvent) => {
  hoveredIndex.value = index;
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    tooltipPos.value = {
      x: event.clientX - rect.left - 50,
      y: event.clientY - rect.top - 65
    };
  }
};

const clearHover = () => {
  hoveredIndex.value = null;
};
</script>

<script lang="ts">
export default {
  name: 'BarChart'
};
</script>

<style scoped>
.svg-chart-container {
  position: relative;
  width: 100%;
}
.svg-chart {
  display: block;
  overflow: visible;
}
.chart-bar {
  cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease;
}
.chart-bar--active {
  opacity: 0.85;
}
.axis-text {
  font-family: 'Jost Numbers', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  fill: var(--text-muted);
}
.chart-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-family: 'Jost Numbers', system-ui, sans-serif;
  box-shadow: var(--shadow-md);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tooltip-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 750;
  letter-spacing: 0.02em;
}
.tooltip-value {
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text-main);
  margin-top: 0.1rem;
}
</style>
