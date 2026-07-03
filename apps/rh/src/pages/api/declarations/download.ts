import type { APIRoute } from 'astro';

export const prerender = false;

const BASE = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';

const CONTENT_TYPES: Record<string, string> = {
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
};

/** Proxy de téléchargement des fichiers privés produits par les déclarations
 *  (`download_url` renvoyée par le back). Le navigateur n'a pas de session sur
 *  le domaine Frappe : on forwarde le `sid` et on streame les octets — miroir
 *  du proxy bulletin/attestation de l'ESS (brique transverse).
 *  Anti-SSRF : chemin STRICTEMENT limité aux fichiers privés Frappe
 *  (`/private/files/…`, extension attendue, aucune traversée). */
export const GET: APIRoute = async ({ url, cookies }) => {
  const sid = cookies.get('sid')?.value;
  if (!sid) return json({ error: 'Non authentifié.' }, 401);

  const path = url.searchParams.get('path') || '';
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (!path.startsWith('/private/files/') || path.includes('..') || !CONTENT_TYPES[ext]) {
    return json({ error: 'Chemin de fichier invalide.' }, 400);
  }

  try {
    const res = await fetch(`${BASE}${encodeURI(path)}`, {
      headers: { Cookie: `sid=${sid}` },
    });
    if (!res.ok) {
      const denied = res.status === 403;
      return json({ error: denied ? 'Non autorisé.' : 'Fichier indisponible.' }, denied ? 403 : 404);
    }
    const buf = await res.arrayBuffer();
    const fname = path.split('/').pop() || `declaration.${ext}`;
    const asciiName = fname.replace(/[^\x20-\x7E]/g, '_');
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[ext],
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[api/declarations/download]', e);
    return json({ error: 'Erreur réseau.' }, 502);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
