import Image from "next/image";
import { site } from "@/lib/site";
import { container, label, sectionY } from "@/components/ui/styles";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";

// Галерея (фото из макета — сгенерированы, поэтому с пометкой «ДЕМО»)
export function Gallery({ t }: SectionProps) {
  const tiles = [
    { src: "/stitch/gallery-cardio.jpg", span: "md:col-span-8", sizes: "(min-width: 768px) 820px, 100vw", item: t.about.items[2] },
    { src: "/stitch/gallery-weights-crop.jpg", span: "md:col-span-4", sizes: "(min-width: 768px) 400px, 100vw", item: t.about.items[0] },
  ];
  return (
    <section id="gallery" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.gallery}
          title={t.gallery.title}
          badge={<DemoBadge label={t.gallery.demo} />}
          aside={
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <div className="flex flex-col">
                <span className={`${label} text-text-primary`}>{site.name}</span>
                <span className="text-body-sm text-text-muted">{t.contacts.city}</span>
              </div>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {tiles.map((tile) => (
            <div key={tile.src} className={`group relative h-[240px] overflow-hidden rounded-2xl md:h-[340px] ${tile.span}`}>
              <Image
                src={tile.src}
                alt=""
                fill
                sizes={tile.sizes}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5">
                <span className={`${label} text-primary-container`}>{tile.item.title}</span>
                <div className="text-headline-sm text-text-primary">{tile.item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
