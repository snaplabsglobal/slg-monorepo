-- [1] Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Set search path to ensure we can see the types
SET search_path = public, extensions;

-- [2] Add Geography Columns to Projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "location_point" geography(POINT), -- Project center coordinate
ADD COLUMN IF NOT EXISTS "geofence_radius" INTEGER DEFAULT 200; -- Sensing radius in meters

-- Create spatial index for performance
CREATE INDEX IF NOT EXISTS projects_location_idx ON public.projects USING GIST (location_point);

-- [3] Auto-Matching Function
CREATE OR REPLACE FUNCTION get_project_by_gps(lat float, lng float, p_org_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM public.projects
    WHERE org_id = p_org_id
    AND ST_DWithin(
      location_point, 
      ST_MakePoint(lng, lat)::geography, 
      geofence_radius
    )
    ORDER BY ST_Distance(location_point, ST_MakePoint(lng, lat)::geography)
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;
