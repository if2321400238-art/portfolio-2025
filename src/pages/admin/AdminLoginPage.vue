<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "../../composables/useRouter";
import { useAdminAuth } from "../../composables/useAdminAuth";

const router = useRouter();
const { checkAuth, login, state } = useAdminAuth();

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

onMounted(async () => {
  const ok = await checkAuth();
  if (ok) {
    router.replace("/admin");
  }
});

async function handleSubmit() {
  errorMessage.value = "";
  isSubmitting.value = true;

  try {
    await login(username.value.trim(), password.value);
    router.replace("/admin");
  } catch (error) {
    errorMessage.value = typeof error === "string" ? error : "Terjadi kesalahan server.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="admin-page">
    <section class="admin-hero">
      <div class="admin-hero-copy">
        <p class="admin-eyebrow">Admin login</p>
        <h1>Masuk ke panel admin</h1>
        <p>Login akan membuat session aman via HttpOnly cookie.</p>
      </div>
    </section>

    <section class="admin-grid">
      <div class="card admin-login-card">
        <div class="admin-section-header">
          <div>
            <p class="admin-eyebrow">Autentikasi</p>
            <h2>Masuk</h2>
          </div>
        </div>

        <form class="admin-form-grid" @submit.prevent="handleSubmit">
          <label class="admin-field admin-field-full">
            <span>Username</span>
            <input v-model="username" class="admin-input" type="text" autocomplete="username" placeholder="admin" />
          </label>

          <label class="admin-field admin-field-full">
            <span>Password</span>
            <input v-model="password" class="admin-input" type="password" autocomplete="current-password" placeholder="••••••••" />
          </label>

          <p v-if="errorMessage" class="admin-error admin-field-full">{{ errorMessage }}</p>
          <p v-else-if="state === 'checking'" class="admin-muted admin-field-full">Memeriksa sesi...</p>

          <button class="admin-button admin-field-full" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? "Memproses..." : "Login" }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.admin-page {
  min-height: 100vh;
  padding: calc(var(--height-header) + 32px) var(--space-outer) 48px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 30%),
    linear-gradient(180deg, #101523 0%, #171d2d 100%);
  color: var(--color-white-400);
}

.admin-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.admin-hero-copy {
  max-width: 760px;

  h1 {
    font-size: var(--font-size-title-xl);
    line-height: 1;
    margin-bottom: var(--space-sm);
  }
}

.admin-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: var(--space-xs);
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xxl);
  padding: var(--space-lg);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
}

.admin-section-header {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.admin-label,
.admin-field span {
  display: block;
  margin-bottom: var(--space-xs);
  font-weight: 700;
}

.admin-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  &-full {
    grid-column: 1 / -1;
  }
}

.admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.admin-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-lg);
  background: rgba(8, 12, 21, 0.7);
  color: var(--color-white-400);
  padding: 14px 16px;
  outline: none;

  &:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.admin-button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: var(--color-orange-400);
  color: var(--color-white-400);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.admin-error {
  color: #ffb2b2;
}

.admin-muted {
  color: rgba(255, 255, 255, 0.7);
}

@include mixins.mq("lg", max) {
  .admin-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
