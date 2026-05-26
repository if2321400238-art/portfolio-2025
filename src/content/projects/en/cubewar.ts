import type { ItemContent } from "../../types";

export default {
  title: "CubeWar",
  tags: "three.js, node.js, websockets, redis",
  description: `CubeWar is a browser-based multiplayer game where players control cube avatars in fast-paced strategic battles.

I built the full stack myself, including the game engine, the client-side timeline system, and real-time networking with Redis-based matchmaking for smooth, high-concurrency gameplay.`,
  thumbnail: "/assets/thumbnails/cubewar.webp",
} satisfies ItemContent;
