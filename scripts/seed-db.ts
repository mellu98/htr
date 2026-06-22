/**
 * Bootstrap + demo seed.
 *
 *   npm run db:push   # creates schema
 *   npm run db:seed   # seeds singleton settings + demo artist + release data
 *
 * The script is idempotent for the singleton, but the demo dataset is
 * only inserted if there is no artist yet (so re-running does not duplicate).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Singleton AppSettings ────────────────────────────────────────────────
  const existingSettings = await prisma.appSettings.findUnique({
    where: { id: 'singleton' },
  });
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: { id: 'singleton', theme: 'dark' },
    });
    console.log('✓ Created AppSettings singleton (theme=dark)');
  } else {
    console.log('✓ AppSettings singleton already present');
  }

  // ── Demo dataset ─────────────────────────────────────────────────────────
  const existingArtists = await prisma.artistProfile.count();
  if (existingArtists > 0) {
    console.log('✓ Demo dataset already present (artists found), skipping');
    return;
  }

  console.log('→ Seeding demo dataset (Luna Rossa / Notte Storta)…');

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
      nextCallAt: new Date(Date.now() + 5 * 86400000), // 5 days
      notes: 'Lavora meglio la sera tardi. Sensibile al feedback visivo (cover, colori).',
    },
  });
  console.log(`  ✓ Artist: ${artist.artistName}`);

  await prisma.appSettings.update({
    where: { id: 'singleton' },
    data: { activeArtistId: artist.id },
  });

  // 2. Release
  const release = await prisma.release.create({
    data: {
      artistProfileId: artist.id,
      title: 'Notte Storta',
      type: 'ep',
      status: 'pre_release',
      releaseDate: new Date(Date.now() + 21 * 86400000), // 21 days
      mainGoal: '500 fan email + 2.000 stream prima dell\'uscita',
      budget: 800,
      platforms: JSON.stringify(['spotify', 'instagram', 'tiktok', 'youtube']),
      notes: 'EP di 5 tracce. Concept: notti insonni a Milano post-lockdown.',
    },
  });
  console.log(`  ✓ Release: ${release.title} (${release.type})`);

  // 3. Milestones
  const milestones = await Promise.all([
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Cover artwork approvata',
        description: '3 proposte da graphic designer, scelta finale con manager.',
        dueDate: new Date(Date.now() + 3 * 86400000),
        status: 'in_progress',
        priority: 'high',
      },
    }),
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Pitch a 10 playlist curator',
        description: 'Lista curator italiani urban, demo + press kit.',
        dueDate: new Date(Date.now() + 10 * 86400000),
        status: 'todo',
        priority: 'high',
      },
    }),
    prisma.releaseMilestone.create({
      data: {
        releaseId: release.id,
        title: 'Pre-save link attivo + newsletter annuncio',
        description: 'Link pre-save su ToneDen o feature.fm, email a lista esistente.',
        dueDate: new Date(Date.now() + 14 * 86400000),
        status: 'todo',
        priority: 'urgent',
      },
    }),
  ]);
  console.log(`  ✓ Milestones: ${milestones.length}`);

  // 4. Content ideas (5)
  const ideas = await Promise.all([
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'instagram',
        format: 'reel',
        title: 'Storytelling: come ho scritto "Notte Storta" in 3 minuti',
        hook: 'Erano le 2 di notte, avevo cancellato tutto. Poi è successa una cosa.',
        cta: 'Segui per la parte 2',
        status: 'approved',
        publishAt: new Date(Date.now() + 2 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'tiktok',
        format: 'short',
        title: '30 sec del drop migliore dell\'EP',
        hook: 'Questo drop cambia tutto. Ascolta con le cuffie.',
        cta: 'Pre-save il link in bio',
        status: 'draft',
        publishAt: new Date(Date.now() + 7 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'instagram',
        format: 'carousel',
        title: '5 slide dietro le quinte della produzione',
        hook: '5 cose che non ti aspetti su come è stato registrato Notte Storta.',
        cta: 'Salva per non dimenticare',
        status: 'idea',
        publishAt: new Date(Date.now() + 10 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'newsletter',
        format: 'email',
        title: 'Annuncio ufficiale EP + early access',
        hook: 'È il momento. "Notte Storta" esce tra 21 giorni.',
        cta: 'Iscriviti per il link privato',
        status: 'idea',
        publishAt: new Date(Date.now() + 12 * 86400000),
      },
    }),
    prisma.contentIdea.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        platform: 'tiktok',
        format: 'live',
        title: 'Mini-live di 15 min prima dell\'uscita',
        hook: 'Suono 2 tracce inedite e rispondo alle vostre domande.',
        cta: 'Attiva il promemoria',
        status: 'idea',
        publishAt: new Date(Date.now() + 19 * 86400000),
      },
    }),
  ]);
  console.log(`  ✓ Content ideas: ${ideas.length}`);

  // 5. Metric snapshots (3)
  const metric = (platform: string, daysAgo: number, data: any) =>
    prisma.metricSnapshot.create({
      data: {
        artistProfileId: artist.id,
        platform,
        date: new Date(Date.now() - daysAgo * 86400000),
        ...data,
      },
    });

  await Promise.all([
    metric('instagram', 14, { followers: 1820, views: 4200, likes: 380, comments: 42, linkClicks: 18 }),
    metric('instagram', 7, { followers: 1910, views: 5100, likes: 470, comments: 56, linkClicks: 31 }),
    metric('instagram', 0, { followers: 2030, views: 6300, likes: 580, comments: 71, linkClicks: 47 }),
    metric('spotify', 14, { streams: 1200, monthlyListeners: 850 }),
    metric('spotify', 7, { streams: 1750, monthlyListeners: 980 }),
    metric('spotify', 0, { streams: 2400, monthlyListeners: 1180 }),
    metric('tiktok', 14, { views: 9800, likes: 1100, comments: 89, shares: 45, saves: 220 }),
    metric('tiktok', 7, { views: 14200, likes: 1700, comments: 132, shares: 78, saves: 380 }),
    metric('tiktok', 0, { views: 19500, likes: 2300, comments: 198, shares: 110, saves: 540 }),
  ]);
  console.log('  ✓ Metric snapshots: 9 (3 platform × 3 date)');

  // 6. Contacts (5)
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: 'Indie Urban Italia (playlist)',
        type: 'curator',
        instagram: '@indieurbanita',
        email: 'submit@indieurbanita.it',
        city: 'Milano',
        notes: '30k follower. Accetta demo ogni venerdì.',
        status: 'warm',
      },
    }),
    prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: 'Circolo Arci Bellezza',
        type: 'venue',
        city: 'Milano',
        email: 'booking@arcibellezza.it',
        notes: 'Programmazione ogni 2 mesi. 80-150 cap.',
        status: 'active',
      },
    }),
    prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: 'Rockit (rivista)',
        type: 'press',
        email: 'redazione@rockit.it',
        website: 'https://rockit.it',
        notes: 'Interessati a urban emergente italiano. Rispondono in 1-2 settimane.',
        status: 'new',
      },
    }),
    prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: 'Giulia Marelli',
        type: 'influencer',
        instagram: '@giulia_marelli',
        notes: 'TikToker musica urban, 45k follower. Recensisce dischi.',
        status: 'warm',
      },
    }),
    prisma.contact.create({
      data: {
        artistProfileId: artist.id,
        name: 'Sara Bianchi (fan)',
        type: 'fan',
        email: 'sara.b@gmail.com',
        notes: 'Prima fan email arrivata. Coinvolta, attiva, ascolta tutti i reel.',
        status: 'new',
      },
    }),
  ]);
  console.log(`  ✓ Contacts: ${contacts.length}`);

  // 7. Outreach (3)
  const outreach = await Promise.all([
    prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[0].id,
        channel: 'instagram',
        status: 'contacted',
        message: 'DM inviato con press kit + 2 tracce demo. Aspetto risposta.',
        lastContactAt: new Date(Date.now() - 4 * 86400000),
        nextFollowUpAt: new Date(Date.now() + 3 * 86400000),
      },
    }),
    prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[1].id,
        channel: 'email',
        status: 'to_contact',
        message: 'Email da scrivere: pitch per apertura concerto di fine mese.',
        nextFollowUpAt: new Date(Date.now() + 1 * 86400000),
      },
    }),
    prisma.outreach.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        contactId: contacts[3].id,
        channel: 'instagram',
        status: 'replied',
        message: 'Ha risposto: "Mi piace, ti ricontatto quando ho slot".',
        lastContactAt: new Date(Date.now() - 2 * 86400000),
        nextFollowUpAt: new Date(Date.now() + 7 * 86400000),
      },
    }),
  ]);
  console.log(`  ✓ Outreach: ${outreach.length}`);

  // 8. Goals (2)
  const goals = await Promise.all([
    prisma.goal.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        title: 'Raccogliere 100 fan email entro 30 giorni',
        metric: 'emails',
        targetValue: 100,
        currentValue: 23,
        deadline: new Date(Date.now() + 30 * 86400000),
        status: 'active',
      },
    }),
    prisma.goal.create({
      data: {
        artistProfileId: artist.id,
        releaseId: release.id,
        title: '2.000 stream prima dell\'uscita',
        metric: 'streams',
        targetValue: 2000,
        currentValue: 4150,
        deadline: new Date(Date.now() + 21 * 86400000),
        status: 'achieved',
      },
    }),
  ]);
  console.log(`  ✓ Goals: ${goals.length}`);

  // 9. A starter task so the dashboard isn't empty
  await prisma.task.create({
    data: {
      artistProfileId: artist.id,
      courseId: 'htr-training',
      title: 'Finalizzare tracklist "Notte Storta"',
      description: 'Confermare ordine 5 tracce, titoli e durate. Consegnare al manager.',
      priority: 'urgent',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 2 * 86400000),
      expectedOutput: 'PDF tracklist con testi approvati.',
    },
  });
  console.log('  ✓ Task demo: 1');

  console.log('\n✅ Demo dataset pronto. Apri http://localhost:3000 per esplorare.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });