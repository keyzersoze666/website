type DeploymentEnvironment = Record<string, string | undefined>;

const productionSiteUrl = 'https://qwertylabs.com';

export function siteConfiguration(env: DeploymentEnvironment = process.env) {
  const configured =
    env.SITE_URL?.trim() ||
    (env.VERCEL_ENV === 'production' ? productionSiteUrl : undefined);
  const url = new URL(configured || 'http://localhost:4321');
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (configured && url.protocol !== 'https:')
  )
    throw new Error(
      'SITE_URL must be an HTTPS origin without a path, credentials, query or fragment.'
    );
  const indexable =
    Boolean(configured) &&
    env.VERCEL_ENV !== 'preview' &&
    env.SITE_INDEXABLE !== 'false';
  return { url: url.href, indexable };
}
