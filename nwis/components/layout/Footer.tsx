import { Droplets, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Droplets className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">NWIS</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-xs text-muted-foreground">Nearby Wells Intelligence System</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {year} Oil India Limited</span>
            <span>·</span>
            <span>v1.0.0-demo</span>
            <span>·</span>
            <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
              Admin <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
