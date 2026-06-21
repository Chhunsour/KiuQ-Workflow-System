<template>
  <div
    class="svg-chart-container"
    ref="container"
    @mousemove="handleMouseMove"
    @mouseleave="clearHover"
    @touchmove="handleTouchMove"
    @touchend="clearHover"
  >
    <svg :viewBox="`0 0 ${width} ${height}`" width="100%" height="100%" class="svg-chart select-none">
      <!-- Defs for gradients and glows -->
      <defs>
        <!-- Background Area Gradient -->
        <linearGradient :id="`area-grad-${chartId}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.08" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.00" />
        </linearGradient>

        <!-- Line Stroke Glow Filter -->
        <filter :id="`glow-${chartId}`" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" :flood-color="color" flood-opacity="0.12" />
        </filter>
      </defs>

      <!-- Grid Lines -->
      <g class="chart-grid">
        <line
          v-for="tick in gridTicks"
          :key="tick"
          x1="45"
          :y1="tick"
          :x2="width - 20"
          :y2="tick"
          stroke="var(--border)"
          stroke-width="1"
          opacity="0.4"
        />
      </g>

      <!-- Area Path under the Line (Bezier closed) -->
      <path :d="areaPath" :fill="`url(#area-grad-${chartId})`" class="chart-area-path transition-all duration-300" />

      <!-- Comparison Line (Dashed Bezier) -->
      <path
        v-if="compareLinePath"
        :d="compareLinePath"
        fill="none"
        stroke="var(--text-muted)"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="4,4"
        opacity="0.45"
        class="chart-compare-line-path"
      />

      <!-- Main Trend Line (Smooth Bezier) -->
      <path
        :d="linePath"
        fill="none"
        :stroke="color"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        :filter="`url(#glow-${chartId})`"
        class="chart-line-path transition-all duration-300"
      />

      <!-- Horizontal Average Line -->
      <g v-if="showAverageLine && points.length > 1">
        <line
          :x1="45"
          :y1="avgY"
          :x2="width - 20"
          :y2="avgY"
          stroke="var(--text-muted)"
          stroke-width="1"
          stroke-dasharray="3,3"
          opacity="0.5"
        />
        <text
          :x="width - 25"
          :y="avgY - 4"
          text-anchor="end"
          class="axis-text opacity-75 font-semibold text-[8px]"
        >
          Avg: {{ formatYValue(avgVal) }}
        </text>
      </g>

      <!-- Peak Max Point Indicator -->
      <g v-if="peakIndex !== -1 && points[peakIndex]">
        <!-- Pulsing breathing indicator (outer ring) -->
        <circle
          :cx="points[peakIndex].x"
          :cy="points[peakIndex].y"
          r="6"
          fill="none"
          :stroke="color"
          stroke-width="1.25"
          opacity="0.45"
          class="animate-pulse-slow"
        />
        <!-- Center core dot -->
        <circle
          :cx="points[peakIndex].x"
          :cy="points[peakIndex].y"
          r="3"
          :fill="color"
        />
      </g>

      <!-- Active Coordinate Overlay (Vertical Tracking Line) -->
      <g v-if="hoveredIndex !== null && points[hoveredIndex]">
        <line
          :x1="points[hoveredIndex].x"
          :y1="20"
          :x2="points[hoveredIndex].x"
          :y2="height - paddingY"
          stroke="var(--border)"
          stroke-width="1"
          stroke-dasharray="3,3"
        />
        <!-- Active point highlight circle -->
        <circle
          :cx="points[hoveredIndex].x"
          :cy="points[hoveredIndex].y"
          r="6"
          :fill="color"
          opacity="0.2"
        />
        <circle
          :cx="points[hoveredIndex].x"
          :cy="points[hoveredIndex].y"
          r="3.5"
          fill="var(--card-bg)"
          :stroke="color"
          stroke-width="2"
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
          x="35"
          :y="val.y"
          text-anchor="end"
          dominant-baseline="middle"
          class="axis-text"
        >
          {{ val.label }}
        </text>
      </g>
    </svg>

    <!-- Floating Interactive Tooltip (Glassmorphism layout) -->
    <div
      v-if="hoveredIndex !== null && tooltipData"
      class="chart-tooltip"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
      style="transform: translate(-50%, -100%);"
    >
      <div class="tooltip-header text-[10px] text-text-muted font-bold font-sans tracking-wide border-b border-border/30 pb-1 mb-1">
        {{ formatFullDate(tooltipData.rawDate || tooltipData.label) }}
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-6">
          <span class="text-[10px] font-sans flex items-center gap-1.5 text-text-main">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: color }" />
            {{ metricName }}
          </span>
          <span class="text-[11px] font-number font-bold text-text-main">
            {{ formatMetricValue(tooltipData.value) }}
          </span>
        </div>
        <template v-if="tooltipCompareData">
          <div class="flex items-center justify-between gap-6">
            <span class="text-[10px] font-sans flex items-center gap-1.5 text-text-muted">
              <span class="w-1.5 h-1.5 rounded-full bg-text-muted" />
              Previous
            </span>
            <span class="text-[11px] font-number font-bold text-text-muted">
              {{ formatMetricValue(tooltipCompareData.value) }}
            </span>
          </div>
          <div
            v-if="trendDelta"
            class="text-[9px] font-bold text-right font-number mt-0.5"
            :class="trendDelta.good ? 'text-status-approved-fg' : 'text-status-needs-fix-fg'"
          >
            {{ trendDelta.good ? '▲' : '▼' }} {{ trendDelta.pctLabel }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  data: { label: string; value: number; rawDate?: string }[];
  compareData?: { label: string; value: number; rawDate?: string }[];
  color?: string;
  height?: number;
  metricType?: 'clicks' | 'impressions' | 'ctr' | 'position';
  metricName?: string;
  showAverageLine?: boolean;
}>(), {
  color: '#15D6C2',
  height: 220,
  compareData: () => [],
  metricType: 'clicks',
  metricName: 'Clicks',
  showAverageLine: true
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

// Settings & calculations
const paddingY = 30;
const isPosition = computed(() => props.metricType === 'position');

// Grid ticks coordinates
const gridTicks = computed(() => {
  const step = (props.height - paddingY - 20) / 4;
  return Array.from({ length: 5 }, (_, i) => props.height - paddingY - i * step);
});

const values = computed(() => {
  const main = props.data.map(d => d.value);
  const comp = props.compareData ? props.compareData.map(d => d.value) : [];
  return [...main, ...comp];
});

const minVal = computed(() => {
  if (!values.value.length) return 0;
  const rawMin = Math.min(...values.value);
  if (isPosition.value) {
    // Average positions floor at 1.0, don't allow lower bounds
    return Math.max(1, Math.floor(rawMin));
  }
  return 0; // standard metrics anchor at 0
});

const maxVal = computed(() => {
  if (!values.value.length) return 10;
  const rawMax = Math.max(...values.value);
  return Math.max(rawMax, 1);
});

// Map coordinates for points
const points = computed(() => {
  if (!props.data.length) return [];
  const chartWidth = width.value - 65;
  const chartHeight = props.height - paddingY - 20;
  const paddingX = 45;

  return props.data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, props.data.length - 1)) * chartWidth;
    const yRange = maxVal.value - minVal.value;
    let pct = (d.value - minVal.value) / (yRange || 1);
    if (isPosition.value) {
      // Invert: lower numbers (better ranks) go to top of chart
      pct = 1 - pct;
    }
    const y = props.height - paddingY - pct * chartHeight;
    return {
      x,
      y,
      label: d.label,
      value: d.value,
      rawDate: d.rawDate
    };
  });
});

