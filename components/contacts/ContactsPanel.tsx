'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  type: string;
  email: string | null;
  instagram: string | null;
  tiktok: string | null;
  city: string | null;
  notes: string | null;
  status: string;
  artistProfileId: string | null;
}

interface Outreach {
  id: string;
  contactId: string;
  contactName: string;
  channel: string;
  status: string;
  message: string | null;
  nextFollowUpAt: string | null;
  lastContactAt: string | null;
}

const TYPES = ['curator', 'venue', 'press', 'influencer', 'label', 'artist', 'fan', 'sponsor', 'other'];
const STATUSES = ['new', 'active', 'warm', 'cold', 'archived'];
const CHANNELS = ['email', 'instagram', 'tiktok', 'whatsapp', 'phone', 'other'];
const OUTREACH_STATUSES = ['to_contact', 'contacted', 'replied', 'interested', 'rejected', 'closed'];

const TYPE_LABEL: Record<string, string> = {
  curator: 'Curator',
  venue: 'Venue',
  press: 'Press',
  influencer: 'Influencer',
  label: 'Label',
  artist: 'Artista',
  fan: 'Fan',
  sponsor: 'Sponsor',
  other: 'Altro',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Nuovo',
  active: 'Attivo',
  warm: 'Caldo',
  cold: 'Freddo',
  archived: 'Archiviato',
  to_contact: 'Da contattare',
  contacted: 'Contattato',
  replied: 'Risposto',
  interested: 'Interessato',
  rejected: 'Rifiutato',
  closed: 'Chiuso',
};

export function ContactsPanel({
  activeArtist,
  contacts,
  outreach,
}: {
  activeArtist: { id: string; artistName: string } | null;
  contacts: Contact[];
  outreach: Outreach[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [addingOutreachFor, setAddingOutreachFor] = useState<string | null>(null);

  if (!activeArtist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessun artista attivo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Crea prima il profilo artista.
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData) {
    const payload = {
      artistProfileId: activeArtist!.id,
      name: String(formData.get('name') ?? '').trim(),
      type: String(formData.get('type') ?? 'other'),
      email: formData.get('email') || null,
      instagram: formData.get('instagram') || null,
      tiktok: formData.get('tiktok') || null,
      city: formData.get('city') || null,
      notes: formData.get('notes') || null,
      status: 'new',
    };
    if (!payload.name) return;
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    router.refresh();
  }

  async function addOutreach(contactId: string, formData: FormData) {
    const payload = {
      artistProfileId: activeArtist!.id,
      contactId,
      channel: String(formData.get('channel') ?? 'email'),
      status: 'to_contact',
      message: formData.get('message') || null,
      nextFollowUpAt: formData.get('nextFollowUpAt') || null,
    };
    await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setAddingOutreachFor(null);
    router.refresh();
  }

  async function setContactStatus(id: string, status: string) {
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function setOutreachStatus(id: string, status: string) {
    await fetch(`/api/outreach/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeContact(id: string) {
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Contatti da seguire
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mini CRM per curator, venue, press, influencer, fan importanti.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nuovo contatto
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuovo contatto</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(new FormData(e.currentTarget));
              }}
              className="grid gap-3 md:grid-cols-2"
            >
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Nome *</span>
                <input
                  name="name"
                  required
                  placeholder="Es. Playlist curator urban italiano"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Tipo</span>
                <select
                  name="type"
                  defaultValue="curator"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Città</span>
                <input
                  name="city"
                  placeholder="Milano"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  name="email"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Instagram</span>
                <input
                  name="instagram"
                  placeholder="@handle"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Note</span>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Perché ti interessa, link utili, note varie."
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Annulla
                </Button>
                <Button type="submit" variant="gradient">
                  Salva
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {contacts.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nessun contatto. Il primo è quello che ti cambia il mese.
          </CardContent>
        </Card>
      )}

      {contacts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rubrica
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => {
              const contactOutreach = outreach.filter((o) => o.contactId === c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {TYPE_LABEL[c.type] ?? c.type}
                        </p>
                        <h3 className="truncate font-semibold">{c.name}</h3>
                        {c.city && (
                          <p className="text-xs text-muted-foreground">{c.city}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-xs">
                      {c.email && (
                        <p className="text-muted-foreground">
                          <span className="text-foreground/60">email:</span> {c.email}
                        </p>
                      )}
                      {c.instagram && (
                        <p className="text-muted-foreground">
                          <span className="text-foreground/60">ig:</span> {c.instagram}
                        </p>
                      )}
                    </div>
                    {c.notes && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{c.notes}</p>
                    )}

                    {contactOutreach.length > 0 && (
                      <ul className="mt-1 space-y-1 border-t border-border/40 pt-2">
                        {contactOutreach.map((o) => (
                          <li
                            key={o.id}
                            className="flex flex-wrap items-center justify-between gap-1 text-[11px]"
                          >
                            <span className="flex items-center gap-1">
                              <Send className="h-2.5 w-2.5 text-muted-foreground" />
                              {o.channel}
                            </span>
                            <select
                              value={o.status}
                              onChange={(e) => setOutreachStatus(o.id, e.target.value)}
                              className="rounded-md border border-border bg-background/60 px-1 py-0.5 text-[10px]"
                            >
                              {OUTREACH_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            {o.nextFollowUpAt && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                follow-up {new Date(o.nextFollowUpAt).toLocaleDateString('it-IT')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2">
                      <select
                        value={c.status}
                        onChange={(e) => setContactStatus(c.id, e.target.value)}
                        className="rounded-md border border-border bg-background/60 px-1 py-0.5 text-[10px]"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingOutreachFor(c.id)}
                      >
                        + outreach
                      </Button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>

                    {addingOutreachFor === c.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addOutreach(c.id, new FormData(e.currentTarget));
                        }}
                        className="space-y-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs"
                      >
                        <select
                          name="channel"
                          defaultValue="email"
                          className="w-full rounded-md border border-border bg-background/60 px-2 py-1"
                        >
                          {CHANNELS.map((ch) => (
                            <option key={ch} value={ch}>
                              {ch}
                            </option>
                          ))}
                        </select>
                        <textarea
                          name="message"
                          rows={2}
                          placeholder="Messaggio o appunti"
                          className="w-full rounded-md border border-border bg-background/60 px-2 py-1"
                        />
                        <input
                          type="date"
                          name="nextFollowUpAt"
                          className="w-full rounded-md border border-border bg-background/60 px-2 py-1"
                        />
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setAddingOutreachFor(null)}
                          >
                            Annulla
                          </Button>
                          <Button type="submit" size="sm" variant="gradient">
                            Salva
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}