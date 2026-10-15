-- Этап 4: Направления ведёт Владелец. Только добавление: старый код таблицу не читает и берёт Направления из словарей.

-- CreateTable
CREATE TABLE "Direction" (
    "id" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleKk" TEXT,
    "descriptionRu" TEXT,
    "descriptionKk" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'exercise',
    "photo" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Direction_sortOrder_idx" ON "Direction"("sortOrder");

-- Текущие Направления — те же пять, в том же порядке и с теми же иконками, что были в коде
-- (src/lib/domain/direction.defaults.ts; совпадение проверяет тест). После выкатки сайт не меняется.
INSERT INTO "Direction" ("id", "titleRu", "titleKk", "icon", "sortOrder")
VALUES
    ('dir_mass', 'Набор массы', 'Бұлшықет массасын жинау', 'exercise', 0),
    ('dir_weight_loss', 'Снижение веса', 'Салмақ тастау', 'weight', 1),
    ('dir_body_shape', 'Коррекция фигуры', 'Дене бітімін түзету', 'accessibility', 2),
    ('dir_powerlifting', 'Пауэрлифтинг', 'Пауэрлифтинг', 'barbell', 3),
    ('dir_boxing', 'Бокс', 'Бокс', 'boxing', 4)
ON CONFLICT ("id") DO NOTHING;
