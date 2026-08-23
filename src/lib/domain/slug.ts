// Génère un slug lisible à partir du titre d'un shooting, avec un suffixe
// court pour éviter les collisions (deux "Portrait Julie" à des dates
// différentes, par exemple). L'unicité stricte est vérifiée en base par la
// contrainte @unique sur Gallery.slug.
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques (accents) après décomposition NFD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(length = 5): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // sans caractères ambigus
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export function generateGallerySlug(title: string): string {
  const base = slugify(title) || "shooting";
  return `${base}-${randomSuffix()}`;
}
