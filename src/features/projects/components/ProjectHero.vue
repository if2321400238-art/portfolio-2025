<script setup lang="ts">
import { projectId } from "../../../composables/useRouteObserver";
import { computed, ref, watch } from "vue";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

import type { ItemContent } from "../../../content/types";

const { content } = defineProps<{
  content: ItemContent;
}>();

const animationKey = ref(0);
const sanitizedDescription = computed(() => sanitizeHtml(content.description));
const tagList = computed(() =>
  (content.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
);

watch(projectId, () => {
  animationKey.value++;
});
</script>

<template>
  <div class="project-hero grid">
    <div class="project-hero-top">
      <div class="project-hero-title-wrapper">
        <h1 class="project-hero-title" :key="animationKey">
          {{ content.title }}
        </h1>
      </div>
      <div v-if="tagList.length" class="project-hero-tags">
        <span v-for="tag in tagList" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
      <a
        v-if="content.demoUrl"
        :href="content.demoUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="project-hero-demo"
        data-cursor="arrow-external"
      >
        Lihat Demo →
      </a>
    </div>
    <p
      v-if="content.description"
      class="project-hero-description"
      v-html="sanitizedDescription"
    ></p>
    <img
      v-if="content.thumbnail"
      :src="content.thumbnail"
      :alt="content.title"
      class="project-hero-thumbnail"
    />
  </div>
</template>

<style scoped lang="scss">
.project-hero {
  padding: 0 var(--space-outer);
  padding-bottom: 48px;
  padding-top: calc(var(--height-header) + 24px);

  &-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  .tag {
    font-size: 0.85rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-background-300);
    border-radius: var(--radius-sm);
    color: var(--color-text-400);
  }

  &-title {
    font-size: var(--font-size-title-lg);
    color: var(--color-text-400);
    line-height: var(--line-height-title);
    transform: translateY(0%);
    animation: project-hero-title-visible 0.5s var(--ease-smooth);

    @include mixins.mq("md") {
      font-size: var(--font-size-title-xl);
    }

    @keyframes project-hero-title-visible {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    &-wrapper {
      overflow: hidden;
    }
  }

  &-demo {
    display: inline-block;
    margin-top: var(--space-sm);
    padding: 0.5rem 1.25rem;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-accent-text-400);
    background: var(--color-accent-400);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: opacity 0.15s ease;
    align-self: flex-start;

    @include mixins.hover {
      &:hover {
        opacity: 0.8;
      }
    }
  }

  &-description {
    color: var(--color-text-400);
    line-height: var(--line-height-copy);
    grid-column: 1 / 13;
    align-self: center;

    @include mixins.mq("md") {
      grid-row: 1;
      grid-column: 6 / 12;
    }

    @include mixins.mq("lg") {
      grid-row: 1;
      grid-column: 7 / 12;
    }

    @include mixins.mq("xl") {
      grid-row: 1;
      grid-column: 7 / 11;
    }
  }

  &-thumbnail {
    grid-column: 1 / 13;
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    border-radius: var(--radius-md);
    margin-top: var(--space-md);

    @include mixins.mq("md") {
      grid-column: 1 / 8;
    }
  }

  &-top {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    grid-row: 1;
    align-self: top;
    grid-column: 1 / 13;

    @include mixins.mq("md") {
      grid-column: 1 / 6;
    }

    @include mixins.mq("lg") {
      grid-column: 2 / 6;
    }
  }
}
</style>
