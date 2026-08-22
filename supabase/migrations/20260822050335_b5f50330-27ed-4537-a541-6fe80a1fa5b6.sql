REVOKE EXECUTE ON FUNCTION public.has_role(text, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.bump_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, text, integer, integer) TO service_role;