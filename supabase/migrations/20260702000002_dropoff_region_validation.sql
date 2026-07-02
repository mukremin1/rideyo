-- GPS tracking updates lat/lng frequently; only enforce regions on insert
-- and when parking metadata (allowed_region_id, city, district, neighborhood) changes.

DROP TRIGGER IF EXISTS cars_validate_allowed_region ON public.cars;

CREATE TRIGGER cars_validate_allowed_region
  BEFORE INSERT OR UPDATE OF city, district, neighborhood, allowed_region_id
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_car_allowed_region();

-- Drop-off must land in an approved region when restrictions are active.
CREATE OR REPLACE FUNCTION public.validate_dropoff_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_city TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
  region_row RECORD;
  il_match UUID;
  ilce_match UUID;
  mahalle_match UUID;
  ilce_children INT;
  mahalle_children INT;
  display_text TEXT;
BEGIN
  SELECT COUNT(*) INTO active_count FROM allowed_regions WHERE is_active = true;

  IF active_count = 0 THEN
    RETURN jsonb_build_object('allowed', true, 'strict_mode', false, 'region_id', NULL);
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'strict_mode', true,
      'reason', 'missing_coordinates'
    );
  END IF;

  display_text := lower(coalesce(p_city, '') || ' ' || coalesce(p_district, '') || ' ' || coalesce(p_neighborhood, ''));

  -- Bölge polygons (GeoJSON: coordinates are [lng, lat])
  FOR region_row IN
    SELECT id, name, boundaries
    FROM allowed_regions
    WHERE is_active = true AND level = 'bolge' AND boundaries IS NOT NULL
  LOOP
    IF public.point_in_geojson_polygon(p_latitude, p_longitude, region_row.boundaries) THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'strict_mode', true,
        'region_id', region_row.id,
        'matched_name', region_row.name
      );
    END IF;
  END LOOP;

  -- İl
  SELECT ar.id INTO il_match
  FROM allowed_regions ar
  WHERE ar.is_active = true
    AND ar.level = 'il'
    AND (
      public.region_names_match(ar.name, coalesce(p_city, ''))
      OR public.region_names_match(ar.name, display_text)
    )
  LIMIT 1;

  IF il_match IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'strict_mode', true, 'reason', 'il_not_allowed');
  END IF;

  SELECT COUNT(*) INTO ilce_children
  FROM allowed_regions
  WHERE is_active = true AND level = 'ilce' AND parent_id = il_match;

  IF ilce_children = 0 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'strict_mode', true,
      'region_id', il_match,
      'matched_name', (SELECT name FROM allowed_regions WHERE id = il_match)
    );
  END IF;

  SELECT ar.id INTO ilce_match
  FROM allowed_regions ar
  WHERE ar.is_active = true
    AND ar.level = 'ilce'
    AND ar.parent_id = il_match
    AND (
      public.region_names_match(ar.name, coalesce(p_district, ''))
      OR public.region_names_match(ar.name, display_text)
    )
  LIMIT 1;

  IF ilce_match IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'strict_mode', true, 'reason', 'ilce_not_allowed');
  END IF;

  SELECT COUNT(*) INTO mahalle_children
  FROM allowed_regions
  WHERE is_active = true AND level = 'mahalle' AND parent_id = ilce_match;

  IF mahalle_children = 0 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'strict_mode', true,
      'region_id', ilce_match,
      'matched_name', (
        SELECT il.name || ' / ' || ic.name
        FROM allowed_regions il, allowed_regions ic
        WHERE il.id = il_match AND ic.id = ilce_match
      )
    );
  END IF;

  SELECT ar.id INTO mahalle_match
  FROM allowed_regions ar
  WHERE ar.is_active = true
    AND ar.level = 'mahalle'
    AND ar.parent_id = ilce_match
    AND (
      public.region_names_match(ar.name, coalesce(p_neighborhood, ''))
      OR public.region_names_match(ar.name, display_text)
    )
  LIMIT 1;

  IF mahalle_match IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'strict_mode', true, 'reason', 'mahalle_not_allowed');
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'strict_mode', true,
    'region_id', mahalle_match,
    'matched_name', (
      SELECT il.name || ' / ' || ic.name || ' / ' || m.name
      FROM allowed_regions il, allowed_regions ic, allowed_regions m
      WHERE il.id = il_match AND ic.id = ilce_match AND m.id = mahalle_match
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.region_names_match(a TEXT, b TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    length(trim(coalesce(a, ''))) > 0
    AND length(trim(coalesce(b, ''))) > 0
    AND (
      lower(trim(a)) = lower(trim(b))
      OR position(lower(trim(a)) in lower(trim(b))) > 0
      OR position(lower(trim(b)) in lower(trim(a))) > 0
    );
$$;

CREATE OR REPLACE FUNCTION public.point_in_geojson_polygon(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_geojson JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ring JSONB;
  i INT;
  j INT;
  n INT;
  xi DOUBLE PRECISION;
  yi DOUBLE PRECISION;
  xj DOUBLE PRECISION;
  yj DOUBLE PRECISION;
  inside BOOLEAN := false;
BEGIN
  IF p_geojson IS NULL OR p_geojson->>'type' IS DISTINCT FROM 'Polygon' THEN
    RETURN false;
  END IF;

  ring := p_geojson->'coordinates'->0;
  IF ring IS NULL THEN
    RETURN false;
  END IF;

  n := jsonb_array_length(ring);
  IF n < 4 THEN
    RETURN false;
  END IF;

  FOR i IN 0..(n - 1) LOOP
    j := CASE WHEN i = 0 THEN n - 1 ELSE i - 1 END;
    xi := (ring->i->>0)::double precision;
    yi := (ring->i->>1)::double precision;
    xj := (ring->j->>0)::double precision;
    yj := (ring->j->>1)::double precision;

    IF (yi > p_lat) <> (yj > p_lat)
       AND p_lng < ((xj - xi) * (p_lat - yi) / NULLIF(yj - yi, 0)) + xi THEN
      inside := NOT inside;
    END IF;
  END LOOP;

  RETURN inside;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_dropoff_location TO authenticated, service_role;
