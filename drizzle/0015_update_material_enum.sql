-- Rename existing enum values for material
ALTER TYPE "material" RENAME VALUE 'gloss' TO 'gloss/matte';
ALTER TYPE "material" RENAME VALUE 'matte' TO 'gloss/primer';
