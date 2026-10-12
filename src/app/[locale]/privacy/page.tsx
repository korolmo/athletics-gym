import { LegalRoute, legalMetadata } from "@/components/site/legal/legal-route";

// Политика конфиденциальности. Страница статическая, как главная: сохранение Настроек сайта в админке сбрасывает её кэш
// (revalidateSite), час — запасной срок.
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: Props) {
  return legalMetadata("privacy", params);
}

export default function PrivacyPage({ params }: Props) {
  return <LegalRoute page="privacy" params={params} />;
}
