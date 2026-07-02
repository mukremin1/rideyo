-- Allowed service regions: il / ilçe / mahalle / bölge hierarchy.
-- Cars can only be placed in admin-approved areas when at least one region is active.

CREATE TYPE public.region_level AS ENUM ('bolge', 'il', 'ilce', 'mahalle');

CREATE TABLE IF NOT EXISTS public.allowed_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.allowed_regions(id) ON DELETE CASCADE,
  level public.region_level NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  boundaries JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS allowed_regions_il_name_unique
  ON public.allowed_regions (lower(name))
  WHERE level = 'il' AND parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS allowed_regions_child_unique
  ON public.allowed_regions (parent_id, level, lower(name))
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_allowed_regions_parent ON public.allowed_regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_allowed_regions_level ON public.allowed_regions(level, is_active);

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS allowed_region_id UUID REFERENCES public.allowed_regions(id);

CREATE INDEX IF NOT EXISTS idx_cars_allowed_region ON public.cars(allowed_region_id);
CREATE INDEX IF NOT EXISTS idx_cars_district ON public.cars(city, district);

ALTER TABLE public.allowed_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active allowed regions"
  ON public.allowed_regions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all allowed regions"
  ON public.allowed_regions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert allowed regions"
  ON public.allowed_regions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update allowed regions"
  ON public.allowed_regions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete allowed regions"
  ON public.allowed_regions
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_car_allowed_region()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.allowed_regions
  WHERE is_active = true;

  IF active_count = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.allowed_region_id IS NULL THEN
    RAISE EXCEPTION 'LOCATION_NOT_ALLOWED'
      USING HINT = 'Car must be placed inside an approved service region';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.allowed_regions ar
    WHERE ar.id = NEW.allowed_region_id
      AND ar.is_active = true
  ) THEN
    RAISE EXCEPTION 'LOCATION_NOT_ALLOWED'
      USING HINT = 'Matched region is inactive or missing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cars_validate_allowed_region ON public.cars;
CREATE TRIGGER cars_validate_allowed_region
  BEFORE INSERT OR UPDATE OF latitude, longitude, city, district, neighborhood, allowed_region_id
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_car_allowed_region();

-- Default Trabzon service area (admin can extend with mahalle / deactivate)
DO $$
DECLARE
  trabzon_id UUID;
BEGIN
  INSERT INTO public.allowed_regions (level, name, description, is_active, sort_order)
  SELECT 'il'::public.region_level, 'Trabzon', 'Trabzon ili — araç bırakılabilir il', true, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM public.allowed_regions WHERE level = 'il'::public.region_level AND lower(name) = 'trabzon'
  );

  SELECT id INTO trabzon_id
  FROM public.allowed_regions
  WHERE level = 'il'::public.region_level AND lower(name) = 'trabzon'
  LIMIT 1;

  IF trabzon_id IS NOT NULL THEN
    INSERT INTO public.allowed_regions (parent_id, level, name, description, is_active, sort_order, boundaries)
    SELECT trabzon_id, v.level, v.name, v.description, v.is_active, v.sort_order, v.boundaries::jsonb
    FROM (VALUES
      ('ilce'::public.region_level, 'Ortahisar', 'Trabzon merkez / Ortahisar', true, 1, NULL::text),
      ('ilce'::public.region_level, 'Akçaabat', 'Akçaabat ilçesi', true, 2, NULL::text),
      ('ilce'::public.region_level, 'Yomra', 'Yomra ilçesi', true, 3, NULL::text),
      ('bolge'::public.region_level, 'KTÜ Kampüs', 'KTÜ ve çevresi', true, 10,
        '{"type":"Polygon","coordinates":[[[39.7600,40.9700],[39.7900,40.9700],[39.7900,40.9900],[39.7600,40.9900],[39.7600,40.9700]]]}'::text)
    ) AS v(level, name, description, is_active, sort_order, boundaries)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.allowed_regions ar
      WHERE ar.parent_id = trabzon_id AND lower(ar.name) = lower(v.name)
    );
  END IF;
END $$;
