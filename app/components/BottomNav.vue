<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-2 pb-6 z-50">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors"
      :class="isActive(item.to) ? 'text-black' : 'text-gray-400 hover:text-gray-600'"
    >
      <component :is="item.icon" class="w-6 h-6" />
      <span class="font-medium" style="font-size:12px">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { HomeIcon, BookOpenIcon, ListBulletIcon, ChartBarIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";

const route = useRoute();

const navItems = [
  { to: "/dashboard", label: "홈", icon: HomeIcon },
  { to: "/books", label: "책", icon: BookOpenIcon },
  { to: "/sets", label: "세트", icon: ListBulletIcon },
  { to: "/stats", label: "통계", icon: ChartBarIcon },
  { to: "/settings", label: "설정", icon: Cog6ToothIcon },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>
