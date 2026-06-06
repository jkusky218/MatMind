import { createContext, useContext, useEffect, useState } from 'react';

const TeamContext = createContext(null);

function extractSlug(hostname) {
  // localhost / IP → dev/demo mode, no slug
  if (!hostname || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  const parts = hostname.split('.');
  // Needs at least two dots to have a subdomain (e.g. lovett.mat-mind.com)
  if (parts.length < 3) return null;
  return parts[0];
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
