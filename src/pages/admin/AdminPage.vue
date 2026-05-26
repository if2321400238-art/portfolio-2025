<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "../../composables/useRouter";
import { useAdminAuth } from "../../composables/useAdminAuth";
import { tagLabels } from "../../components/tagVariants";
import {
  createProject,
  deleteProject,
  apiUrl,
  listUploads,
  deleteUpload,
  listProjects,
  updateProject,
} from "../../composables/useProjectApi";
import type { BackendProjectInput, BackendProjectRecord } from "../../types/backend";
import type { ProjectComponent } from "../../features/projects/types";
import AdminNestedComponentEditor from "../../features/admin/components/AdminNestedComponentEditor.vue";

const router = useRouter();
const { state, checkAuth, logout } = useAdminAuth();
const allowedTags = Object.keys(tagLabels) as (keyof typeof tagLabels)[];

const projects = ref<BackendProjectRecord[]>([]);
const selectedSlug = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const uploadLoading = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const uploadedUrl = ref("");
const uploads = ref<Array<{ filename: string; url: string }>>([]);
const tagsText = ref("");
const tagsEditing = ref("");
const tagsDirty = ref(false);
const componentDrafts = ref<ProjectComponent[]>([]);
const isCreatingNew = ref(false);

const form = ref(createEmptyForm());

const sortedProjects = computed(() => [...projects.value].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).reverse());
const isAuthenticated = computed(() => state.value === "authenticated");

function createEmptyForm(): BackendProjectInput {
  return {
    slug: "",
    title: "",
    theme: "light",
    tags: [],
    description: "",
    videoBorder: false,
    live: "",
    source: "",
    thumbnail: "",
    components: [],
  };
}

function cloneProject(project: BackendProjectRecord): BackendProjectInput {
  return {
    slug: project.slug,
    title: project.title,
    theme: project.theme,
    tags: [...project.tags],
    description: project.description ?? "",
    videoBorder: project.videoBorder ?? false,
    live: project.live ?? "",
    source: project.source ?? "",
    thumbnail: project.thumbnail ?? "",
    components: project.components ? JSON.parse(JSON.stringify(project.components)) : [],
  };
}

function cloneComponents(components: ProjectComponent[] = []) {
  return JSON.parse(JSON.stringify(components)) as ProjectComponent[];
}

function setProjectForm(project: BackendProjectRecord | null) {
  if (!project) {
    form.value = createEmptyForm();
    tagsText.value = "";
    selectedSlug.value = null;
    componentDrafts.value = [];
    isCreatingNew.value = false;
    return;
  }

  form.value = cloneProject(project);
  // Set tagsText hanya saat pertama kali select, jangan overwrite saat edit
  if (selectedSlug.value !== project.slug && !tagsDirty.value) {
    tagsText.value = project.tags.join(", ");
    tagsEditing.value = tagsText.value;
  }
  componentDrafts.value = cloneComponents(project.components ?? []);
  selectedSlug.value = project.slug;
  isCreatingNew.value = false;
}

async function refreshProjects() {
  loading.value = true;
  errorMessage.value = "";

  try {
    projects.value = await listProjects();

    if (selectedSlug.value) {
      const selected = projects.value.find((project) => project.slug === selectedSlug.value);
      if (selected) {
        form.value = cloneProject(selected);
        componentDrafts.value = cloneComponents(selected.components ?? []);
      }
    }

    if (!selectedSlug.value && projects.value[0] && !isCreatingNew.value) {
      setProjectForm(projects.value[0]);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to load projects";
  } finally {
    loading.value = false;
  }
}

function setMessage(message: string) {
  statusMessage.value = message;
  window.setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = "";
    }
  }, 3500);
}

function onTagsFocus() {
  tagsEditing.value = tagsText.value;
  tagsDirty.value = true;
}

function onTagsBlur() {
  tagsText.value = tagsEditing.value.trim();
  tagsDirty.value = false;
}

// DEBUG: trace changes to help diagnose tags reset
watch(tagsText, (newVal, oldVal) => {
  try {
    // eslint-disable-next-line no-console
    console.log('[admin-debug] tagsText changed', { newVal, oldVal, selectedSlug: selectedSlug.value });
  } catch {}
});

