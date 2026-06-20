import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      {/*
        pb-[calc(6rem+env(safe-area-inset-bottom))] ensures the page content
        clears the fixed BottomNav (which is ~4rem tall plus safe-area padding)
        on mobile. Desktop restores pb-12 since the BottomNav is hidden there.
      */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-[calc(6rem+var(--safe-bottom))] md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
