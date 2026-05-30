// useTeamResolver — reads the subdomain before auth and fetches public
// team branding so the login screen shows the right name + colors.
//
// lovett.matmind.app  → slug='lovett' → fetches /api/team?slug=lovett
// localhost           → slug=null     → returns null (demo/default branding)
// mat-mind-bay.vercel.app → slug=null → same (Vercel preview URL)

import { useState, useEffect } from 'react';

// Set VITE_ROOT_DOMAIN=matmind.app in Vercel env vars.
// Unset locally → subdomain detection is disabled → demo mode.
const ROOT_DOMAIN = import.meta.env.VITE_ROOT_DOMAIN || '';

export function getTeamSlug() {
  if (!ROOT_DOMAIN) return null;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) return null;
  if (hostname.endsWith('.' + ROOT_DOMAIN)) {
    const slug = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    // Only accept a single-level subdomain (no dots), reject 'www'
    if (slug && !slug.includes('.') && slug !== 'www') return slug;
  }
  return null;
}

/**
 * useTeamResolver
 *
 * Returns:
 *   slug         — the subdomain slug (e.g. 'lovett'), or null
 *   teamBranding — { teamId, teamName, school, mascot, primaryColor,
 *                    secondaryColor, accentColor, logoUrl } or null
 *   loading      — true while the API call is in flight
 *   notFound     — true if the slug was present but no team matched
 */
export function useTeamResolver() {
  const slug = getTeamSlug();

  const [teamBranding, setTeamBranding] = useState(null);
  const [loading,      setLoading]      = useState(!!slug);
  const [notFound,     setNotFound]     = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/team?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) {
          setNotFound(true);
        } else {
          setTeamBranding(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  return { slug, teamBranding, loading, notFound };
}
