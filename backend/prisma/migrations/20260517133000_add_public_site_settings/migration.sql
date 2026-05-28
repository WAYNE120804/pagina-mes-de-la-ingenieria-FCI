CREATE TABLE "site_settings" (
  "id" TEXT NOT NULL DEFAULT 'public',
  "brand_name" TEXT NOT NULL DEFAULT 'Mes de la Ingenieria',
  "hero_title" TEXT NOT NULL DEFAULT 'Innovacion que transforma el futuro.',
  "logo_url" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_settings" ("id", "brand_name", "hero_title", "updated_at")
VALUES ('public', 'Mes de la Ingenieria', 'Innovacion que transforma el futuro.', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
