<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around px-2 pt-2 pb-6 z-50" style="box-shadow:0 -1px 0 0 rgba(0,0,0,0.05)">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors text-black"
    >
      <img
        :src="isActive(item.to) ? item.iconOn : item.icon"
        class="w-6 h-6"
        :alt="item.label"
      />
      <span style="font-size:13px;font-weight:400">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import icoHome from "~/assets/images/nav_ico_home.svg";
import icoHomeOn from "~/assets/images/nav_ico_home_on.svg";
import icoBook from "~/assets/images/nav_ico_book.svg";
import icoBookOn from "~/assets/images/nav_ico_book_on.svg";
import icoSet from "~/assets/images/nav_ico_set.svg";
import icoSetOn from "~/assets/images/nav_ico_set_on.svg";
import icoStats from "~/assets/images/nav_ico_stats.svg";
import icoStatsOn from "~/assets/images/nav_ico_stats_on.svg";
import icoSetting from "~/assets/images/nav_ico_setting.svg";
import icoSettingOn from "~/assets/images/nav_ico_setting_on.svg";

const route = useRoute();

const navItems = [
  { to: "/dashboard", label: "홈", icon: icoHome, iconOn: icoHomeOn },
  { to: "/books", label: "책", icon: icoBook, iconOn: icoBookOn },
  { to: "/sets", label: "세트", icon: icoSet, iconOn: icoSetOn },
  { to: "/stats", label: "통계", icon: icoStats, iconOn: icoStatsOn },
  { to: "/settings", label: "설정", icon: icoSetting, iconOn: icoSettingOn },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>
