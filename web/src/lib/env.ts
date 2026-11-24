// Web sitesinde adresler göreli ("/api/..."). Mobil uygulamada (Capacitor) sayfa telefonun içinden açıldığı için
// sitenin tam adresi gerekir: mobil derlemede VITE_API_BASE=https://aisaasavran.com verilir.
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
/** Paylaşım/davet bağlantıları her zaman sitenin adresini gösterir (uygulamada location.origin "localhost" olur). */
export const SITE_ORIGIN: string = API_BASE || (typeof location !== "undefined" ? location.origin : "");
export const IS_NATIVE_APP: boolean = import.meta.env.VITE_NATIVE_APP === "1";