// Catmull-Rom spline path generator for smooth bezier lines
const getBezierPath = (pts: { x: number; y: number }[]) => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let path = `M ${pts[0].x} ${pts[0].y}`;
  const tension = 0.15; // sweet spot for smooth SaaS curves

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];

    let cp1x = p0.x;
    let cp1y = p0.y;
    if (i > 0) {
      const prev = pts[i - 1];
      const next = p1;
      cp1x = p0.x + (next.x - prev.x) * tension;
      cp1y = p0.y + (next.y - prev.y) * tension;
    } else {
      cp1x = p0.x + (p1.x - p0.x) * tension;
      cp1y = p0.y + (p1.y - p0.y) * tension;
    }

    let cp2x = p1.x;
    let cp2y = p1.y;
    if (i < pts.length - 2) {
      const prev = p0;
      const next = pts[i + 2];
      cp2x = p1.x - (next.x - prev.x) * tension;
      cp2y = p1.y - (next.y - prev.y) * tension;
    } else {
      cp2x = p1.x - (p1.x - p0.x) * tension;
      cp2y = p1.y - (p1.y - p0.y) * tension;
    }

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return path;
};

const linePath = computed(() => getBezierPath(points.value));

const areaPath = computed(() => {
  if (points.value.length < 2) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  const baselineY = props.height - paddingY;
  return `${linePath.value} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
});

// Comparison line path mappings
const comparePoints = computed(() => {
  if (!props.compareData || !props.compareData.length) return [];
  const chartWidth = width.value - 65;
  const chartHeight = props.height - paddingY - 20;
  const paddingX = 45;
  const len = props.compareData.length;

  return props.compareData.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, len - 1)) * chartWidth;
    const yRange = maxVal.value - minVal.value;
    let pct = (d.value - minVal.value) / (yRange || 1);
    if (isPosition.value) {
      pct = 1 - pct;
    }
    const y = props.height - paddingY - pct * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });
});

const compareLinePath = computed(() => getBezierPath(comparePoints.value));

// Format utility for Y values
const formatYValue = (val: number) => {
  if (props.metricType === 'ctr') {
    return `${val.toFixed(1)}%`;
  }
  if (props.metricType === 'position') {
    return val.toFixed(1);
  }
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1)}M`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1)}K`;
  }
  return Math.round(val).toString();
};

const formatMetricValue = (val: number) => {
  if (props.metricType === 'ctr') {
    return `${val.toFixed(2)}%`;
  }
  if (props.metricType === 'position') {
    return val.toFixed(2);
  }
  return val.toLocaleString();
};

const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year as any, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  return dateStr;
};

// Y-Axis labels (inverted if position)
const yLabels = computed(() => {
  const range = maxVal.value - minVal.value;
  return Array.from({ length: 4 }).map((_, i) => {
    const stepY = (props.height - paddingY - 20) / 3;
    const y = props.height - paddingY - i * stepY;
    
    let val;
    if (isPosition.value) {
      val = maxVal.value - (range / 3) * i;
    } else {
      val = minVal.value + (range / 3) * i;
    }
    
    return {
      label: formatYValue(val),
      y
    };
  });
});

// Averages computation
const avgVal = computed(() => {
  if (!props.data.length) return 0;
  const sum = props.data.reduce((acc, d) => acc + d.value, 0);
  return sum / props.data.length;
});

const avgY = computed(() => {
  const chartHeight = props.height - paddingY - 20;
  const yRange = maxVal.value - minVal.value;
  let pct = (avgVal.value - minVal.value) / (yRange || 1);
  if (isPosition.value) {
    pct = 1 - pct;
  }
  return props.height - paddingY - pct * chartHeight;
});

// Peak Index
const peakIndex = computed(() => {
  if (!props.data.length) return -1;
  let targetIdx = 0;
  if (isPosition.value) {
    // Best average position (minimum numerical value)
    let minV = Infinity;
    props.data.forEach((d, idx) => {
      if (d.value < minV) {
        minV = d.value;
        targetIdx = idx;
      }
    });
  } else {
    // Maximum click or impression count
    let maxV = -Infinity;
    props.data.forEach((d, idx) => {
      if (d.value > maxV) {
        maxV = d.value;
        targetIdx = idx;
      }
    });
  }
  return targetIdx;
});

// Interaction details
const tooltipData = computed(() => {
  if (hoveredIndex.value === null) return null;
  return props.data[hoveredIndex.value];
});

const tooltipCompareData = computed(() => {
  if (hoveredIndex.value === null || !props.compareData || !props.compareData.length) return null;
  if (hoveredIndex.value < props.compareData.length) {
    return props.compareData[hoveredIndex.value];
  }
  return null;
});

const trendDelta = computed(() => {
  if (hoveredIndex.value === null || !tooltipData.value || !tooltipCompareData.value) return null;
  const cur = tooltipData.value.value;
  const prev = tooltipCompareData.value.value;

  if (props.metricType === 'position') {
    const improved = cur < prev;
    const diff = Math.abs(prev - cur);
    const pct = prev ? (diff / prev) * 100 : 0;
    return {
      good: improved,
      pctLabel: `${improved ? '-' : '+'}${pct.toFixed(1)}%`
    };
  }

  const diff = cur - prev;
  const pct = prev ? (diff / prev) * 100 : 0;
  return {
    good: diff >= 0,
    pctLabel: `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  };
});

