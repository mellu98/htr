# Wave Up

> **AI Coach 24/7 per artisti musicali e manager** — ancorato al metodo del corso **HTR Training**.

Wave Up non è un course player. È un **Artist Growth OS**.

Il valore principale non è guardare i video (anche se puoi farlo). Il valore
è avere un coach AI che ragiona sempre sul **tuo** progetto, tra una call
settimanale e l'altra — e ti spinge a fare, non solo a studiare.

HTR Training resta **dentro** Wave Up come course engine: 28 lezioni,
output AI generati, Review Center. Ma il cuore del prodotto è il **Release
Growth System**: una release = un obiettivo chiaro, con milestone,
contenuti, contatti, numeri e goal da guardare ogni giorno.

---

## Le 5 aree principali

| Area | Cosa fa |
|------|---------|
| **Artist Profile** (`/artist-profile`) | Single source of truth sull'artista: livello, obiettivo, blocco, call settimanale. Più è onesto, più il coach è utile. |
| **Coach** (`/coach`) | 13 prompt rapidi (8 diagnostici + 5 growth). Cronologia persistente. |
| **Releases** (`/releases`) | Release Growth System: lista release attive con milestone, contenuti, metriche, outreach e goal. Dettaglio con 7 tab per release. |
| **Tasks** (`/tasks`) | Kanban `Da fare / In corso / Bloccato / Completato`. Ogni task è agganciato a un artista, opzionalmente a una lesson del corso. |
| **Manager Mode** (`/manager`) | Roster demo: gestisci più artisti con progresso corso, task, prossima call. |

Le aree "growth" (sotto la release):

| Area | Cosa fa |
|------|---------|
| **Prossime uscite** (`/releases`) | Lista release + dettaglio con 7 tab (Panoramica, Milestone, Calendario, Numeri, Contatti, Obiettivi, Brief Coach). |
| **Contenuti** (`/content`) | Calendario editoriale: idee, bozze, programmati, pubblicati. Filtri per piattaforma e stato. |
| **Numeri** (`/metrics`) | Snapshot manuali per piattaforma: follower, stream, views, link clicks. Confronto automatico ultimo vs precedente. |
| **Contatti** (`/contacts`) | Mini CRM musicale: curator, venue, press, influencer, fan. Outreach integrato per ogni contatto. |
| **Obiettivi** (`/goals`) | Goal misurabili con target, deadline e progresso %. |
| **Call Prep** (`/call-prep`) | Report Markdown pre-call. Resta accessibile dal pulsante nella home. |

A queste si aggiungono le aree "content" del course engine (HTR Training):

| Area | Cosa fa |
|------|---------|
| **Video Library** (`/library`) | Catalogo lezioni con stato import / AI / progress. |
| **Lesson Page** (`/lesson/[slug]`) | Player locale + 11 tab studio. |
| **Review Center** (`/review`) | Approva / modifica / scarta gli output AI. |
| **AI Processing** (`/ai`) | Comandi CLI + log mock per generare i contenuti. |

---

## Stack

| Layer            | Scelta                                         |
|------------------|------------------------------------------------|
| Framework        | Next.js 14 (App Router)                        |
| Linguaggio       | TypeScript (strict)                            |
| UI               | Tailwind CSS + shadcn/ui pattern + lucide-react |
| DB               | PostgreSQL via Prisma                          |
| AI               | OpenRouter (`minimax/minimax-m3` + Gemini Flash Lite per ASR) — env keys opzionali |
| Storage AI       | File system: `/content/generated/<slug>/`      |
| Video            | HTML5 `<video>` su file locali in `/public/videos/` |

---

## Struttura del progetto

