import { LegalRoute, legalMetadata } from "@/components/site/legal/legal-route";

// Пользовательское соглашение. Страница статическая, как главная: сохранение Настроек сайта в админке сбрасывает её кэш
// (revalidateSite), час — запасной срок.
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: Props) {
  return legalMetadata("terms", params);
}

export default function TermsPage({ params }: Props) {
  return <LegalRoute page="terms" params={params} />;
}