// Mouse tracker coordinate scaling
const handleMouseMove = (event: MouseEvent) => {
  if (!points.value.length || !container.value) return;
  const rect = container.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const scaleX = width.value / (rect.width || 1);
  const scaleY = props.height / (rect.height || 1);

  const svgMouseX = mouseX * scaleX;
  const svgMouseY = mouseY * scaleY;

  let closestIdx = 0;
  let minDiff = Infinity;
  points.value.forEach((pt, idx) => {
    const diff = Math.abs(pt.x - svgMouseX);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
  });

  hoveredIndex.value = closestIdx;

  const targetPt = points.value[closestIdx];
  const clientX = targetPt.x / scaleX;
  const clientY = targetPt.y / scaleY;

  const tooltipWidth = 140; // rough width in pixels
  let x = clientX;
  if (x - tooltipWidth / 2 < 10) {
    x = tooltipWidth / 2 + 10;
  } else if (x + tooltipWidth / 2 > rect.width - 10) {
    x = rect.width - tooltipWidth / 2 - 10;
  }

  tooltipPos.value = {
    x,
    y: clientY - 12
  };
};

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length) {
    const touch = event.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    } as MouseEvent);
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
.axis-text {
  font-family: 'Pliant', 'Jost Numbers', system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  fill: var(--text-muted);
}
.chart-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 0.55rem 0.85rem;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 50;
  transition: left 80ms cubic-bezier(0.2, 0.8, 0.2, 1), top 80ms cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.animate-pulse-slow {
  animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% {
    opacity: 0.45;
    transform: scale(1);
  }
  50% {
    opacity: 0.15;
    transform: scale(1.25);
  }
}
</style>
