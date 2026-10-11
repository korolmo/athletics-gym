import Link from "next/link";

/**
 * Ссылка меню: якорь на этой же странице («#prices») — обычная ссылка, адрес другой страницы («/ru#prices») — переход Next.
 * Нужна шапке и подвалу: на главной их ссылки — якоря, на юридических страницах те же ссылки ведут на главную.
 */
export function NavLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} prefetch={false} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
