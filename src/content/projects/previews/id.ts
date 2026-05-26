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
    description: "Aplikasi pelacak kebiasaan sosial",
  },
  {
    title: "CubeWar",
    slug: "cubewar",
    thumbnail: thumbnailCubeWar,
    description: "Game strategi multipemain",
  },
  {
    title: "Quibbo",
    slug: "quibbo",
    thumbnail: thumbnailQuibbo,
    description: "Platform permainan multipemain",
  },
  {
    title: "Sharkie",
    slug: "sharkie",
    thumbnail: thumbnailSharkie,
    description: "Game petualangan 2D",
  },
  {
    title: "Pokédex",
    slug: "pokedex",
    thumbnail: thumbnailPokedex,
    description: "Proyek belajar open source",
  },
] as const satisfies ItemPreview[];