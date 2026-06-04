<template>
  <div class="card overflow-hidden">
    <div class="datatable-scroll">
      <table class="datatable w-full">
        <thead class="datatable-head text-left">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="table-head px-4 py-2.5"
              :class="col.align === 'right' ? 'text-right' : ''"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" class="table-head px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border text-sm">
          <tr v-for="(row, idx) in rows" :key="getRowKey(row, idx)" class="table-row">
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 align-middle"
              :class="col.align === 'right' ? 'text-right' : ''"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="getValue(row, col.key)">
                {{ getValue(row, col.key) }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <slot name="actions" :row="row" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="rows.length === 0" class="px-4 py-10 text-center text-sm text-text-muted">
      {{ emptyText }}
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import { withDefaults } from 'vue';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

const props = withDefaults(
  defineProps<{
    columns: Column[];
    rows: T[];
    rowKey?: string;
    emptyText?: string;
  }>(),
  { rowKey: 'id', emptyText: 'No items yet.' }
);

const getRowKey = (row: T, idx: number) => (row[props.rowKey] as string) ?? idx;
const getValue = (row: T, key: string) => row[key as keyof T] ?? '';
</script>

<style scoped>
.datatable-scroll {
  width: 100%;
}

/* Subtle header band — quieter than a solid fill, with a crisp divider. */
.datatable-head {
  background: color-mix(in srgb, var(--soft-bg) 60%, transparent);
  border-bottom: 1px solid var(--border);
}
.datatable-head th { position: sticky; top: 0; }

@media (max-width: 1024px) {
  /* Let the table scroll sideways inside its card instead of breaking
     the page width. The wrapper scrolls; the table keeps its columns. */
  .datatable-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .datatable {
    display: table;
    min-width: 40rem;
  }
}
</style>
