/* ============================================================
   @emela/shared — Session (proxy SSR vers benin_hr / Frappe).
   ------------------------------------------------------------
   Modèle : le front « possède » un cookie `sid` (obtenu au login depuis
   Frappe) ; en SSR, chaque appel data forwarde ce `sid` à benin_hr
   (serveur→serveur, pas de CORS). Le `sid` est stocké par REQUÊTE via
   AsyncLocalStorage (sûr en concurrence — pas de fuite inter-requêtes).
   Fonctionne en local (Node) et en prod (Cloudflare avec nodejs_compat).
   ============================================================ */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface SessionCtx {
  sid?: string;
  /** Profils RH de l'utilisateur (dérivés des vrais rôles back). App RH uniquement. */
  profiles?: string[];
  /** Nom affichable de l'utilisateur connecté (app RH). */
  fullName?: string;
}

/** Contexte de session scopé à la requête SSR courante. */
export const sessionStore = new AsyncLocalStorage<SessionCtx>();

/** `sid` de la requête courante (ou undefined hors requête / non connecté). */
export const getSid = (): string | undefined => sessionStore.getStore()?.sid;

/** Profils RH de la requête courante (vide hors app RH ou non autorisé). */
export const getProfiles = (): string[] => sessionStore.getStore()?.profiles ?? [];

/** Nom affichable de l'utilisateur courant (app RH). */
export const getFullName = (): string => sessionStore.getStore()?.fullName ?? '';

/** En-têtes d'auth pour un appel back : forwarde le cookie de session Frappe. */
export const authHeaders = (): Record<string, string> => {
  const sid = getSid();
  return sid ? { Cookie: `sid=${sid}` } : {};
};

const ROOT = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';

/** Login Frappe : POST /api/method/login (usr/pwd) → renvoie le `sid` ou null. */
export async function frappeLogin(usr: string, pwd: string): Promise<string | null> {
  const res = await fetch(`${ROOT}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ usr, pwd }),
  });
  if (!res.ok) return null;
  // Récupère le sid depuis Set-Cookie. undici/Workers exposent getSetCookie() (liste) ;
  // sinon header brut éventuellement concaténé par des virgules → on cherche `sid=`
  // après début, `;` OU `,` pour rester robuste au multi-cookies.
  const candidates: string[] = (res.headers as any).getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const m = /(?:^|[;,]\s*)sid=([^;,]+)/.exec(candidates.join(', '));
  return m && m[1] && m[1] !== 'Guest' ? m[1] : null;
}

/** Valide une session Frappe : get_logged_user → vrai si connecté (≠ Guest). */
export async function frappeValidate(sid: string): Promise<boolean> {
  try {
    const res = await fetch(`${ROOT}/api/method/frappe.auth.get_logged_user`, {
      headers: { Accept: 'application/json', Cookie: `sid=${sid}` },
    });
    if (!res.ok) return false;
    const user = (await res.json()).message;
    return Boolean(user) && user !== 'Guest';
  } catch {
    return false;
  }
}

/** Profil RH dérivé des vrais rôles back. Sert AUSSI de validation de session
 *  (allow_guest=False → 403 si sid invalide). null = session invalide. */
export async function frappeProfile(sid: string): Promise<{ profiles: string[]; is_rh: boolean; fullName: string } | null> {
  try {
    const res = await fetch(`${ROOT}/api/method/benin_hr.api.cockpit.get_my_profile`, {
      headers: { Accept: 'application/json', Cookie: `sid=${sid}` },
    });
    if (!res.ok) return null; // 403 (Guest/sid invalide) ou autre
    const m = (await res.json()).message;
    return {
      profiles: Array.isArray(m?.profiles) ? m.profiles : [],
      is_rh: Boolean(m?.is_rh),
      fullName: m?.full_name ?? '',
    };
  } catch {
    return null;
  }
}

/** Contexte salarié (gate ESS). Sert AUSSI de validation de session (allow_guest=False
 *  → 403 si sid invalide). null = session invalide ; isEmployee=false = pas de dossier. */
export async function frappeEmployeeContext(sid: string): Promise<{ isEmployee: boolean; fullName: string } | null> {
  try {
    const res = await fetch(`${ROOT}/api/method/benin_hr.api.cockpit.get_my_employee_context`, {
      headers: { Accept: 'application/json', Cookie: `sid=${sid}` },
    });
    if (!res.ok) return null; // 403 (Guest/sid invalide) ou autre
    const m = (await res.json()).message;
    return { isEmployee: Boolean(m?.is_employee), fullName: m?.full_name ?? '' };
  } catch {
    return null;
  }
}

/** Logout Frappe (best-effort) ; le front efface ensuite son cookie `sid`. */
export async function frappeLogout(sid?: string): Promise<void> {
  try {
    await fetch(`${ROOT}/api/method/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...(sid ? { Cookie: `sid=${sid}` } : {}) },
    });
  } catch { /* best-effort */ }
}