watch(selectedSlug, (newVal, oldVal) => {
  try {
    // eslint-disable-next-line no-console
    console.log('[admin-debug] selectedSlug changed', { newVal, oldVal });
  } catch {}
});

watch(() => projects.value.length, (newVal, oldVal) => {
  try {
    // eslint-disable-next-line no-console
    console.log('[admin-debug] projects.length', { newVal, oldVal });
  } catch {}
});

function parseTags(rawTags: string) {
  const tags = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) as (keyof typeof tagLabels)[];

  return tags.filter((tag): tag is keyof typeof tagLabels => allowedTags.includes(tag));
}

function getFormPayload(): BackendProjectInput {
  const source = tagsDirty.value ? tagsEditing.value : tagsText.value;
  const parsedTags = parseTags(source);

  return {
    slug: form.value.slug.trim(),
    title: form.value.title.trim(),
    theme: form.value.theme,
    tags: parsedTags,
    description: form.value.description?.trim() || "",
    videoBorder: !!form.value.videoBorder,
    live: form.value.live?.trim() || "",
    source: form.value.source?.trim() || "",
    thumbnail: form.value.thumbnail?.trim() || "",
    components: cloneComponents(componentDrafts.value),
  };
}

async function saveCurrentProject() {
  if (!isAuthenticated.value) {
    errorMessage.value = "Login diperlukan untuk menyimpan perubahan.";
    return;
  }

  const payload = getFormPayload();
  if (!payload.slug || !payload.title) {
    errorMessage.value = "Slug dan title wajib diisi.";
    return;
  }
  if (!payload.tags || !payload.tags.length) {
    errorMessage.value = `Tag tidak valid. Gunakan tag dari daftar: ${allowedTags.join(', ')}`;
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    const currentSlug = selectedSlug.value;
    const nextProject = currentSlug ? await updateProject(currentSlug, payload) : await createProject(payload);
    await refreshProjects();
    selectedSlug.value = nextProject.slug;
    form.value = cloneProject(nextProject);
    tagsText.value = nextProject.tags.join(", ");
      tagsEditing.value = tagsText.value;
      tagsDirty.value = false;
    componentDrafts.value = cloneComponents(nextProject.components ?? []);
    setMessage(`Saved ${nextProject.title}`);
    isCreatingNew.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to save project";
  } finally {
    saving.value = false;
  }
}

async function removeCurrentProject() {
  if (!selectedSlug.value || !isAuthenticated.value) return;
  if (!window.confirm(`Delete ${selectedSlug.value}? This cannot be undone.`)) return;

  saving.value = true;
  errorMessage.value = "";

  try {
    await deleteProject(selectedSlug.value);
    selectedSlug.value = null;
    form.value = createEmptyForm();
    tagsText.value = "";
    componentDrafts.value = [];
    await refreshProjects();
    setMessage("Project deleted");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to delete project";
  } finally {
    saving.value = false;
  }
}

async function uploadAsset(file: File | null) {
  if (!file || !isAuthenticated.value) {
    errorMessage.value = "Login diperlukan untuk upload file.";
    return;
  }

  uploadLoading.value = true;
  errorMessage.value = "";

  try {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch(apiUrl("/api/uploads"), {
      method: "POST",
      credentials: "include",
      body,
    });

    if (!response.ok) {
      throw new Error((await response.json())?.error ?? `Upload failed (${response.status})`);
    }

    const data = (await response.json()) as { url?: string };
    uploadedUrl.value = data.url ?? "";
    setMessage("Asset uploaded");
    await loadUploads();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to upload asset";
  } finally {
    uploadLoading.value = false;
  }
}

async function loadUploads() {
  if (!isAuthenticated.value) return;
  try {
    uploads.value = await listUploads();
  } catch {
    uploads.value = [];
  }
}

async function removeUpload(filename: string) {
  if (!isAuthenticated.value) {
    errorMessage.value = "Login diperlukan untuk menghapus file.";
    return;
  }

  if (!window.confirm(`Hapus file ${filename}? Ini akan dihapus dari server.`)) return;

  try {
    await deleteUpload(filename);
    setMessage("File dihapus");
    await loadUploads();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "Failed to delete file";
  }
}

async function handleLogout() {
  await logout();
  router.replace("/admin/login");
}

