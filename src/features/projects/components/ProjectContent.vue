<script setup lang="ts">
import Layout from "../../../components/Layout.vue";
import ProjectHero from "./ProjectHero.vue";
import Link from "../../../components/Link.vue";
import NextProject from "./NextProject.vue";
import { locale } from "../../../i18n/store";
import { previews } from "../../../content/projects/previews";
import { ref, computed, watch, onMounted } from "vue";
import { listItems, toPreview } from "../../../composables/useProjectApi";

import type { ItemContent, ItemPreview } from "../../../content/types";

const { content, projectId } = defineProps<{
  content: ItemContent;
  projectId: string;
}>();

const loadedPreviews = ref<ItemPreview[] | null>(null);

const loadPreviews = async () => {
  try {
    const items = await listItems();
    loadedPreviews.value = items.map(toPreview);
  } catch {
    const module = await previews[locale.value as keyof typeof previews]();
    loadedPreviews.value = module.default;
  }
};

const nextProject = computed(() => {
  const previews = loadedPreviews.value;
  if (!previews) return null;

  const currentIndex = previews.findIndex((p) => p.slug === projectId);
  if (currentIndex === -1) return null;

  const nextIndex = (currentIndex + 1) % previews.length;
  return previews[nextIndex];
});

watch(locale, loadPreviews);

onMounted(loadPreviews);
</script>

<template>
  <Layout class="project-content">
    <ProjectHero :content="content" :projectId="projectId" />
    <div class="grid project-content-next-project-grid">
      <Link
        v-if="nextProject"
        :to="`/project/${nextProject.slug}`"
        replace
        class="project-content-next-project"
        data-cursor="arrow"
        data-sound="click"
      >
        <NextProject :project="nextProject" />
      </Link>
    </div>
  </Layout>
</template>

<style scoped lang="scss">
.project-content {
  color: var(--color-text-400);

  &-next-project {
    grid-column: 1 / 13;

    @include mixins.mq("md") {
      grid-column: 3 / 11;
    }

    @include mixins.mq("lg") {
      grid-column: 4 / 10;
    }

    @include mixins.mq("xl") {
      grid-column: 5 / 9;
    }

    &-grid {
      padding: 0 var(--space-outer);
      padding-top: var(--space-xl);
      padding-bottom: var(--space-xxxl);
    }
  }
}
</style>
