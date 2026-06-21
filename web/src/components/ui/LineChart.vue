<template>
  <div class="svg-chart-container" ref="container">
    <svg :viewBox="`0 0 ${width} ${height}`" width="100%" height="100%" class="svg-chart">
      <!-- Defs for gradients, glows and clips -->
      <defs>
        <!-- Background Area Gradient -->
        <linearGradient :id="`area-grad-${chartId}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.00" />
        </linearGradient>

        <!-- Line Stroke Glow Filter -->
        <filter :id="`glow-${chartId}`" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" :flood-color="color" flood-opacity="0.35" />
        </filter>
      </defs>

      <!-- Grid Lines -->
      <g class="chart-grid">
        <line
          v-for="tick in gridTicks"
          :key="tick"
          x1="40"
          :y1="tick"
          :x2="width - 20"
          :y2="tick"
          stroke="var(--border)"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
      </g>

      <!-- Area Path under the Line -->
      <path :d="areaPath" :fill="`url(#area-grad-${chartId})`" class="chart-area-path" />

      <!-- Optional Comparison Line -->
      <path
        v-if="compareLinePath"
        :d="compareLinePath"
        fill="none"
        stroke="var(--text-muted)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="4,4"
        opacity="0.6"
        class="chart-compare-line-path"
      />

      <!-- Glowing Trend Line -->
      <path
        :d="linePath"
        fill="none"
        :stroke="color"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        :filter="`url(#glow-${chartId})`"
        class="chart-line-path"
      />

      <!-- Interactive Tooltip Node Circles -->
      <g>
        <circle
          v-for="(pt, idx) in points"
          :key="idx"
          :cx="pt.x"
          :cy="pt.y"
          r="5"
          :fill="pt.active ? '#ffffff' : color"
          :stroke="color"
          stroke-width="3"
          class="chart-node"
          @mouseenter="hoverNode(idx, $event)"
          @mouseleave="clearHover"
        />
      </g>

      <!-- X-Axis Labels -->
      <g class="axis-labels">
        <text
          v-for="(pt, idx) in points"
          :key="idx"
          :x="pt.x"
          :y="height - 5"
          text-anchor="middle"
          class="axis-text"
        >
          {{ idx % Math.max(1, Math.round(points.length / 6)) === 0 || idx === points.length - 1 ? pt.label : '' }}
        </text>
      </g>

      <!-- Y-Axis Ticks -->
      <g class="axis-labels Y-labels">
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
      <div v-if="tooltipCompareData" class="text-[10px] text-text-muted mt-0.5 border-t border-border pt-0.5 w-full text-center">
        Prev: <span class="font-bold text-text-main">{{ tooltipCompareData.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  data: { label: string; value: number }[];
  compareData?: { label: string; value: number }[];
  color?: string;
  height?: number;
}>(), {
  color: '#15D6C2',
  height: 220,
  compareData: () => []
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

// Grid ticks calculations
const paddingY = 30;
const gridTicks = computed(() => {
  const step = (props.height - paddingY - 20) / 4;
  return Array.from({ length: 5 }, (_, i) => props.height - paddingY - i * step);
});

const values = computed(() => {
  const main = props.data.map(d => d.value);
  const comp = props.compareData ? props.compareData.map(d => d.value) : [];
  return [...main, ...comp];
});
const minVal = computed(() => values.value.length ? Math.min(...values.value, 0) : 0);
const maxVal = computed(() => values.value.length ? Math.max(...values.value, 10) : 10);

// Map coordinates
const points = computed(() => {
  if (!props.data.length) return [];
  const chartWidth = width.value - 60;
  const chartHeight = props.height - paddingY - 20;
  const paddingX = 45;

  return props.data.map((d, idx) => {
    const x = paddingX + (idx / (props.data.length - 1)) * chartWidth;
    const yRange = maxVal.value - minVal.value;
    const y = props.height - paddingY - ((d.value - minVal.value) / (yRange || 1)) * chartHeight;
    return {
      x,
      y,
      label: d.label,
      value: d.value,
      active: hoveredIndex.value === idx
    };
  });
});

// SVGs paths generator
const linePath = computed(() => {
  if (points.value.length < 2) return '';
  return points.value.reduce((path, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');
});

const areaPath = computed(() => {
  if (points.value.length < 2) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  const baselineY = props.height - paddingY;
  return `${linePath.value} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
});

// Comparison line path mapping
const comparePoints = computed(() => {
  if (!props.compareData || !props.compareData.length) return [];
  const chartWidth = width.value - 60;
  const chartHeight = props.height - paddingY - 20;
  const paddingX = 45;
  const len = props.compareData.length;

  return props.compareData.map((d, idx) => {
    const x = paddingX + (idx / (len - 1)) * chartWidth;
    const yRange = maxVal.value - minVal.value;
    const y = props.height - paddingY - ((d.value - minVal.value) / (yRange || 1)) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });
});

const compareLinePath = computed(() => {
  if (comparePoints.value.length < 2) return '';
  return comparePoints.value.reduce((path, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');
});

// Y-Axis labels
const yLabels = computed(() => {
  const range = maxVal.value - minVal.value;
  return Array.from({ length: 4 }).map((_, i) => {
    const val = minVal.value + (range / 3) * i;
    const stepY = (props.height - paddingY - 20) / 3;
    const y = props.height - paddingY - i * stepY;
    return {
      label: Math.round(val),
      y
    };
  });
});

// Interaction handling
const tooltipData = computed(() => {
  if (hoveredIndex.value === null) return null;
  return props.data[hoveredIndex.value];
});

const tooltipCompareData = computed(() => {
  if (hoveredIndex.value === null || !props.compareData || !props.compareData.length) return null;
  // Try to match by index, since comparison arrays should align (same length range)
  if (hoveredIndex.value < props.compareData.length) {
    return props.compareData[hoveredIndex.value];
  }
  return null;
});

const hoverNode = (index: number, event: MouseEvent) => {
  hoveredIndex.value = index;
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    tooltipPos.value = {
      x: event.clientX - rect.left - 50,
      y: event.clientY - rect.top - 85
    };
  }
};

const clearHover = () => {
  hoveredIndex.value = null;
};
</script>

<script lang="ts">
export default {
  name: 'LineChart'
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
.chart-node {
  cursor: pointer;
  transition: r 150ms ease, fill 150ms ease;
}
.chart-node:hover {
  r: 8px;
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
