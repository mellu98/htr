import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CloudOff, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Offline · Wave Up',
  description: 'Pagina mostrata quando Wave Up è offline.',
};

// Static, never dynamic — the SW serves this from cache when the network
// is down.
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border">
        <CloudOff className="h-9 w-9 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Sei offline
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Wave Up non riesce a raggiungere il server. Le pagine già aperte
          restano disponibili. Riapri questa pagina quando torni online.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="gradient" className="gap-2">
          <a href="/">
            <RefreshCw className="h-4 w-4" />
            Riprova
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/library">Vai alla libreria</Link>
        </Button>
      </div>
    </div>
  );
}
