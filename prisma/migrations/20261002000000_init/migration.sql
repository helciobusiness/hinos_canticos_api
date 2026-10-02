-- CreateExtension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateTable
CREATE TABLE IF NOT EXISTS "hinos" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT,
    "letra_completa" TEXT NOT NULL,
    "fonte_arquivo" TEXT,
    "source_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hino_estrofes" (
    "id" SERIAL NOT NULL,
    "hino_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'estrofe',
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hino_estrofes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hinos_numero_key" ON "hinos"("numero");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hinos_numero_idx" ON "hinos"("numero");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hinos_titulo_idx" ON "hinos"("titulo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hinos_autor_idx" ON "hinos"("autor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hino_estrofes_hino_id_idx" ON "hino_estrofes"("hino_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hino_estrofes_tipo_idx" ON "hino_estrofes"("tipo");

-- AddForeignKey
ALTER TABLE "hino_estrofes" DROP CONSTRAINT IF EXISTS "hino_estrofes_hino_id_fkey";
ALTER TABLE "hino_estrofes" ADD CONSTRAINT "hino_estrofes_hino_id_fkey" FOREIGN KEY ("hino_id") REFERENCES "hinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
