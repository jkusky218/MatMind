import { createContext, useContext, useEffect, useState } from 'react';

const TeamContext = createContext(null);

// Production domain — slug resolution only activates on this domain.
// Every other host (localhost, Vercel previews, ngrok, etc.) → demo mode.
const PROD_DOMAIN = import.meta.env.VITE_APP_DOMAIN ?? 'mat-mind.com';

function extractSlug(hostname) {
  if (!hostname) return null;

  // Only resolve slugs on the configured production domain.
  // e.g. lovett.mat-mind.com → 'lovett'
  // anything else (localhost, *.vercel.app, etc.) → null → demo mode
  if (!hostname.endsWith(`.${PROD_DOMAIN}`)) return null;

  const slug = hostname.slice(0, hostname.length - PROD_DOMAIN.length - 1);
  // Must be a non-empty, valid slug (no dots = not a nested subdomain)
  if (!slug || slug.includes('.')) return null;
  return slug;
}

export function TeamProvider({ children }) {
  const [team, setTeam]           = useState(null);  // { team_id, name, branding }
  const [teamLoading, setLoading] = useState(true);
  const [teamNotFound, setNotFound] = useState(false);

  useEffect(() => {
    const slug = extractSlug(window.location.hostname);

    if (!slug) {
      // Dev / demo — no subdomain resolution needed
      setLoading(false);
      return;
    }

    fetch(`/api/team?slug=${encodeURIComponent(slug)}`)
      .then(r => {
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) setTeam(data);
        setLoading(false);
      })
      .catch(() => {
        // Network error — treat as not found to avoid hanging
        setNotFound(true);
        setLoading(false);
      });
  }, []);

  return (
    <TeamContext.Provider value={{ team, teamLoading, teamNotFound }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
