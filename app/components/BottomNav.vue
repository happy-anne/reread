<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors"
      :class="isActive(item.to) ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'"
    >
      <component :is="item.icon" class="w-5 h-5" />
      <span class="text-[10px] font-medium">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { HomeIcon, BookOpenIcon, ListBulletIcon, ChartBarIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";

const route = useRoute();

const navItems = [
  { to: "/dashboard", label: "Today", icon: HomeIcon },
  { to: "/books", label: "Books", icon: BookOpenIcon },
  { to: "/sets", label: "Sets", icon: ListBulletIcon },
  { to: "/stats", label: "Stats", icon: ChartBarIcon },
  { to: "/settings", label: "설정", icon: Cog6ToothIcon },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>
