// Defined only by the separate presentation build; the server app keeps its routes.
declare const __OSK_PARTNER_PREVIEW__: boolean;
declare const __OSK_LOGO_URL__: string;
export const partnerPreview = typeof __OSK_PARTNER_PREVIEW__ !== "undefined" && __OSK_PARTNER_PREVIEW__;
export const logoUrl = typeof __OSK_LOGO_URL__ !== "undefined" ? __OSK_LOGO_URL__ : "/osk-logo.svg";
export const homeUrl = partnerPreview ? "#/" : "/";
export function adminUrl(view?: string) {
  return `${partnerPreview ? "#/admin" : "/admin"}${view ? `?view=${encodeURIComponent(view)}` : ""}`;
}
export function adminView() {
  const query = partnerPreview ? window.location.hash.split("?")[1] || "" : window.location.search;
  return new URLSearchParams(query).get("view");
}
