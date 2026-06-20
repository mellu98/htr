import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border">
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Pagina non trovata</span>
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          La lezione o la risorsa richiesta non esiste. Verifica lo slug o torna alla dashboard.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="gradient">
          <Link href="/">
            <Home className="h-4 w-4" />
            Torna alla dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/library">Libreria</Link>
        </Button>
      </div>
    </div>
  );
}
