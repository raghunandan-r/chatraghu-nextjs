import Terminal from '@/components/terminal';

export default function Page() {
  const start = new Date('2013-08-13T00:00:00Z');
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.2425) - 2.5;
  const yearsSince2013 = years.toFixed(1);
  return <Terminal yearsSince2013={yearsSince2013} />;
}