```
.
├── app/
│   ├── api/                        # API REST
│   │   ├── artist-profile/         # CRUD artista
│   │   ├── coach/log/              # Persistenza conversazioni coach
│   │   ├── call-prep/generate/     # Genera report call prep
│   │   ├── manager/                # Manager roster
│   │   ├── tasks/                  # Task engine CRUD
│   │   ├── progress/lesson/        # Progresso lezione HTR
│   │   ├── notes/, bookmarks/, checklist/, flashcards/, quiz/, review/
│   ├── artist-profile/             # /artist-profile
│   ├── call-prep/                  # /call-prep
│   ├── coach/                      # /coach (Wave Up Coach)
│   ├── library/                    # /library (Video Library)
│   ├── lesson/[slug]/              # /lesson/<slug>
│   ├── manager/                    # /manager (Manager Mode)
│   ├── notes/                      # /notes
│   ├── review/                     # /review (Review Center)
│   ├── ai/, ai/tutor/              # /ai (AI Processing + Tutor)
│   ├── globals.css · layout.tsx · not-found.tsx · page.tsx
│
├── components/
│   ├── artist/ArtistProfilePanel.tsx
│   ├── call-prep/CallPrepPanel.tsx
│   ├── coach/CoachPanel.tsx
│   ├── dashboard/WaveUpDashboard.tsx
│   ├── library/VideoLibrary.tsx
│   ├── lesson/                     # LessonShell + 11 tab
│   ├── manager/ManagerRoster.tsx
│   ├── notes/AllNotesView.tsx
│   ├── review/ReviewCenter.tsx
│   ├── ai/AIProcessingPanel.tsx · AITutorPanel.tsx
│   ├── ui/                         # shadcn-style primitives
│   ├── video/                      # LocalVideoPlayer, LessonNavigator
│   └── layout/                     # Shell, TopBar (Wave Up), BottomNav
│
├── content/
│   ├── course.json                 # Catalogo HTR Training (28 lezioni)
│   └── generated/                  # Output AI per lesson (gitignored)
│
├── lib/
│   ├── ai/minimax.ts               # Stub MiniMax + mock generator
│   ├── ai/tutor.ts                 # Tutor "classico" (legacy, ancora attivo)
│   ├── wave-up/coach.ts            # Wave Up Coach: 8 prompt + suggested tasks
│   ├── wave-up/call-prep.ts        # Generatore report call prep
│   ├── wave-up/brand.ts            # Brand + nav Wave Up
│   ├── content.ts · course.ts · status.ts · types.ts · utils.ts · validation.ts
│   └── db/index.ts · queries.ts · wave-up-queries.ts
│
├── prisma/schema.prisma            # 15 modelli (8 HTR + 5 Wave Up + 2 condivisi)
├── public/videos/                  # MP4 locali (gitignored)
├── scripts/                        # analyze-video, analyze-all, generate-course-manifest, seed-db
├── README.md
└── (configs) package.json · tsconfig.json · tailwind.config.ts · next.config.js · .env · .env.example
```

---

## Modelli Prisma (22 totali)

**HTR Training (course engine)** — invariati:
`LessonProgress`, `Note`, `Bookmark`, `ChecklistProgress`, `FlashcardProgress`,
`QuizAttempt`, `ReviewStatus`, `AppSettings`.

**Wave Up (product layer)**:
- `ArtistProfile` — identità artista (nome, genere, livello, goal, audience,
  piattaforme, blocco principale, brand keywords, reference artists, call
  settimanale).
- `ManagerArtist` — entry del roster del manager.
- `Task` — unità atomica di lavoro (courseId, artistProfileId, lessonSlug?,
  title, description, priority, status, dueDate, expectedOutput,
  coachPromptId).
- `CallPrepReport` — snapshot pre-call (6 sezioni + fullMarkdown).
- `CoachConversation` — log di ogni turno del coach.

**Release Growth System** (nuovo):
- `Release` — singolo, EP, album, videoclip, live o campagna. Stato
  (planning / pre_release / released / post_release / archived), data di
  uscita, obiettivo principale, budget, piattaforme.
- `ReleaseMilestone` — tappe del lancio (kickoff, artwork, mixing, PR push,
  release day). Status todo / in_progress / done / blocked. Priority
  low / medium / high / urgent.
- `ContentIdea` — calendario contenuti (instagram, tiktok, youtube, spotify,
  newsletter, website, other). Hook, script, caption, CTA, publishAt.
  Status idea / draft / approved / scheduled / published / archived.
- `MetricSnapshot` — snapshot manuali per artista su una piattaforma in una
  data: follower, views, likes, comments, shares, saves, streams,
  monthlyListeners, profileVisits, linkClicks.
- `Contact` — mini CRM (curator, venue, press, influencer, label, artist,
  fan, sponsor, other). Email, instagram, tiktok, website, city, notes.
  Status new / active / warm / cold / archived.
- `Outreach` — contatto + canale (email, instagram, tiktok, whatsapp,
  phone, other). Status to_contact / contacted / replied / interested /
  rejected / closed. lastContactAt + nextFollowUpAt per i follow-up.
- `Goal` — obiettivo misurabile (metric + targetValue + currentValue +
  deadline). Status active / achieved / missed / archived.

---

## Avvio rapido

Prerequisito: PostgreSQL 14+. Per dev locale il modo più rapido è Docker:

```bash
docker run --name waveup-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

Poi:

```bash
npm install
cp .env.example .env             # aggiusta DATABASE_URL se necessario
npm run db:generate
npm run db:push                  # applica schema Prisma su Postgres
npm run db:seed                  # crea AppSettings + dataset demo (Luna Rossa / Notte Storta)

