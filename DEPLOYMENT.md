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

## 1. ⚠️ Décision structurante : STATIQUE vs SSR

Les `astro.config.mjs` sont **vides → sortie STATIQUE** par défaut. En statique, le code de
frontmatter d'une page (`const x = await getX()`) s'exécute **au BUILD**, pas par requête.

| Mode | Effet | Usage |
|---|---|---|
| **Statique (actuel)** + `mockSource` | données de démo **figées dans le HTML** au build | démo / maquette |
| **Statique** + `frappeSource` | ❌ fetch **au build**, **sans session utilisateur** → données fausses/vides | À NE PAS faire |
| **SSR** + `frappeSource` | ✅ frontmatter exécuté **par requête**, propage le cookie de session de l'utilisateur | **PRODUCTION** |
| Statique + fetch **client** | ✅ données chargées dans le navigateur (`<script>`) | alternative SPA |

**Pour une production multi-utilisateurs (chaque salarié voit SES données), il faut le SSR.**

### Activer le SSR
```bash
# Cloudflare (convention LaNEM) :
pnpm --filter @emela/self-service add @astrojs/cloudflare
pnpm --filter @emela/rh add @astrojs/cloudflare
```
```js
// apps/<app>/astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({ output: 'server', adapter: cloudflare() });
```
> Alternative serveur Node : `@astrojs/node` (`adapter: node({ mode: 'standalone' })`).

---

## 2. Basculer les données mock → benin_hr

Une seule ligne par sous-domaine :
```ts
// packages/shared/src/data/index.ts          (self-service)
import { frappeSource } from '../client/frappe';
const source: DataSource = frappeSource;       // au lieu de mockSource

// packages/shared/src/rh/data/index.ts        (rh)
import { frappeSource } from '../client/frappe';
const source: RhDataSource = frappeSource;
```
**Aucune page à modifier.** Les clients ciblent déjà la surface back RÉELLE (méthodes
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

- [ ] `pnpm install && pnpm check && pnpm build` — vert.
- [ ] Choisir **SSR** (adapter) si données par-utilisateur ; configurer `astro.config`.
- [ ] Basculer `mockSource → frappeSource` (2 lignes).
- [ ] `PUBLIC_FRAPPE_URL` réglée (vide si même origine).
- [ ] Auth : même origine (reverse-proxy) **ou** CORS+cookies/token (cross-origin).
- [ ] Brancher `hrLogout` + redirection de connexion.
- [ ] Combler les **BACK-GAP** côté `benin_hr` si les écrans concernés sont activés
      (colleagues, documents, évaluations, suivi déclarations, séparations, modèles).
- [ ] Vérifier les permissions par rôle **côté back** (le filtrage front n'est pas une sécurité).
