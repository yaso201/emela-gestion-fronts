# Déploiement — emela SIRH (front ESS + RH/MSS)

Deux apps Astro (`apps/self-service`, `apps/rh`) dans un monorepo pnpm, partageant
`@emela/design-system` et `@emela/shared`. Back : `benin_hr` (Frappe/ERPNext).

---

## 0. TL;DR

```bash
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
pnpm check            # typecheck (doit être 0 erreur)
pnpm build            # build des 2 apps + packages
```

Puis : **(a)** choisir le mode de rendu (statique vs SSR), **(b)** basculer la source de
données `mock → frappe`, **(c)** régler l'auth (même origine recommandée). Voir ci-dessous.

---

## 1. Rendu : SSR (✅ ACTIF)

Les 2 apps sont en **SSR** (`output: 'server'`, adapter **`@astrojs/cloudflare`** v12) : le code de
frontmatter (`const x = await getX()`) s'exécute **PAR REQUÊTE**, ce qui propage la session de
l'utilisateur au back → chaque salarié voit SES données (indispensable avec `frappeSource`).

| Mode | Effet | Statut |
|---|---|---|
| **SSR + `frappeSource`** | frontmatter par requête, session propagée | ✅ **configuré (prod)** |
| Statique + `mockSource` | données de démo figées au build | démo (repasser `source = mockSource`) |
| Statique + `frappeSource` | ❌ fetch au build sans session → faux | à ne pas faire |

> Alternative serveur Node si vous ne déployez pas sur Cloudflare : remplacer l'adapter par
> `@astrojs/node` (`adapter: node({ mode: 'standalone' })`) dans `apps/*/astro.config.mjs`.
> NB Cloudflare : un avertissement « binding SESSION » peut apparaître (feature session
> expérimentale d'Astro, non utilisée ici) ; sans impact tant que les pages n'appellent pas
> `Astro.session`.

---

## 2. Source de données : `frappeSource` (✅ ACTIF)

La source active est **`frappeSource`** dans les deux `index.ts` (`mockSource` conservé pour
revenir à la démo : remettre `const source = mockSource`).
```ts
// packages/shared/src/{,rh/}data/index.ts
const source: DataSource = frappeSource;   // ← actif (back benin_hr)
```
**Aucune page à modifier.** Les clients ciblent la surface back RÉELLE (méthodes
whitelistées `cockpit.*`/`analytics.*`/`declarations.*`/`get_team_pending`/`retirement_*`
+ REST `/api/resource` scopé par les permissions back). Voir le tableau **BACK-GAP** du
README principal pour les getters encore en repli vide (à combler côté back si l'écran les exige).

---

## 3. Environnement

`PUBLIC_FRAPPE_URL` (cf. `apps/*/.env.example`), lue par les deux clients :
- **VIDE = même origine** (recommandé) : le front est servi **sous le domaine Frappe**
  (reverse-proxy). Les appels `/api/...` portent le cookie de session → auth transparente.
- **URL absolue = cross-origin** (ex. `https://hr.lanem.bj`) : nécessite côté Frappe le **CORS**
  (`allow_cors`) + cookies **`SameSite=None; Secure`**, OU une **auth par token**
  (`Authorization: token <key>:<secret>`) à injecter dans les en-têtes des clients.

---

## 4. Authentification & sécurité

- **Recommandé : même origine** (reverse-proxy le front sous le domaine Frappe) → le cookie de
  session Frappe suffit, `credentials: 'include'` fonctionne, CSRF géré par Frappe.
- **Déconnexion** : `window.hrLogout` (self-service) est un point d'extension → brancher sur
  `POST /api/method/logout` puis redirection `/connexion`.
- **Garde de routes par rôle** : le sélecteur de 6 rôles du back-office `rh` est une **commodité
  d'affichage**, **PAS une sécurité**. La sécurité réelle = les permissions `benin_hr` côté back
  (`permission_query_conditions` + `frappe.only_for`), déjà en place. Ne jamais s'y fier côté front.

---

## 5. Cibles de déploiement

### Option A — même origine (recommandée)
Servir le build derrière le **reverse-proxy du serveur Frappe** (nginx) sous des chemins dédiés,
ex. `/hr/` (self-service) et `/hr/admin/` (rh), même domaine que `benin_hr`. Cookie de session
partagé, zéro CORS. Régler `base` dans `astro.config` si sous-chemin.

### Option B — Cloudflare (convention des autres fronts LaNEM)
Build SSR (adapter Cloudflare) déployé sur **Cloudflare Workers/Pages au push GitHub**, comme
`admission-lanem` / `staff-lanem`. Configurer `PUBLIC_FRAPPE_URL` + le CORS/cookies Frappe
(option cross-origin du §3). Un projet Cloudflare par app (ou un Worker routant les 2).

> Les 2 apps écoutent par défaut le port `4321` en dev → ports distincts si simultané
> (`astro dev --port 4322`). En prod, les router par chemin/sous-domaine.

---

## 6. CI/CD

`.github/workflows/ci.yml` exécute `install → check → build → format:check` sur push/PR.
Ajouter l'étape de déploiement (Cloudflare Pages action, ou rsync vers le serveur Frappe)
selon l'option retenue. Garder `pnpm check` **bloquant** (0 erreur exigé).

---

## 7. Checklist de mise en production

- [x] `pnpm install && pnpm check && pnpm build` — vert (SSR).
- [x] **SSR** activé (`output: 'server'` + adapter Cloudflare v12 sur les 2 apps).
- [x] Source = `frappeSource` (back benin_hr) dans les 2 `data/index.ts`.
- [ ] `PUBLIC_FRAPPE_URL` réglée (vide si même origine).
- [ ] Auth : même origine (reverse-proxy) **ou** CORS+cookies/token (cross-origin).
- [ ] Brancher `hrLogout` + redirection de connexion.
- [ ] Combler les **BACK-GAP** côté `benin_hr` si les écrans concernés sont activés
      (colleagues, documents, évaluations, suivi déclarations, séparations, modèles).
- [ ] Vérifier les permissions par rôle **côté back** (le filtrage front n'est pas une sécurité).
