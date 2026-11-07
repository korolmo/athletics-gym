import { redirect } from "next/navigation";
import { isAuthed } from "@/modules/owner";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAuthed()) redirect("/admin");
  return <LoginForm />;
}
