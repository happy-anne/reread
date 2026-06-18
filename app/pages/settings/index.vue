<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const notificationTime = ref("21:00");
const restDays = ref<number[]>([]);
const saving = ref(false);
const savedMsg = ref(false);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const daysRemaining = ref<number | null>(null);

// PIN management
const pinSet = ref(false);
const showPinModal = ref(false);
const pinStep = ref<"enter" | "confirm">("enter");
const pinDraft = ref("");
const pinConfirmDraft = ref("");
const pinError = ref("");

async function fetchSettings() {
  if (!user.value) return;
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.value.id)
    .single();
  if (data) {
    notificationTime.value = data.notification_time ?? "21:00";
    restDays.value = data.rest_days ?? [];
  }
}

function toggleRestDay(day: number) {
  const idx = restDays.value.indexOf(day);
  if (idx >= 0) restDays.value.splice(idx, 1);
  else restDays.value.push(day);
}

async function saveSettings() {
  if (!user.value) return;
  saving.value = true;
  await supabase.from("user_settings").upsert({
    user_id: user.value.id,
    notification_time: notificationTime.value,
    rest_days: restDays.value,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  saving.value = false;
  savedMsg.value = true;
  setTimeout(() => (savedMsg.value = false), 2000);
}

async function signOut() {
  clearLoginAt();
  await supabase.auth.signOut();
  navigateTo("/login");
}

function openPinModal() {
  pinStep.value = "enter";
  pinDraft.value = "";
  pinConfirmDraft.value = "";
  pinError.value = "";
  showPinModal.value = true;
}

function pressPinDigit(digit: string) {
  const target = pinStep.value === "enter" ? pinDraft : pinConfirmDraft;
  if (target.value.length >= 4) return;
  target.value += digit;

  if (target.value.length === 4) {
    if (pinStep.value === "enter") {
      pinStep.value = "confirm";
    } else {
      if (pinConfirmDraft.value === pinDraft.value) {
        setPin(pinDraft.value).then(() => {
          pinSet.value = true;
          showPinModal.value = false;
        });
      } else {
        pinError.value = "PIN이 일치하지 않아요. 다시 시도해주세요.";
        pinStep.value = "enter";
        pinDraft.value = "";
        pinConfirmDraft.value = "";
      }
    }
  }
}

function backspacePinDigit() {
  const target = pinStep.value === "enter" ? pinDraft : pinConfirmDraft;
  target.value = target.value.slice(0, -1);
}

function onPinKeydown(e: KeyboardEvent) {
  if (!showPinModal.value) return;
  if (e.key >= "0" && e.key <= "9") pressPinDigit(e.key);
  else if (e.key === "Backspace") backspacePinDigit();
  else if (e.key === "Escape") showPinModal.value = false;
}

function disablePin() {
  if (!confirm("PIN 잠금을 해제할까요?")) return;
  removePin();
  pinSet.value = false;
}

onMounted(() => {
  fetchSettings();
  daysRemaining.value = getDaysRemaining();
  pinSet.value = hasPin();
  window.addEventListener("keydown", onPinKeydown);
});
onUnmounted(() => window.removeEventListener("keydown", onPinKeydown));
</script>

<template>
  <div class="px-4 pt-8 pb-4 max-w-lg mx-auto">
    <h1 class="text-2xl font-bold text-black mb-6">Settings</h1>

    <div class="space-y-3">
      <!-- Notification -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 class="font-semibold text-black mb-3">알림</h2>
        <div>
          <label class="text-sm text-gray-500 block mb-1.5">알림 시간</label>
          <input
            v-model="notificationTime"
            type="time"
            class="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-gray-200 transition-colors"
          />
        </div>
      </div>

      <!-- Rest days -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 class="font-semibold text-black mb-1">기본 쉬는 날</h2>
        <p class="text-gray-400 text-xs mb-3">새 읽기 세트에 기본 적용돼요. 각 세트에서 변경할 수 있어요.</p>
        <div class="flex gap-1.5">
          <button
            v-for="(label, idx) in DAY_LABELS"
            :key="idx"
            type="button"
            @click="toggleRestDay(idx)"
            class="flex-1 py-2 rounded-full text-xs font-medium transition-colors"
            :class="
              restDays.includes(idx)
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            "
          >
            {{ label }}
          </button>
        </div>
      </div>

      <button
        @click="saveSettings"
        :disabled="saving"
        class="w-full bg-black hover:bg-gray-900 disabled:opacity-40 text-white font-medium py-3.5 rounded-full text-sm transition-colors"
      >
        {{ saving ? "저장 중..." : savedMsg ? "저장됨!" : "설정 저장" }}
      </button>

      <!-- Security -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 class="font-semibold text-black mb-1">보안</h2>
        <p class="text-gray-400 text-xs mb-4">
          매번 로그인하지 않도록 4자리 PIN으로 앱을 빠르게 잠금 해제할 수 있어요.
        </p>
        <button
          v-if="!pinSet"
          @click="openPinModal"
          class="w-full bg-gray-100 hover:bg-gray-200 text-black font-medium py-3 rounded-full text-sm transition-colors"
        >
          PIN 설정하기
        </button>
        <div v-else class="flex gap-2">
          <button
            @click="openPinModal"
            class="flex-1 bg-gray-100 hover:bg-gray-200 text-black font-medium py-3 rounded-full text-sm transition-colors"
          >
            PIN 변경
          </button>
          <button
            @click="disablePin"
            class="flex-1 bg-gray-100 hover:bg-red-50 text-red-400 hover:text-red-500 font-medium py-3 rounded-full text-sm transition-colors"
          >
            PIN 해제
          </button>
        </div>
      </div>

      <!-- Account -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 class="font-semibold text-black mb-1">계정</h2>
        <p class="text-gray-500 text-sm mb-1">{{ user?.email }}</p>
        <p v-if="daysRemaining !== null" class="text-xs mb-4" :class="daysRemaining <= 5 ? 'text-yellow-500' : 'text-gray-400'">
          로그인 세션 D-{{ daysRemaining }}
        </p>
        <button
          @click="signOut"
          class="w-full bg-gray-100 hover:bg-red-50 text-red-400 hover:text-red-500 font-medium py-3 rounded-full text-sm transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>

    <!-- PIN setup modal -->
    <Teleport to="body">
      <div v-if="showPinModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
        <div class="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-xl">
          <h2 class="text-lg font-bold text-black mb-1">{{ pinStep === "enter" ? "새 PIN 입력" : "PIN 확인" }}</h2>
          <p class="text-gray-400 text-xs mb-5">4자리 숫자를 입력해주세요</p>

          <div class="flex gap-3 justify-center mb-2">
            <div
              v-for="i in 4"
              :key="i"
              class="w-4 h-4 rounded-full border-2"
              :class="
                i <= (pinStep === 'enter' ? pinDraft.length : pinConfirmDraft.length)
                  ? 'bg-black border-black'
                  : 'border-gray-200'
              "
            />
          </div>
          <p class="h-5 text-red-400 text-xs mb-4">{{ pinError }}</p>

          <div class="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            <button
              v-for="n in [1,2,3,4,5,6,7,8,9]"
              :key="n"
              @click="pressPinDigit(String(n))"
              class="aspect-square rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold text-black transition-colors"
            >
              {{ n }}
            </button>
            <div />
            <button
              @click="pressPinDigit('0')"
              class="aspect-square rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold text-black transition-colors"
            >
              0
            </button>
            <button
              @click="backspacePinDigit"
              class="aspect-square rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-colors"
            >
              ⌫
            </button>
          </div>

          <button
            @click="showPinModal = false"
            class="mt-5 text-gray-400 hover:text-gray-600 text-sm"
          >
            취소
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
