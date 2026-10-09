import Image from "next/image";
import { notFound } from "next/navigation";
import { getGalleryPhoto } from "@/lib/services/photos";
import { DeleteGalleryPhotoButton, GalleryPhotoForm } from "../GalleryPhotoForm";

export const dynamic = "force-dynamic";

export default async function EditGalleryPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await getGalleryPhoto(id);
  if (!photo) notFound();

  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Фото Галереи</h1>

      {photo.url && (
        <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-card">
          <Image src={photo.url} alt={photo.captionRu ?? ""} fill sizes="(min-width: 768px) 720px, 100vw" className="object-contain" />
        </div>
      )}

      <GalleryPhotoForm
        photo={{ id: photo.id, captionRu: photo.captionRu, captionKk: photo.captionKk, isVisible: photo.isVisible }}
      />

      <div className="mt-8 border-t border-line pt-4">
        <DeleteGalleryPhotoButton id={photo.id} />
      </div>
    </>
  );
}
