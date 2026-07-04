-- Add normalized project name for database-level duplicate protection.
ALTER TABLE "Project" ADD COLUMN "normalizedName" TEXT;

-- Backfill existing projects. If old duplicate names already exist, keep the
-- first one as the canonical normalized name and suffix the rest by id so the
-- unique index can be created without deleting user data.
WITH normalized_projects AS (
    SELECT
        "id",
        LOWER(BTRIM("name")) AS "baseName",
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(BTRIM("name"))
            ORDER BY "createdAt", "id"
        ) AS "duplicateIndex"
    FROM "Project"
)
UPDATE "Project" AS "project"
SET "normalizedName" = CASE
    WHEN normalized_projects."baseName" = '' THEN "project"."id"
    WHEN normalized_projects."duplicateIndex" = 1 THEN normalized_projects."baseName"
    ELSE normalized_projects."baseName" || '-' || "project"."id"
END
FROM normalized_projects
WHERE "project"."id" = normalized_projects."id";

ALTER TABLE "Project" ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE UNIQUE INDEX "Project_normalizedName_key" ON "Project"("normalizedName");
