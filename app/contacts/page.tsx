import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listContacts, listOutreach } from '@/lib/db/crm-queries';
import { ContactsPanel } from '@/components/contacts/ContactsPanel';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const artist = await getActiveArtist();
  const contacts = artist ? await listContacts({ artistProfileId: artist.id }) : [];
  const outreach = artist ? await listOutreach({ artistProfileId: artist.id }) : [];

  const normalizedContacts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    email: c.email,
    instagram: c.instagram,
    tiktok: c.tiktok,
    city: c.city,
    notes: c.notes,
    status: c.status,
    artistProfileId: c.artistProfileId,
  }));

  const normalizedOutreach = outreach.map((o) => ({
    id: o.id,
    contactId: o.contactId,
    contactName: (o as any).contact?.name ?? 'Contatto rimosso',
    channel: o.channel,
    status: o.status,
    message: o.message,
    nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null,
    lastContactAt: o.lastContactAt?.toISOString() ?? null,
  }));

  return (
    <ContactsPanel
      activeArtist={artist ? { id: artist.id, artistName: artist.artistName } : null}
      contacts={normalizedContacts as any}
      outreach={normalizedOutreach as any}
    />
  );
}