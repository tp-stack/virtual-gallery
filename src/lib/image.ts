const ALLOWED_ARTWORK_IMAGE_HOSTS = new Set([
  "upload.wikimedia.org",
  "images.metmuseum.org",
  "framemark.vam.ac.uk",
  "www.artic.edu",
  "openaccess-cdn.clevelandart.org",
  "api.europeana.eu",
]);

export function isAllowedArtworkImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_ARTWORK_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function toArtworkImageProxyUrl(value: string | null | undefined): string {
  if (!value) return "";
  return isAllowedArtworkImageUrl(value)
    ? `/api/image?url=${encodeURIComponent(value)}`
    : value;
}

export function getArtworkImageCandidates(value: string | null | undefined): string[] {
  if (!value) return [];
  const proxied = toArtworkImageProxyUrl(value);
  return proxied === value ? [value] : [proxied, value];
}
