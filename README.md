# SPK Field Reports — Application Terrain

PWA React/TypeScript pour la création de rapports d'essai d'usinage sur le terrain.

## Installation

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173` dans ton navigateur.

## Build Production (PWA installable)

```bash
npm run build
npm run preview
```

Puis déployer le dossier `dist/` sur n'importe quel hébergeur statique (Netlify, Vercel, GitHub Pages).

## Installation sur iPhone/iPad

1. Ouvrir l'URL dans Safari
2. Bouton Partager → "Sur l'écran d'accueil"
3. L'app fonctionne ensuite hors-ligne

## Stack

- React 18 + TypeScript
- Vite + vite-plugin-pwa
- Zustand (state)
- Dexie (IndexedDB — stockage local)
- jsPDF (génération PDF côté client)
- browser-image-compression (compression photos)

## Fonctionnalités

- ✅ Formulaires de saisie (contacts, pièce, machine, processus)
- ✅ Journal de tests itératif avec MRR calculé automatiquement
- ✅ Capture photo (caméra + import)
- ✅ Éditeur d'annotations (flèche, flèche courbe, rectangle, cercle, dessin libre, texte)
- ✅ 6 couleurs d'annotation fixes
- ✅ Conservation originale/annotée au choix
- ✅ Comparateur ROI (12 indicateurs calculés)
- ✅ Génération PDF A4 paysage fidèle au template SPK
- ✅ Pagination dynamique selon nombre de tests
- ✅ Stockage local IndexedDB (fonctionne 100% hors-ligne)
- ✅ PWA installable sur mobile et tablette

## Structure

```
src/
├── types/         — Modèle de données TypeScript
├── db.ts          — Base Dexie IndexedDB
├── store/         — Zustand store + calculs ROI
├── components/    — UI, Layout, PhotoAnnotator, PhotoCapture
├── pages/         — Dashboard, ReportEditor, TestLog, ROI, Conclusion, Export
└── utils/         — Générateur PDF
```