function handleNewProject() {
  form.value = createEmptyForm();
  tagsText.value = "";
  componentDrafts.value = [];
  selectedSlug.value = null;
  isCreatingNew.value = true;
}

function addComponent(type: ProjectComponent["type"]) {
  switch (type) {
    case "media":
      componentDrafts.value.push({
        type: "media",
        props: { type: "image", src: "", alt: "", caption: "" },
      });
      break;
    case "text":
      componentDrafts.value.push({
        type: "text",
        props: { title: "", text: "" },
      });
      break;
    case "list":
      componentDrafts.value.push({
        type: "list",
        props: { title: "", items: [""], size: "md" },
      });
      break;
    case "imageText":
      componentDrafts.value.push({
        type: "imageText",
        props: {
          imagePosition: "left",
          src: "",
          alt: "",
          border: false,
          component: undefined,
        },
      });
      break;
  }
}

function removeComponent(index: number) {
  componentDrafts.value.splice(index, 1);
}

function moveComponent(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= componentDrafts.value.length) return;
  const list = componentDrafts.value;
  const current = list[index];
  const next = list[target];
  if (!current || !next) return;
  [list[index], list[target]] = [next, current];
}

function duplicateComponent(index: number) {
  const current = componentDrafts.value[index];
  if (!current) return;
  const clone = cloneComponents([current])[0];
  if (!clone) return;
  componentDrafts.value.splice(index + 1, 0, clone);
}

function ensureListItem(component: Extract<ProjectComponent, { type: "list" }>) {
  if (!component.props.items.length) {
    component.props.items = [""];
  }
}

