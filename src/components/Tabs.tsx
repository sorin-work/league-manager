import Link from 'next/link';

interface Props {
  tabs: { id: string; label: string }[];
  active: string;
  href: (id: string) => string;
}

export function Tabs({ tabs, active, href }: Props) {
  return (
    <nav className="tabs" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={href(t.id)}
          className={t.id === active ? 'tab active' : 'tab'}
          aria-current={t.id === active ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
