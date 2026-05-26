export const social = [
  { url: "mailto:me@Shahib-hckh.com", name: "mail" },
  { url: "https://github.com/Shahibhckh", name: "github" },
  { url: "https://www.linkedin.com/in/Shahib-Kholil/", name: "linkedin" },
  { url: "https://x.com/ShahibHckh", name: "x" },
  //{ url: "https://www.instagram.com/Shahibhckh/", name: "instagram" },
] as const satisfies { url: string; name: "mail" | "github" | "instagram" | "linkedin" | "x" }[];
