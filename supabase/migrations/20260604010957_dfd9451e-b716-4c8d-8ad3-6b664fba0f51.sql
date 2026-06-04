
CREATE TABLE public.user_plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plans TO anon, authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_user_plans" ON public.user_plans FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usage_tracking_user_day_idx ON public.usage_tracking (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.usage_tracking TO anon, authenticated;
GRANT ALL ON public.usage_tracking TO service_role;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_usage_insert" ON public.usage_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "open_usage_select" ON public.usage_tracking FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER user_plans_updated_at BEFORE UPDATE ON public.user_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
