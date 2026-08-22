CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_service_only" ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  tool text,
  storage_path text NOT NULL,
  width integer,
  height integer,
  bytes integer,
  tags text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_items_user_idx ON public.gallery_items (user_id, created_at DESC);
CREATE INDEX gallery_items_public_idx ON public.gallery_items (is_public, created_at DESC);

GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON public.gallery_items FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "gallery_service_all" ON public.gallery_items FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER gallery_items_updated_at BEFORE UPDATE ON public.gallery_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  max_views integer,
  views integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX share_links_item_idx ON public.share_links (item_id);
GRANT ALL ON public.share_links TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_links_service_only" ON public.share_links FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (subject, bucket, window_start)
);
CREATE INDEX rate_limits_window_idx ON public.rate_limits (window_start);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_service_only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.bump_rate_limit(_subject text, _bucket text, _window_seconds integer, _limit integer)
RETURNS TABLE (allowed boolean, current_count integer, reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  c integer;
BEGIN
  INSERT INTO public.rate_limits (subject, bucket, window_start, count)
  VALUES (_subject, _bucket, w, 1)
  ON CONFLICT (subject, bucket, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING public.rate_limits.count INTO c;

  RETURN QUERY SELECT (c <= _limit), c, w + make_interval(secs => _window_seconds);
END;
$$;

CREATE POLICY "gallery_bucket_service_all" ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'gallery') WITH CHECK (bucket_id = 'gallery');