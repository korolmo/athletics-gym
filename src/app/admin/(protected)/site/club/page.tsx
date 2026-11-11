import Link from "next/link";
import { getClubForEdit } from "@/modules/club";
import { mediaUrl } from "@/modules/photos";
import { logoSource } from "@/modules/club/client";
import { PageHead } from "../../../ui";
import { ClubForm } from "../SettingsForms";
import { PhotoSlot } from "../../photos/PhotoSlot";

// Форма «Клуб» раздела «Сайт» (этап П1, решение 13): бренд, город, цвет, логотип, 2ГИС и точка на карте.
// Без макета Stitch — из элементов формы раздела «Сайт». Фото логотипа — своим местом «logo», как фото сайта.
export const dynamic = "force-dynamic";

export default async function ClubSettingsPage() {
  const club = await getClubForEdit();
  const src = logoSource(club.logo);
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">
        <Link href="/admin/site" className="hover:text-accent">
          Сайт
        </Link>{" "}
        / <span className="text-accent">Клуб</span>
      </p>
      <PageHead title="Клуб" subtitle="Название, город, цвет и логотип — на всём сайте, в кабинете и в админке." />
      <ClubForm c={club} />
      <div className="mt-6">
        <PhotoSlot
          target="logo"
          title="Фото логотипа"
          note="Квадратное, логотип по центру. Загруженное фото сразу становится логотипом; удалите его — будет монограмма."
          url={src.kind === "photo" ? mediaUrl(src.path) : null}
          shape="wide"
          emptyNote="Не загружено — логотип выбирается в форме выше"
        />
      </div>
    </div>
  );
}