function parseListItems(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyListItems(items: string[]) {
  return items.join("\n");
}

onMounted(async () => {
  const ok = await checkAuth();
  if (!ok) {
    router.replace("/admin/login");
    return;
  }

  await refreshProjects();
  await loadUploads();
});
</script>

<template>
  <main class="admin-page">
    <section class="admin-hero">
      <div class="admin-hero-copy">
        <p class="admin-eyebrow">Backend admin</p>
        <h1>Kelola project portfolio dari sini</h1>
        <p>Session admin tersimpan aman via HttpOnly cookie.</p>
      </div>
      <div class="admin-hero-actions">
        <button class="admin-button admin-button-ghost" type="button" @click="router.push('/')">Kembali ke portfolio</button>
        <button class="admin-button admin-button-ghost" type="button" @click="refreshProjects">Refresh</button>
        <button class="admin-button admin-button-ghost" type="button" @click="handleLogout">Logout</button>
      </div>
    </section>

    <section class="admin-grid">
      <aside class="admin-sidebar card">
        <div class="card-section">
          <div class="admin-section-header">
            <h2>Project</h2>
            <button class="admin-button admin-button-ghost" type="button" @click="handleNewProject">Baru</button>
          </div>
          <p v-if="loading" class="admin-muted">Memuat project...</p>
          <p v-if="errorMessage" class="admin-error">{{ errorMessage }}</p>
          <div class="admin-list">
            <button
              v-for="project in sortedProjects"
              :key="project.id"
              class="admin-list-item"
              :class="{ 'admin-list-item-active': selectedSlug === project.slug }"
              type="button"
              @click="setProjectForm(project)"
            >
              <strong>{{ project.title }}</strong>
              <span>{{ project.slug }}</span>
            </button>
          </div>
        </div>

        <div class="card-section">
          <label class="admin-label" for="upload-file">Upload asset</label>
          <input id="upload-file" class="admin-input" type="file" accept="image/*,video/*" @change="(event) => uploadAsset((event.target as HTMLInputElement).files?.[0] ?? null)" />
          <p v-if="uploadLoading" class="admin-muted">Mengunggah...</p>
          <p v-if="uploadedUrl" class="admin-success">{{ uploadedUrl }}</p>
          <div v-if="uploads.length" class="admin-uploads">
            <h3 class="admin-eyebrow">Uploaded files</h3>
            <ul>
              <li v-for="file in uploads" :key="file.filename">
                <a :href="file.url" target="_blank" rel="noreferrer noopener">{{ file.filename }}</a>
                <button class="admin-button admin-button-ghost" type="button" @click="removeUpload(file.filename)">Hapus</button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <section class="admin-form card">
        <div class="admin-section-header">
          <div>
            <p class="admin-eyebrow">Editor project</p>
            <h2>{{ selectedSlug ? `Edit ${selectedSlug}` : 'Project baru' }}</h2>
          </div>
          <div class="admin-inline-actions">
            <button class="admin-button admin-button-danger" type="button" :disabled="!selectedSlug || saving" @click="removeCurrentProject">Hapus</button>
            <button class="admin-button" type="button" :disabled="saving" @click="saveCurrentProject">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </div>

        <div class="admin-form-grid">
          <label class="admin-field">
            <span>Slug</span>
            <input v-model="form.slug" class="admin-input" type="text" placeholder="my-project" />
          </label>

          <label class="admin-field">
            <span>Title</span>
            <input v-model="form.title" class="admin-input" type="text" placeholder="Project title" />
          </label>

          <label class="admin-field">
            <span>Theme</span>
            <select v-model="form.theme" class="admin-input">
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>

          <label class="admin-field">
            <span>Tags</span>
            <input v-model="tagsEditing" @focus="onTagsFocus" @blur="onTagsBlur" class="admin-input" type="text" placeholder="javascript, html, css" />
          </label>

          <label class="admin-field admin-field-full">
            <span>Description</span>
            <textarea v-model="form.description" class="admin-input admin-textarea" rows="5" placeholder="Description HTML is allowed"></textarea>
          </label>

          <label class="admin-field">
            <span>Live URL</span>
            <input v-model="form.live" class="admin-input" type="url" placeholder="https://..." />
          </label>

          <label class="admin-field">
            <span>Source URL</span>
            <input v-model="form.source" class="admin-input" type="url" placeholder="https://github.com/..." />
          </label>

          <label class="admin-field admin-field-full">
            <span>Thumbnail</span>
            <input v-model="form.thumbnail" class="admin-input" type="text" placeholder="/assets/thumbnails/project.webp" />
          </label>

          <label class="admin-checkbox admin-field-full">
            <input v-model="form.videoBorder" type="checkbox" />
            <span>Video border</span>
          </label>

          <label class="admin-field admin-field-full">
            <span>Components</span>
            <div class="component-toolbar">
              <button class="admin-button admin-button-ghost" type="button" @click="addComponent('media')">+ Media</button>
              <button class="admin-button admin-button-ghost" type="button" @click="addComponent('text')">+ Text</button>
              <button class="admin-button admin-button-ghost" type="button" @click="addComponent('list')">+ List</button>
              <button class="admin-button admin-button-ghost" type="button" @click="addComponent('imageText')">+ Image + Text</button>
            </div>
            <div class="component-list">
              <article v-for="(component, index) in componentDrafts" :key="`${component.type}-${index}`" class="component-card">
                <div class="admin-section-header component-card-header">
                  <div>
                    <p class="admin-eyebrow">{{ index + 1 }}</p>
                    <h3>{{ component.type }}</h3>
                  </div>
                  <div class="admin-inline-actions">
                    <button class="admin-button admin-button-ghost" type="button" :disabled="index === 0" @click="moveComponent(index, -1)">↑</button>
                    <button class="admin-button admin-button-ghost" type="button" :disabled="index === componentDrafts.length - 1" @click="moveComponent(index, 1)">↓</button>
                    <button class="admin-button admin-button-ghost" type="button" @click="duplicateComponent(index)">Duplicate</button>
                    <button class="admin-button admin-button-danger" type="button" @click="removeComponent(index)">Remove</button>
                  </div>
                </div>

                <div class="component-fields">
                  <label class="admin-field">
                    <span>Type</span>
                    <select v-model="component.type" class="admin-input">
                      <option value="media">media</option>
                      <option value="text">text</option>
                      <option value="list">list</option>
                      <option value="imageText">imageText</option>
                    </select>
                  </label>

                  <template v-if="component.type === 'media'">
                    <label class="admin-field">
                      <span>Media type</span>
                      <select v-model="component.props.type" class="admin-input">
                        <option value="image">image</option>
                        <option value="video">video</option>
                      </select>
                    </label>
                    <label class="admin-field">
                      <span>Source</span>
                      <input v-model="component.props.src" class="admin-input" type="text" placeholder="/assets/..." />
                    </label>
                    <label class="admin-field">
                      <span>Alt</span>
                      <input v-model="component.props.alt" class="admin-input" type="text" placeholder="Alt text" />
                    </label>
                    <label class="admin-field admin-field-full">
                      <span>Caption</span>
                      <input v-model="component.props.caption" class="admin-input" type="text" placeholder="Caption" />
                    </label>
                  </template>

                  <template v-else-if="component.type === 'text'">
                    <label class="admin-field">
                      <span>Title</span>
                      <input v-model="component.props.title" class="admin-input" type="text" placeholder="Optional title" />
                    </label>
                    <label class="admin-field admin-field-full">
                      <span>Text</span>
                      <textarea v-model="component.props.text" class="admin-input admin-textarea" rows="5"></textarea>
                    </label>
                  </template>

                  <template v-else-if="component.type === 'list'">
                    <label class="admin-field">
                      <span>Title</span>
                      <input v-model="component.props.title" class="admin-input" type="text" placeholder="Optional title" />
                    </label>
                    <label class="admin-field">
                      <span>Size</span>
                      <select v-model="component.props.size" class="admin-input">
                        <option value="sm">sm</option>
                        <option value="md">md</option>
                        <option value="lg">lg</option>
                      </select>
                    </label>
                    <label class="admin-field admin-field-full">
                      <span>Items</span>
                      <textarea
                        :value="stringifyListItems(component.props.items)"
                        class="admin-input admin-textarea"
                        rows="5"
                        @input="(event) => { component.props.items = parseListItems((event.target as HTMLTextAreaElement).value); ensureListItem(component as Extract<ProjectComponent, { type: 'list' }>); }"
                      ></textarea>
                    </label>
                  </template>

                  <template v-else-if="component.type === 'imageText'">
                    <label class="admin-field">
                      <span>Image position</span>
                      <select v-model="component.props.imagePosition" class="admin-input">
                        <option value="left">left</option>
                        <option value="right">right</option>
                      </select>
                    </label>
                    <label class="admin-field">
                      <span>Image source</span>
                      <input v-model="component.props.src" class="admin-input" type="text" placeholder="/assets/..." />
                    </label>
                    <label class="admin-field">
                      <span>Alt</span>
                      <input v-model="component.props.alt" class="admin-input" type="text" placeholder="Alt text" />
                    </label>
                    <label class="admin-checkbox">
                      <input v-model="component.props.border" type="checkbox" />
                      <span>Border</span>
                    </label>

                    <AdminNestedComponentEditor v-model="component.props.component" />
                  </template>
                </div>
              </article>
            </div>
          </label>
        </div>

        <div class="admin-tags-help">
          <p class="admin-muted">Tags valid: {{ allowedTags.join(", ") }}</p>
          <p class="admin-muted">Format tags dengan koma. Komponen sekarang bisa diedit per item tanpa nulis JSON manual.</p>
        </div>
      </section>
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

  @include mixins.mq("lg") {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
  }
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

.admin-hero-actions,
.admin-inline-actions,
.admin-section-header {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);

  @include mixins.mq("xl") {
    grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
  }
}

.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xxl);
  padding: var(--space-lg);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
}

.card-section + .card-section {
  margin-top: var(--space-lg);
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
  margin-top: var(--space-lg);
}

.admin-input,
.admin-textarea {
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

.admin-textarea {
  resize: vertical;
  min-height: 120px;

  &-large {
    min-height: 260px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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

  &-ghost {
    background: rgba(255, 255, 255, 0.08);
  }

  &-danger {
    background: #b83a3a;
  }
}

.admin-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.admin-list-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;

  &-active {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }

  span {
    color: rgba(255, 255, 255, 0.68);
    font-size: var(--font-size-sm);
  }
}

.admin-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.admin-muted {
  color: rgba(255, 255, 255, 0.7);
}

.admin-error {
  color: #ffb2b2;
}

.admin-success {
  color: #a4f4be;
}

.admin-tags-help {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--space-md);
}

.component-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.component-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  background: rgba(0, 0, 0, 0.14);
  padding: var(--space-md);
}

.component-card-header {
  margin-bottom: var(--space-md);
}

.component-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

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

@include mixins.mq("lg", max) {
  .admin-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
