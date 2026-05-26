import thumbnailCubeWar from "../../../assets/thumbnails/cubewar.webp";
import thumbnailQuibbo from "../../../assets/thumbnails/quibbo.webp";
//import thumbnailParticles from "../../../assets/thumbnails/particles.webp";
import thumbnailPokedex from "../../../assets/thumbnails/pokedex.webp";
import thumbnailSharkie from "../../../assets/thumbnails/sharkie.webp";
import thumbnailStreakon from "../../../assets/thumbnails/streakon.webp";

import type { ItemPreview } from "../../types";

export default [
  {
    title: "StreakOn",
    slug: "streakon",
    thumbnail: thumbnailStreakon,
    description: "Stay consistent with daily habits",
  },
  {
    title: "CubeWar",
    slug: "cubewar",
    thumbnail: thumbnailCubeWar,
    description: "Browser-based multiplayer strategy game",
  },
  {
    title: "Quibbo",
    slug: "quibbo",
    thumbnail: thumbnailQuibbo,
    description: "Multiplayer gaming platform",
  },
  {
    title: "Sharkie",
    slug: "sharkie",
    thumbnail: thumbnailSharkie,
    description: "2D underwater adventure game",
  },
  {
    title: "Pokédex",
    slug: "pokedex",
    thumbnail: thumbnailPokedex,
    description: "Open source learning project",
  },
] as const satisfies ItemPreview[];
