import clsx from 'clsx';

export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        'w-full space-y-6 rounded-xl bg-white/5 p-6 sm:p-10',
        className,
      )}
    >
      {children}
    </section>
  );
}
