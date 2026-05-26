import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { projectBodySchema, storedProjectSchema, type ProjectBodyInput } from "./schemas";

export interface ProjectRecord extends ProjectBodyInput {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreState {
  version: 1;
  initialized: boolean;
  projects: ProjectRecord[];
}

const projectDataFile = resolve(process.cwd(), "data/projects.json");
const uploadDir = resolve(process.cwd(), "data/uploads");
const assetRoot = resolve(process.cwd(), "src/assets");

let writeQueue = Promise.resolve();

function queueWrite<T>(task: () => Promise<T>) {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled";
}

function seedProjects(): ProjectRecord[] {
  const now = new Date().toISOString();

  return [
    {
      id: "streakon",
      slug: "streakon",
      title: "StreakOn",
      tags: "next.js, node.js, postgresql, redis",
      description:
        "StreakOn membantu kelompok kecil mempertahankan kebiasaan harian lewat streak bersama dan check-in sederhana. Aplikasi ini dirancang dengan fokus pada hambatan interaksi yang rendah, penggunaan mobile, dan fitur sosial ringan.",
      thumbnail: "/assets/thumbnails/streakon.webp",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cubewar",
      slug: "cubewar",
      title: "CubeWar",
      tags: "three.js, node.js, websockets, redis",
      description:
        "CubeWar adalah game multipemain berbasis browser di mana pemain saling bertarung dalam pertempuran yang cepat dan strategis. Saya membangun seluruh stack sendiri, termasuk mesin game, sistem timeline klien, dan jaringan real-time dengan matchmaking berbasis Redis.",
      thumbnail: "/assets/thumbnails/cubewar.webp",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "quibbo",
      slug: "quibbo",
      title: "Quibbo",
      tags: "three.js, node.js, kubernetes, redis, postgresql",
      description:
        "Quibbo adalah platform untuk game multipemain cepat berbasis giliran. Platform ini menggabungkan matchmaking, avatar 3D yang dapat disesuaikan, dan integrasi akun dengan sistem peringkat berbasis ELO.",
      thumbnail: "/assets/thumbnails/quibbo.webp",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sharkie",
      slug: "sharkie",
      title: "Sharkie",
      tags: "javascript, html, css",
      description:
        "Sharkie adalah game petualangan bawah laut 2D yang dikembangkan dengan Vanilla JavaScript dan HTML5 Canvas. Dibangun dengan prinsip OOP, dilengkapi animasi halus, sistem pertarungan, dan latar parallax berlapis.",
      thumbnail: "/assets/thumbnails/sharkie.webp",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pokedex",
      slug: "pokedex",
      title: "Pokédex",
      tags: "javascript, html, css",
      description:
        "Salah satu proyek web pertama untuk melatih konsep inti pengembangan web. Pokédex ini open source agar pengembang lain bisa belajar dengan cara yang sama. Berinteraksi dengan API publik untuk pengalaman asynchronous data fetching.",
      thumbnail: "/assets/thumbnails/pokedex.webp",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function ensureDataDir() {
  await mkdir(dirname(projectDataFile), { recursive: true });
  await mkdir(uploadDir, { recursive: true });
}

async function readState(): Promise<StoreState> {
  await ensureDataDir();

  try {
    const raw = await readFile(projectDataFile, "utf8");
    const parsed = JSON.parse(raw) as StoreState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.projects) || parsed.initialized !== true) {
      throw new Error("Invalid store file");
    }
    return {
      version: 1,
      initialized: true,
      projects: parsed.projects.map((project) => storedProjectSchema.parse(project)),
    };
  } catch (error) {
    const seed = { version: 1 as const, initialized: true, projects: seedProjects() };
    await writeState(seed);
    return seed;
  }
}

async function writeState(state: StoreState) {
  await ensureDataDir();
  const tempFile = `${projectDataFile}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tempFile, projectDataFile);
}

export async function listProjects() {
  const state = await readState();
  return state.projects;
}

export async function getProject(slug: string) {
  const state = await readState();
  return state.projects.find((project) => project.slug === slug) ?? null;
}

export async function createProject(input: ProjectBodyInput) {
  const state = await readState();
  const slug = slugify(input.title);
  const baseSlug = slug;
  let counter = 1;

  // Handle slug collision
  let uniqueSlug = slug;
  while (state.projects.some((p) => p.slug === uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const now = new Date().toISOString();
  const project: ProjectRecord = {
    ...input,
    id: crypto.randomUUID(),
    slug: uniqueSlug,
    createdAt: now,
    updatedAt: now,
  };

  state.projects = [...state.projects, project];
  await queueWrite(() => writeState(state));
  return project;
}

export async function updateProject(currentSlug: string, input: ProjectBodyInput) {
  const state = await readState();
  const index = state.projects.findIndex((project) => project.slug === currentSlug);

  if (index === -1) {
    return null;
  }

  const existing = state.projects[index];
  const next: ProjectRecord = {
    ...existing,
    ...input,
    id: existing.id,
    slug: existing.slug,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  state.projects[index] = next;
  await queueWrite(() => writeState(state));
  return next;
}

export async function patchProject(currentSlug: string, input: Partial<ProjectBodyInput>) {
  const existing = await getProject(currentSlug);
  if (!existing) return null;
  return updateProject(currentSlug, {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    tags: input.tags ?? existing.tags,
    thumbnail: input.thumbnail ?? existing.thumbnail,
    demoUrl: input.demoUrl ?? existing.demoUrl,
  });
}

export async function deleteProject(slug: string) {
  const state = await readState();
  const nextProjects = state.projects.filter((project) => project.slug !== slug);
  if (nextProjects.length === state.projects.length) return false;
  state.projects = nextProjects;
  await queueWrite(() => writeState(state));
  return true;
}

export async function saveUpload(filename: string) {
  await ensureDataDir();
  return `/uploads/${filename}`;
}

export async function listUploads() {
  await ensureDataDir();
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(uploadDir, { withFileTypes: false });
  return files.map((name) => ({ filename: name, url: `/uploads/${name}` }));
}

export async function deleteUpload(filename: string) {
  if (filename.includes("/") || filename.includes("\\")) {
    throw new Error("INVALID_FILENAME");
  }

  const { unlink, stat } = await import("node:fs/promises");
  const target = resolve(uploadDir, filename);
  if (!target.startsWith(uploadDir)) {
    throw new Error("INVALID_FILENAME");
  }

  try {
    await stat(target);
  } catch (err) {
    throw new Error("NOT_FOUND");
  }

  await unlink(target);
  return true;
}

export function assetRootPath() {
  return assetRoot;
}
