<script setup lang="ts">
import { computed } from "vue";

const component = defineModel<any>({ default: undefined });

type NestedComponent =
  | { type: "media"; props: { type: "image" | "video"; src: string; alt?: string; caption?: string } }
  | { type: "text"; props: { title?: string; text?: string } }
  | { type: "list"; props: { title?: string; items: string[]; size?: "sm" | "md" | "lg" } };

function createNestedComponent(type: NestedComponent["type"]): NestedComponent {
  switch (type) {
    case "media":
      return {
        type: "media",
        props: { type: "image", src: "", alt: "", caption: "" },
      };
    case "text":
      return {
        type: "text",
        props: { title: "", text: "" },
      };
    case "list":
      return {
        type: "list",
        props: { title: "", items: [""], size: "md" },
      };
    default:
      throw new Error(`Unsupported nested component type: ${type}`);
  }
}

const nestedType = computed({
  get() {
    return component.value?.type ?? "none";
  },
  set(value: "none" | NestedComponent["type"]) {
    if (value === "none") {
      component.value = undefined;
      return;
    }

    component.value = createNestedComponent(value);
  },
});

const mediaComponent = computed<any | null>(() => (component.value?.type === "media" ? component.value : null));
const textComponent = computed<any | null>(() => (component.value?.type === "text" ? component.value : null));
const listComponent = computed<any | null>(() => (component.value?.type === "list" ? component.value : null));

function parseListItems(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyListItems(items: string[]) {
  return items.join("\n");
}

function ensureListItem() {
  if (listComponent.value && !listComponent.value.props.items.length) {
    listComponent.value.props.items = [""];
  }
}

function updateListItems(value: string) {
  if (!listComponent.value) return;
  listComponent.value.props.items = parseListItems(value);
  ensureListItem();
}
</script>

<template>
  <div class="nested-component">
    <div class="admin-section-header nested-component-header">
      <div>
        <p class="admin-eyebrow">Nested content</p>
        <h4>Component inside imageText</h4>
      </div>
      <button class="admin-button admin-button-ghost" type="button" @click="nestedType = 'none'">Remove nested</button>
    </div>

    <label class="admin-field">
      <span>Nested type</span>
      <select v-model="nestedType" class="admin-input">
        <option value="none">none</option>
        <option value="media">media</option>
        <option value="text">text</option>
        <option value="list">list</option>
      </select>
    </label>

    <template v-if="mediaComponent">
      <label class="admin-field">
        <span>Media type</span>
        <select v-model="mediaComponent.props.type" class="admin-input">
          <option value="image">image</option>
          <option value="video">video</option>
        </select>
      </label>
      <label class="admin-field">
        <span>Source</span>
        <input v-model="mediaComponent.props.src" class="admin-input" type="text" placeholder="/assets/..." />
      </label>
      <label class="admin-field">
        <span>Alt</span>
        <input v-model="mediaComponent.props.alt" class="admin-input" type="text" placeholder="Alt text" />
      </label>
      <label class="admin-field admin-field-full">
        <span>Caption</span>
        <input v-model="mediaComponent.props.caption" class="admin-input" type="text" placeholder="Caption" />
      </label>
    </template>

    <template v-else-if="textComponent">
      <label class="admin-field">
        <span>Title</span>
        <input v-model="textComponent.props.title" class="admin-input" type="text" placeholder="Optional title" />
      </label>
      <label class="admin-field admin-field-full">
        <span>Text</span>
        <textarea v-model="textComponent.props.text" class="admin-input admin-textarea" rows="5"></textarea>
      </label>
    </template>

    <template v-else-if="listComponent">
      <label class="admin-field">
        <span>Title</span>
        <input v-model="listComponent.props.title" class="admin-input" type="text" placeholder="Optional title" />
      </label>
      <label class="admin-field">
        <span>Size</span>
        <select v-model="listComponent.props.size" class="admin-input">
          <option value="sm">sm</option>
          <option value="md">md</option>
          <option value="lg">lg</option>
        </select>
      </label>
      <label class="admin-field admin-field-full">
        <span>Items</span>
        <textarea
          :value="stringifyListItems(listComponent.props.items)"
          class="admin-input admin-textarea"
          rows="5"
          @input="(event) => updateListItems((event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>
    </template>
  </div>
</template>

<style scoped lang="scss">
.nested-component {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  grid-column: 1 / -1;
  margin-top: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
}

.nested-component-header {
  margin-bottom: 0;
}
</style>
