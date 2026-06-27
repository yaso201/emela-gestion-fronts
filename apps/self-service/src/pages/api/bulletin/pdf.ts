import type { APIRoute } from 'astro';

export const prerender = false;

const BASE = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';
const METHOD = 'benin_hr.hr_localization.doctype.payroll_slip.payroll_slip.download_payslip_pdf';

/** Proxy de téléchargement du bulletin PDF : forwarde le `sid` au back (qui gate
 *  la permission self-scope) et streame les octets au navigateur. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const sid = cookies.get('sid')?.value;
  if (!sid) return json({ error: 'Non authentifié.' }, 401);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Bulletin requis.' }, 400);
  const inline = url.searchParams.get('inline') === '1';
  try {
    const res = await fetch(`${BASE}/api/method/${METHOD}?payroll_slip=${encodeURIComponent(id)}`, {
      headers: { Cookie: `sid=${sid}`, Accept: 'application/pdf' },
    });
    if (!res.ok) {
      const denied = res.status === 403;
      return json({ error: denied ? 'Non autorisé.' : 'Bulletin indisponible.' }, denied ? 403 : 404);
    }
    const buf = await res.arrayBuffer();
    const fname = `bulletin-${id}.pdf`;
    const asciiName = fname.replace(/[^\x20-\x7E]/g, '_');
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[api/bulletin/pdf]', e);
    return json({ error: 'Erreur réseau.' }, 502);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