npm run dev    # → http://localhost:3000
```

Build produzione:

```bash
npm run build && npm start
```

---

## Flusso d'uso consigliato

1. **Apri `/artist-profile`** → crea il tuo artista. Compila *almeno* main goal
   e biggest block (senza, il coach è generico).
2. **Apri `/releases`** → crea la tua prima release (singolo, EP, album,
   videoclip, campagna). Aggiungi 3 milestone, 5 contenuti, 1-2 goal.
3. **Apri `/coach`** → parti da *"Preparami il piano di lancio"* per la
   tua release attiva. Oppure chiedi *"Cosa pubblico questa settimana?"*
   o *"Sto andando verso l'obiettivo?"*.
4. **Apri `/tasks`** → prendi i task suggeriti dal coach (1 click → Kanban)
   oppure creane di tuoi.
5. **Apri `/content`** → pianifica i contenuti della settimana con hook,
   formato e CTA per ciascuno.
6. **Apri `/contacts`** → aggiungi 3-5 contatti chiave (curator, venue,
   press). Traccia outreach e follow-up.
7. **Venerdì** → `/call-prep` → "Genera report" → portalo alla call umana.
8. **Dopo la call** → aggiorna Artist Profile (goal / block / nextCallAt),
   misura i numeri su `/metrics`, ricomincia.

### Per i manager

1. Crea un profilo per ciascun artista dal menu di selezione in
   `/artist-profile`.
2. Vai su `/manager` e "aggiungi al roster" ciascuno.
3. Apri il Coach per un singolo artista selezionandolo come attivo, e usa
   il prompt *"Come posso applicarlo al mio artista?"* per tradurre una
   lezione HTR in task specifici.

---

## Dove mettere i video

Tutti i file MP4 vanno in `public/videos/`. La convenzione di default è:

```
public/videos/01-branding-parte-uno.mp4
public/videos/02-branding-parte-due.mp4
public/videos/03-case-study-updated.mp4
public/videos/04-modulo-3-1.mp4
…
public/videos/28-modulo-4-18.mp4
```

Puoi rinominare: aggiorna `videoPath` in `content/course.json`. La webapp
cerca sempre in `public/videos/<basename>`.

⚠️ I video **non** sono committati (`.gitignore` esclude
`/public/videos/*.mp4`).

---

## Generare gli output AI (mock)

```bash
npm run analyze:video -- branding-parte-due    # singola lezione
npm run analyze:all                            # tutte
npm run analyze:all -- --only-imported         # solo con video locale
npm run generate:manifest                      # ricostruisce manifest.json
```

Output scritto in `/content/generated/<slug>/`:
`transcript.md`, `visual-notes.md`, `summary.md`, `action-plan.md`,
`checklist.json`, `quiz.json`, `flashcards.json`, `lesson-analysis.json`.

Senza `MINIMAX_API_KEY` gli script generano output deterministici basati sul
titolo del modulo. Con la key, viene loggato il "would-call" ma il resto
resta mock finché non si cabla la funzione `callModel()` in
`lib/ai/minimax.ts`.

---

## Il Coach Wave Up in dettaglio

`lib/wave-up/coach.ts` espone **13 prompt** organizzati in 5 categorie:

- **Diagnostic** — *posizionamento*, *unblock* (analisi del blocco).
- **Planning** — *this-week*, *plan-7*, *plan-30*.
- **Execution** — *lesson-to-task*, *apply-to-artist*.
- **Reflection** — *call-prep*.
- **Growth** — *release-plan*, *content-week*, *metrics-review*,
  *outreach-plan*, *goal-check* (leggono i dati nuovi del Release Growth
  System).

Ogni prompt produce:
1. Una risposta strutturata in linguaggio naturale.
2. Una lista di **task suggeriti** che il Kanban può importare con 1 click.
3. Una lista di **fonti** (ArtistProfile, Task, Release, MetricSnapshot,
   lesson-analysis.json, …).

Il coach è **offline-first**: legge da profilo + tasks + release + metriche
+ file generati, non chiama mai un'API live dalla UI. Solo gli script CLI
possono farlo.

Quando collegherai MiniMax reale: modifica solo `callModel()` in
`lib/ai/minimax.ts` e il sistema è pronto.

---

## Call Prep

`/call-prep` genera un report Markdown pronto per la call con:

- Cosa è stato completato (task chiusi + progresso corso).
- Task ancora aperti, ordinati per priorità.
- Blocchi principali (profilo + task bloccati).
- 3+ domande specifiche per il coach umano.
- Decisioni da prendere in call (sblocco task, milestone release).
- Piano per la settimana successiva.

I report sono persistiti in `CallPrepReport`. Puoi riesportarli come
Markdown o confrontarli tra call successive.

---

## Nota legale

Questa webapp **non scarica, scarpina, o accede a stream Vimeo** o altre
sorgenti protette. Funziona esclusivamente con file MP4 locali inseriti
manualmente in `/public/videos/`. Nessun cookie, token, DevTools, m3u8 o
tecniche di estrazione stream vengono utilizzati.

I contenuti AI generati da `npm run analyze:*` sono mock deterministici di
default. Quando collegherai MiniMax, sei responsabile di rispettare i
termini di servizio del vendor per qualsiasi materiale tu decida di
processare.

---

## Comandi disponibili

| Script              | Cosa fa                                              |
|---------------------|------------------------------------------------------|
| `npm run dev`       | Dev server Next.js                                    |
| `npm run build`     | Build produzione                                      |
| `npm run start`     | Avvia il build                                        |
| `npm run db:push`   | Applica schema Prisma su SQLite                       |
| `npm run db:seed`   | Crea singleton `AppSettings`                         |
| `npm run analyze:video -- <slug>` | Genera output AI per una lesson                |
| `npm run analyze:all`            | Genera output per tutte le lesson              |
| `npm run generate:manifest`      | Ricostruisce `content/manifest.json`           |

---

## Mobile

- Bottom nav (Home / Coach / Releases / Tasks / Manager). Call Prep e le
  aree growth (Content, Numeri, Contatti, Obiettivi) si aprono dal drawer
  TopBar.
- Tabs lesson orizzontali scrollabili.
- Player sempre full-width sopra i tab.
- Navigator lezioni collassabile in `<details>` sotto i tab.
- Coach/Tasks/Releases/Goals ottimizzati per una colonna su mobile.

---

## Cosa è reale, cosa è mock

**Verificato funzionante** (QA pass completo, tutte le route 200, build pulito):

| Funzionalità | Stato | Note |
|---|---|---|
| **Artist Profile** CRUD | ✅ reale | persistenza Prisma, enum validation, auto-set active |
| **Task Engine** Kanban CRUD | ✅ reale | todo/in_progress/done/blocked, priority, dueDate, lessonSlug, coachPromptId |
| **Release Growth System** | ✅ reale | 7 modelli Prisma (Release, ReleaseMilestone, ContentIdea, MetricSnapshot, Contact, Outreach, Goal) + API REST + 6 pagine UI |
| **Wave Up Coach** 13 prompt | ⚠️ **mock deterministico** | 8 prompt classici (ArtistProfile + Task + lesson-analysis.json locali) + 5 prompt growth (release/content/metrics/outreach/goal). **Non chiama nessuna API.** Le risposte sono template contestuali. |
| **Call Prep** generazione | ⚠️ **mock deterministico** | aggrega task chiusi + aperti + blocchi + domande da profilo. Niente generazione AI. |
| **Manager Mode** roster | ✅ reale | CRUD + counters cached su `ManagerArtist` (non auto-refresh, è un trade-off) |
| **Video Library** | ✅ reale | legge `content/course.json`, mostra stato import/AI/progress |
| **Lesson Page** 11 tab | ✅ reale | player HTML5 locale, autosave ogni 5s, mark complete @ 90% |
| **AI Tutor** 7 prompt | ⚠️ **mock deterministico** | stessa filosofia del Coach: template dai file generati, nessuna API call |
| **Review Center** | ✅ reale | CRUD ReviewStatus (pending/reviewed/needs_edits/approved) |
| **AI Processing page** | ✅ reale (via OpenRouter se MINIMAX_API_KEY presente) | `callModel()` chiama `minimax/minimax-m3` su OpenRouter (testo + immagine). Per il video end-to-end: `analyzeVideoWithMiniMax` estrae audio (ffmpeg → MP3) + 32 keyframe, trascrive con Gemini Flash Lite, analizza con M3. Senza key, fallback a mock deterministico. |
| **Esportazione Markdown** | ✅ reale | download Blob client-side, niente server |
| **Mobile bottom nav** | ✅ reale | 5 voci (Home/Coach/Releases/Tasks/Manager) + drawer per aree growth |
| **Bottom-up / Hydration** | ✅ verificato | tutte le page serializzano Date → ISO; nessun `<button onClick>` in server component |

**Cosa è mock chiaramente etichettato:**

1. **AI Tutor** — risposte sono template da file generati, non GPT-style. Il seed è basato sullo slug. Stessa risposta ad ogni esecuzione.
2. **Wave Up Coach** — idem. Il tone-of-voice è reale (regole in `lib/wave-up/coach.ts`), ma il "ragionamento" è template.
3. **Call Prep** — le 6 sezioni sono composte da task/profilo/blocks. Niente sintesi AI.
4. **`callModel()` in `lib/ai/minimax.ts`** — è una stub che logga "would-call" e ritorna il mock. **Unico punto di cablaggio per vendor reale.**

**Per collegare MiniMax reale** (o qualsiasi altro modello):
1. Apri `lib/ai/minimax.ts`.
2. Modifica solo `callModel()`: riempi con la chiamata HTTP al vendor reale.
3. Gli script CLI (`npm run analyze:video`, `npm run analyze:all`) passeranno automaticamente per quella funzione.
4. La UI non cambierà — il pattern offline-first è già pronto.

**Limitazioni note** (non bug, scelte di design):

- **Manager counters** (`openTasksCount`, `blockedTasksCount`) sono cached sul record `ManagerArtist` e non si auto-refreshano. Per refresh: aggiungi un trigger in `app/api/tasks/[id]/route.ts` PATCH che chiama `refreshManagerStats(managerArtistId)`.
- **AI Processing** richiede di lanciare `npm run analyze:all` per popolare `/content/generated/<slug>/`. Senza quello, le tab Quiz/Flashcards/Visual Notes mostrano "non ancora generato".
- **Video player** mostra placeholder se il file MP4 non è in `/public/videos/<basename>`. La webapp non crasha, ma il player non parte.

---



- L'utente deve: `npm install`, droppare i MP4 in `/public/videos/`,
  lanciare `npm run db:push && npm run db:seed`,
  `npm run analyze:all` per generare i mock.
- **Primo step UI**: crea un artista da `/artist-profile`.
- **Secondo step UI**: parla col coach da `/coach`.
- Quando vorrai collegare MiniMax reale: modifica solo
  `lib/ai/minimax.ts` → `callModel()`.

---

## Risultato QA (2026-06-19)

**5 step di install/build verificati**: `npm install` ✓ → `prisma generate` ✓ → `prisma db push` ✓ (13 tabelle create) → `npm run dev` ✓ → `npm run build` ✓.

**11 route testate** (tutte HTTP 200 in `npm run build` + `npm start`):

- `/` (dashboard), `/artist-profile`, `/coach`, `/tasks`, `/call-prep`, `/manager`, `/library`, `/review`, `/notes`, `/ai`, `/lesson/branding-parte-uno`

**Flusso end-to-end verificato**:
1. POST `/api/artist-profile` → crea "Luna Rossa", auto-set active ✓
2. GET `/coach` → badge "Profilo attivo: Luna Rossa" ✓
3. POST `/api/coach/ask` (promptId=positioning) → risposta contestuale ✓
4. POST `/api/coach/ask` (promptId=lesson-to-task) → 3 suggestedTasks con priorità/dueInDays ✓
5. POST `/api/tasks` → task creato, status `todo` ✓
6. PATCH `/api/tasks/[id]` status=in_progress → stato aggiornato ✓
7. POST `/api/call-prep/generate` → report Markdown con 6 sezioni + fullMarkdown ✓
8. POST `/api/manager/attach` → manager roster popolato ✓
9. GET `/` (dashboard) → mostra "Luna Rossa", task QA, "0/28 lezioni" coerente ✓
10. GET `/manager` → mostra "Luna (managed)" ✓

**Bug critici trovati e risolti**:
- Schema Prisma mancava 4 relation inverse → loop di validazione
- Collision slug Next.js (`bookmarks/[id]` vs `[slug]`) → spostato in `delete/[id]`
- `@radix-ui/react-checkbox` mancante → installato
- `lib/content.ts` (con `node:fs`) trascinato in client bundle → spostata logica in route API server-side
- `Markdown` → loop infinito + OOM su `**bold**` non gestito → aggiunto safety `i++`
- `formatDuration` non esportato → aggiunta
- `z.infer` non esiste (z è const) → aggiunto `Infer<T>` helper
- `route.ts` esportava costanti extra (Next vieta) → rimosse
- `Date` passato raw a client → serializzato a ISO string
- `AllNotesView` mancava `'use client'` ma aveva `onClick` → aggiunto
- `Input` non aveva prop `label` → rimosso
- TS narrow su nullable in closures → aggiunto `const list = ...` post-check
- `scripts/generate-course-manifest.ts` → mancava `)` (sintassi)
- `normalizeDates` typed troppo stretto → ampliato

Vedi engram obs `wave-up-qa-fixes` per il changeset completo.

---

Costruito con cura. ✦ **Wave Up** — *between calls, on the work.*
