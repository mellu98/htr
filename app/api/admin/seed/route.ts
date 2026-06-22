import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * Admin seed endpoint.
 *
 * GET /api/admin/seed        → status: { artists, settings, ready }
 * POST /api/admin/seed       → idempotent seed of demo dataset (Luna Rossa / Notte Storta)
 *
 * Auth: requires header `x-admin-token: ${ADMIN_SEED_TOKEN}` (server env).
 * The token must be set on Render before calling. If ADMIN_SEED_TOKEN is not set,
 * the endpoint is disabled and returns 503 — preventing accidental seeding in dev.
 *
 * Idempotent:
 *   - AppSettings singleton: created if missing.
 *   - Demo dataset: skipped entirely if at least one ArtistProfile exists.
 *
 * This endpoint exists to let us populate a freshly-provisioned Postgres DB
 * (e.g. Render) without needing shell access to the container.
 */

const prisma = new PrismaClient();

function checkAuth(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.ADMIN_SEED_TOKEN;
  if (!expected) {
    return { ok: false, status: 503, error: 'ADMIN_SEED_TOKEN not configured on server' };
  }
  const provided = request.headers.get('x-admin-token') ?? '';
  if (provided !== expected) {
    return { ok: false, status: 401, error: 'Invalid or missing x-admin-token' };
  }
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [artistCount, settings] = await Promise.all([
    prisma.artistProfile.count(),
    prisma.appSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  return NextResponse.json({
    ok: true,
    artists: artistCount,
    settingsPresent: !!settings,
    ready: artistCount > 0 && !!settings,
  });
}

export async function POST(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const log: string[] = [];

  // ── Singleton AppSettings ────────────────────────────────────────────────
  const existingSettings = await prisma.appSettings.findUnique({
    where: { id: 'singleton' },
  });
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: { id: 'singleton', theme: 'dark' },
    });
    log.push('Created AppSettings singleton');
  } else {
    log.push('AppSettings singleton already present');
  }

  // ── Demo dataset (idempotent on artist count) ────────────────────────────
  const existingArtists = await prisma.artistProfile.count();
  if (existingArtists > 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Demo dataset already present (artists found)',
      artists: existingArtists,
      log,
    });
  }

  log.push('Seeding demo dataset (Luna Rossa / Notte Storta)…');

  // 1. Artist
  const artist = await prisma.artistProfile.create({
    data: {
      artistName: 'Luna Rossa',
      musicGenre: 'Urban / Cantautorato',
      currentLevel: 'growing',
      mainGoal: '500 fan email in 60 giorni per il lancio di "Notte Storta"',
      targetAudience: 'Ascoltatori 18-30 urban, donne e uomini che cercano testi veri',
      activePlatforms: JSON.stringify(['instagram', 'tiktok', 'spotify', 'newsletter']),
      biggestBlock: 'Produco tanto ma pubblico poco: ho paura del giudizio sulle canzoni finite.',
      brandKeywords: 'notturno, intimo, urbano, poetico, femminile',
      referenceArtists: 'Madame, Madame ovvio, Anaïs, Coez',
      weeklyCallDay: 'friday',
      nextCallAt: new Date(Date.now() + 5 * 86400000),
      notes: 'Lavora meglio la sera tardi. Sensibile al feedback visivo (cover, colori).',
    },
  });
  log.push(`Artist: ${artist.artistName} (${artist.id})`);

  await prisma.appSettings.update({
    where: { id: 'singleton' },
    data: { activeArtistId: artist.id },
  });
  log.push('Linked activeArtistId → Luna Rossa');

  // 2. Release
  const release = await prisma.release.create({
    data: {
      artistProfileId: artist.id,
      title: 'Notte Storta',
      type: 'ep',
      status: 'pre_release',
      releaseDate: new Date(Date.now() + 21 * 86400000),
      mainGoal: '500 fan email + 50K stream nelle prime 4 settimane. Concept: notti insonni a Milano. Ascoltatori urban 18-30 che amano testi intimi.',
      platforms: JSON.stringify(['spotify', 'apple_music', 'youtube', 'instagram', 'tiktok']),
      budget: 500,
      notes: 'Cover: tono notturno viola/blu, luna piena stilizzata, niente foto artista.',
    },
  });
  log.push(`Release: ${release.title}`);

  // 3. Milestones
  const milestones = await Promise.all([
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Finalizzare master EP con fonico',
        description: 'Saltarebbe tutto il calendario se slitta.',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 86400000),
      },
    }),
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Confermare pitch curator playlist indie italiane',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 86400000),
      },
    }),
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Pubblicare primo TikTok teaser del singolo',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 10 * 86400000),
      },
    }),
  ]);
  log.push(`Milestones: ${milestones.length}`);

  // 4. Content ideas
  const ideas = await Promise.all([
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'instagram',
        format: 'carousel',
        title: '5 cose che ho scritto di notte a Milano',
        hook: 'Le 3 di notte, la pioggia, il foglio. Ecco come nasce "Notte Storta".',
        status: 'draft',
        publishAt: new Date(Date.now() + 8 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'tiktok',
        format: 'tiktok',
        title: 'Teaser 15" del ritornello',
        hook: 'HO FINITO IL MIO EP e vi faccio sentire il ritornello per primi',
        status: 'approved',
        publishAt: new Date(Date.now() + 10 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'instagram',
        format: 'story',
        title: 'Sondaggio: traccia preferita?',
        hook: 'Quale traccia volete come singolo?',
        cta: 'Vota nel sondaggio',
        status: 'scheduled',
        publishAt: new Date(Date.now() + 14 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'youtube',
        format: 'short',
        title: 'Lyric video anteprima "Blu Notte"',
        hook: 'Testo + voce cruda, niente produzione',
        status: 'idea',
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        platform: 'newsletter',
        format: 'email',
        title: "Aggiornamento dall'anonimato al palco",
        hook: "Vi racconto cosa è successo negli ultimi 3 mesi e perché l'EP si chiama Notte Storta.",
        status: 'idea',
      },
    }),
  ]);
  log.push(`Content ideas: ${ideas.length}`);

  // 5. Metric snapshots (3 platforms × 3 dates)
  const metrics: string[] = [];
  const platforms = [
    { platform: 'instagram', start: 1820, stepFollowers: 35, startViews: 0 },
    { platform: 'tiktok', start: 940, stepFollowers: 60, startViews: 12000 },
    { platform: 'spotify', start: 230, stepFollowers: 12, startViews: 0 },
  ];
  for (const p of platforms) {
    for (let i = 0; i < 3; i++) {
      const snap = await prisma.metricSnapshot.create({
        data: {
          artistProfileId: artist.id,
          releaseId: release.id,
          platform: p.platform,
          date: new Date(Date.now() - (7 - i * 7) * 86400000),
          followers: p.start + i * p.stepFollowers,
          views: p.startViews + i * 1500,
          streams: p.platform === 'spotify' ? 1800 + i * 400 : 0,
          linkClicks: i * 12,
        },
      });
      metrics.push(snap.id);
    }
  }
  log.push(`Metric snapshots: ${metrics.length}`);

  // 6. Contacts
  const contactDefs = [
    { name: 'Veronica Conti', type: 'curator', email: 'veronica@playlistindie.it', instagram: '@veronicaconti', city: 'Milano', notes: 'Curatrice Indie Italia, risponde in 3-5 giorni. Pitch entro 15/06.', status: 'warm' },
    { name: 'Locale Circolo', type: 'venue', email: 'booking@circolo.it', city: 'Milano', notes: 'Programma venerdì e sabato, capienza 80.', status: 'active' },
    { name: 'Rumore Magazine', type: 'press', email: 'redazione@rumoremag.it', website: 'rumoremag.it', notes: 'Interessati a urban emergente, chiedono demo + bio.', status: 'new' },
    { name: 'Sara TikTok', type: 'influencer', tiktok: '@saratiktok', city: 'Roma', notes: '30K follower, fa recensioni rap urban.', status: 'active' },
    { name: 'Indie Label Collettivo', type: 'label', email: 'demo@indielabel.it', notes: 'Ricevono demo tutto l\'anno, risposta lenta.', status: 'cold' },
  ];
  const contacts = [];
  for (const c of contactDefs) {
    const created = await prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: c.name,
        type: c.type,
        email: c.email,
        instagram: c.instagram,
        tiktok: c.tiktok,
        website: c.website,
        city: c.city,
        notes: c.notes,
        status: c.status,
      },
    });
    contacts.push(created);
  }
  log.push(`Contacts: ${contacts.length}`);

  // 7. Outreach
  const outreach = [];
  outreach.push(
    await prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[0].id,
        channel: 'email',
        status: 'replied',
        message: 'Pitch iniziale con 2 tracce in anteprima + press kit.',
        lastContactAt: new Date(Date.now() - 4 * 86400000),
        nextFollowUpAt: new Date(Date.now() + 1 * 86400000),
      },
    }),
  );
  outreach.push(
    await prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[2].id,
        channel: 'email',
        status: 'contacted',
        message: 'Demo + bio inviati, in attesa di risposta.',
        lastContactAt: new Date(Date.now() - 6 * 86400000),
        nextFollowUpAt: new Date(Date.now() - 1 * 86400000),
      },
    }),
  );
  outreach.push(
    await prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[3].id,
        channel: 'instagram',
        status: 'to_contact',
        message: null,
        nextFollowUpAt: new Date(Date.now() + 3 * 86400000),
      },
    }),
  );
  log.push(`Outreach: ${outreach.length}`);

  // 8. Goals
  const goals = await Promise.all([
    prisma.goal.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        title: '500 fan email entro uscita EP',
        metric: 'fan_email_count',
        targetValue: 500,
        currentValue: 142,
        deadline: new Date(Date.now() + 21 * 86400000),
        status: 'active',
      },
    }),
    prisma.goal.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        title: '50K stream Spotify prime 4 settimane',
        metric: 'spotify_streams',
        targetValue: 50000,
        currentValue: 8200,
        deadline: new Date(Date.now() + 49 * 86400000),
        status: 'active',
      },
    }),
  ]);
  log.push(`Goals: ${goals.length}`);

  // 9. One task
  await prisma.task.create({
    data: {
      artistProfileId: artist.id,
      courseId: 'growth', // no specific course, growth-os workflow
      title: 'Inviare demo a Veronica Conti (curator Indie Italia)',
      description: 'Veronica ha risposto al primo pitch, vuole sentire la traccia 2.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 86400000),
      expectedOutput: 'Demo + press kit + link streaming',
    },
  });
  log.push('Task: 1 sample task');

  return NextResponse.json({
    ok: true,
    seeded: true,
    counts: {
      artists: 1,
      releases: 1,
      milestones: milestones.length,
      contentIdeas: ideas.length,
      metrics: metrics.length,
      contacts: contacts.length,
      outreach: outreach.length,
      goals: goals.length,
      tasks: 1,
    },
    log,
  });
}
