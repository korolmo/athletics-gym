import { redirect } from "next/navigation";
import { isAuthed } from "@/modules/owner";
import { DEFAULT_CLUB } from "@/modules/club/client";
import { getClubOnce, logosFor } from "@/app/brand";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAuthed()) redirect("/admin");
  // Название и город — Клуба; база недоступна — начальные (форма входа сама скажет, что вход недоступен)
  const club = await getClubOnce().catch(() => DEFAULT_CLUB);
  return <LoginForm clubName={club.name} city={club.cityRu} logo={logosFor(club).club} />;
}
