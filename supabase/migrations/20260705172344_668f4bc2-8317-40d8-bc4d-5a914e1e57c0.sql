CREATE OR REPLACE FUNCTION public.clamp_elementor_container_width()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.elementor_container_width IS NULL THEN
    NEW.elementor_container_width := 0;
  ELSIF NEW.elementor_container_width <= 0 THEN
    NEW.elementor_container_width := 0;
  ELSIF NEW.elementor_container_width < 320 THEN
    NEW.elementor_container_width := 320;
  ELSIF NEW.elementor_container_width > 1920 THEN
    NEW.elementor_container_width := 1920;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clamp_elementor_container_width_trg ON public.workspaces;
CREATE TRIGGER clamp_elementor_container_width_trg
BEFORE INSERT OR UPDATE OF elementor_container_width ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.clamp_elementor_container_width();