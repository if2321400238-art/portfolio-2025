export const social = [
  { url: "mailto:shahibshahib01@gmail.com", name: "mail" },
  { url: "https://github.com/if2321400238-art", name: "github" },
  { url: "https://www.linkedin.com/in/shahib-kholil-rahman-859b6b40a/", name: "linkedin" },
  { url: "https://x.com/shb_kholil", name: "x" },
  { url: "https://www.instagram.com/shb_kholil/", name: "instagram" },
] as const satisfies { url: string; name: "mail" | "github" | "instagram" | "linkedin" | "x" }[];
