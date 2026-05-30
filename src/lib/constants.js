export const BRAND = {
  navy: "#1B3A5C", navyDark: "#0F2440", navyLight: "#2A4F7A",
  columbia: "#6BADE4", columbiaLight: "#E8F2FC", columbiaMid: "#A5D0F0",
  white: "#FFFFFF", gold: "#C4A44A", goldLight: "#FAF3E0", goldDark: "#8C7530",
};

export const GROUPS = ["coaches", "tots", "beginner", "advanced"];
export const GROUP_LABELS = { coaches: "Coaches", tots: "Tots", beginner: "Beginner", advanced: "Advanced" };
export const GROUP_COLORS = { coaches: BRAND.gold, tots: "#7B5EA7", beginner: BRAND.columbia, advanced: BRAND.navy };

// Static channel config — order and metadata are fixed; IDs map to DB slugs
export const CHANNELS = [
  { id: "ai",            label: "MatMind AI",     desc: "Ask me anything about the team", icon: "brain",    color: BRAND.columbia, private: true },
  { id: "announcements", label: "Announcements",  desc: "Team-wide updates",              icon: "megaphone", color: BRAND.navy,    private: false },
  { id: "advanced",      label: "Advanced",        desc: "Skill-based group",              icon: "hash",     color: BRAND.navy,    private: false },
  { id: "beginner",      label: "Beginner",        desc: "Skill-based group",              icon: "hash",     color: BRAND.columbia, private: false },
  { id: "tots",          label: "Tots",            desc: "Youngest wrestlers",             icon: "hash",     color: "#7B5EA7",     private: false },
];

// Maps Supabase channel `name` values to our slug IDs
export const CHANNEL_NAME_TO_SLUG = {
  Announcements: "announcements",
  Advanced:      "advanced",
  Beginner:      "beginner",
  Tots:          "tots",
};
