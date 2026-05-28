import { useState, useEffect, useRef } from "react";

// Lovett School palette
const BRAND = {
  navy: "#1B3A5C", navyDark: "#0F2440", navyLight: "#2A4F7A",
  columbia: "#6BADE4", columbiaLight: "#E8F2FC", columbiaMid: "#A5D0F0",
  white: "#FFFFFF", gold: "#C4A44A", goldLight: "#FAF3E0", goldDark: "#8C7530",
};

const GROUPS = ["coaches", "tots", "beginner", "advanced"];
const GROUP_LABELS = { coaches: "Coaches", tots: "Tots", beginner: "Beginner", advanced: "Advanced" };
const GROUP_COLORS = { coaches: BRAND.gold, tots: "#7B5EA7", beginner: BRAND.columbia, advanced: BRAND.navy };

// --- MOCK DATA ---
const INITIAL_ROSTER = [
  { id: 101, name: "Joey Kusky", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Head Coach", parent1: { name: "Joey Kusky", email: "joey.kusky@gmail.com", phone: "404-271-7232" }, parent2: null },
  { id: 102, name: "Brian Walsh", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Assistant Coach", parent1: { name: "Brian Walsh", email: "bwalsh@email.com", phone: "404-555-0200" }, parent2: null },
  { id: 103, name: "DeShawn Harris", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Tots Coach", parent1: { name: "DeShawn Harris", email: "dharris.coach@email.com", phone: "404-555-0201" }, parent2: null },
  { id: 104, name: "Mike Connors", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Beginner Coach", parent1: { name: "Mike Connors", email: "mconnors@email.com", phone: "404-555-0202" }, parent2: null },
  { id: 105, name: "Sarah Kim", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Advanced Coach", parent1: { name: "Sarah Kim", email: "skim@email.com", phone: "404-555-0203" }, parent2: null },
  { id: 106, name: "Tommy Reeves", weight: null, grade: null, school: "Lovett", group: "coaches", role: "Volunteer Coach", parent1: { name: "Tommy Reeves", email: "treeves@email.com", phone: "404-555-0204" }, parent2: null },
  { id: 1, name: "Marcus Johnson", weight: "126", grade: "10th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Darnell Johnson", email: "djohnson@email.com", phone: "404-555-0101" }, parent2: { name: "Tanya Johnson", email: "tjohnson@email.com", phone: "404-555-0201" } },
  { id: 2, name: "Ethan Williams", weight: "132", grade: "11th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Karen Williams", email: "kwilliams@email.com", phone: "404-555-0102" }, parent2: null },
  { id: 3, name: "Tyler Brooks", weight: "138", grade: "8th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Shonda Brooks", email: "sbrooks@email.com", phone: "404-555-0103" }, parent2: { name: "Ray Brooks", email: "rbrooks@email.com", phone: "404-555-0203" } },
  { id: 4, name: "Jayden Carter", weight: "145", grade: "12th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Mike Carter", email: "mcarter@email.com", phone: "404-555-0104" }, parent2: { name: "Angela Carter", email: "acarter@email.com", phone: "404-555-0204" } },
  { id: 5, name: "Noah Mitchell", weight: "152", grade: "7th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Lisa Mitchell", email: "lmitchell@email.com", phone: "404-555-0105" }, parent2: null },
  { id: 8, name: "Liam Davis", weight: "160", grade: "12th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Tonya Davis", email: "tdavis@email.com", phone: "404-555-0108" }, parent2: { name: "Marcus Davis Sr.", email: "mdavis@email.com", phone: "404-555-0208" } },
  { id: 9, name: "Mason Clark", weight: "170", grade: "9th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Janet Clark", email: "jclark@email.com", phone: "404-555-0109" }, parent2: null },
  { id: 10, name: "Logan White", weight: "182", grade: "12th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Steve White", email: "swhite@email.com", phone: "404-555-0110" }, parent2: { name: "Debra White", email: "dwhite@email.com", phone: "404-555-0210" } },
  { id: 12, name: "Carter Brown", weight: "195", grade: "11th", school: "Lovett", group: "advanced", role: null, parent1: { name: "Andre Brown", email: "abrown@email.com", phone: "404-555-0112" }, parent2: null },
  { id: 6, name: "Aiden Thomas", weight: "80", grade: "4th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Rachel Thomas", email: "rthomas@email.com", phone: "404-555-0106" }, parent2: { name: "James Thomas", email: "jthomas@email.com", phone: "404-555-0206" } },
  { id: 7, name: "Caleb Harris", weight: "75", grade: "7th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Derek Harris", email: "dharris@email.com", phone: "404-555-0107" }, parent2: null },
  { id: 15, name: "Elijah Patel", weight: "85", grade: "5th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Anita Patel", email: "apatel@email.com", phone: "404-555-0115" }, parent2: { name: "Raj Patel", email: "rpatel@email.com", phone: "404-555-0215" } },
  { id: 16, name: "Bryce Nguyen", weight: "90", grade: "6th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Tiffany Nguyen", email: "tnguyen@email.com", phone: "404-555-0116" }, parent2: null },
  { id: 17, name: "Dylan Foster", weight: "95", grade: "9th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Keisha Foster", email: "kfoster@email.com", phone: "404-555-0117" }, parent2: { name: "Brian Foster", email: "bfoster@email.com", phone: "404-555-0217" } },
  { id: 19, name: "Zane Cooper", weight: "110", grade: "8th", school: "Lovett", group: "beginner", role: null, parent1: { name: "Laura Cooper", email: "lcooper@email.com", phone: "404-555-0119" }, parent2: null },
  { id: 11, name: "Jackson Lee", weight: "55", grade: "1st", school: "Lovett", group: "tots", role: null, parent1: { name: "Priya Lee", email: "plee@email.com", phone: "404-555-0111" }, parent2: { name: "David Lee", email: "dlee@email.com", phone: "404-555-0211" } },
  { id: 13, name: "Wyatt Simmons", weight: "50", grade: "K", school: "Lovett", group: "tots", role: null, parent1: { name: "Brittany Simmons", email: "bsimmons@email.com", phone: "404-555-0113" }, parent2: { name: "Kyle Simmons", email: "ksimmons@email.com", phone: "404-555-0213" } },
  { id: 14, name: "Owen Rivera", weight: "60", grade: "2nd", school: "Lovett", group: "tots", role: null, parent1: { name: "Maria Rivera", email: "mrivera@email.com", phone: "404-555-0114" }, parent2: { name: "Carlos Rivera", email: "crivera@email.com", phone: "404-555-0214" } },
  { id: 18, name: "Jaxon Moore", weight: "45", grade: "K", school: "Lovett", group: "tots", role: null, parent1: { name: "Stephanie Moore", email: "smoore@email.com", phone: "404-555-0118" }, parent2: null },
];

const INITIAL_EVENTS = [
  { id: 1, title: "Tuesday Practice", type: "practice", date: "2026-05-26", time: "6:00 PM", location: "Lovett Gym", group: "all" },
  { id: 2, title: "Thursday Practice", type: "practice", date: "2026-05-28", time: "6:00 PM", location: "Lovett Gym", group: "all" },
  { id: 3, title: "Peach State Tournament", type: "tournament", date: "2026-05-30", time: "8:00 AM", location: "Georgia World Congress Center", group: "advanced" },
  { id: 4, title: "Beginner Scrimmage vs Pace", type: "match", date: "2026-06-02", time: "5:00 PM", location: "Pace Academy", group: "beginner" },
  { id: 5, title: "Tuesday Practice", type: "practice", date: "2026-06-02", time: "6:00 PM", location: "Lovett Gym", group: "all" },
  { id: 6, title: "Region Qualifier", type: "tournament", date: "2026-06-06", time: "9:00 AM", location: "Kennesaw State", group: "advanced" },
  { id: 7, title: "Tots Fun Day", type: "match", date: "2026-06-07", time: "10:00 AM", location: "Lovett Gym", group: "tots" },
];

const INITIAL_AVAILABILITY = {
  "1-3": "confirmed", "2-3": "confirmed", "3-3": "confirmed", "4-3": "confirmed", "5-3": "confirmed",
  "8-3": "confirmed", "9-3": "declined", "10-3": "confirmed", "12-3": "confirmed",
  "1-1": "confirmed", "2-1": "confirmed", "3-1": "confirmed", "4-1": "confirmed", "5-1": "confirmed",
  "6-1": "confirmed", "7-1": "confirmed", "8-1": "confirmed", "9-1": "confirmed", "10-1": "confirmed",
  "11-1": "confirmed", "12-1": "confirmed", "13-1": "confirmed", "14-1": "confirmed",
  "15-1": "confirmed", "16-1": "confirmed", "17-1": "confirmed", "18-1": "confirmed", "19-1": "confirmed",
};

// Channel seed messages
const INITIAL_CHANNEL_MESSAGES = {
  ai: [],
  announcements: [
    { id: 1, sender: "Coach Joey", role: "coach", text: "Welcome to the Lovett Wrestling team channel! Use this for general announcements and team updates. Go Lions! 🦁", time: "Mon 9:00 AM", pinned: true },
    { id: 2, sender: "Coach Joey", role: "coach", text: "Reminder: Peach State Tournament is this Saturday. Advanced wrestlers need to confirm availability ASAP. Weigh-ins at 7:30 AM.", time: "Mon 2:15 PM" },
  ],
  advanced: [
    { id: 1, sender: "Coach Sarah", role: "coach", text: "Advanced practice focus this week: single-leg takedowns and top control. Bring your mouthguards — we're going live rounds Thursday.", time: "Mon 10:00 AM" },
    { id: 2, sender: "Darnell Johnson", role: "parent", text: "Marcus won't be at Thursday practice — has a school event. He'll be at the tournament Saturday though.", time: "Mon 4:30 PM" },
    { id: 3, sender: "Coach Sarah", role: "coach", text: "Thanks Darnell, noted! Marcus is confirmed for Saturday. 👍", time: "Mon 4:45 PM" },
  ],
  beginner: [
    { id: 1, sender: "Coach Mike", role: "coach", text: "Beginner group — great job last week on your stance and motion drills! This week we're adding sprawls. Practice is Tuesday and Thursday at 6 PM.", time: "Mon 9:30 AM" },
    { id: 2, sender: "Rachel Thomas", role: "parent", text: "Aiden is so excited about the scrimmage vs Pace! Is there anything special he needs to bring?", time: "Tue 8:00 AM" },
    { id: 3, sender: "MatMind AI", role: "ai", text: "Hi Rachel! For the scrimmage vs Pace on June 2nd, athletes should bring their wrestling shoes, headgear, and a water bottle. Weigh-ins won't be required for this scrimmage. Let Coach Mike know if you have other questions!", time: "Tue 8:01 AM" },
  ],
  tots: [
    { id: 1, sender: "Coach DeShawn", role: "coach", text: "Tots families! Fun Day is coming up June 7th at 10 AM in the Lovett Gym. This is a low-key event — all about having fun and building confidence on the mat. Siblings welcome to watch! 🤼", time: "Mon 11:00 AM" },
    { id: 2, sender: "Brittany Simmons", role: "parent", text: "Wyatt can't stop talking about wrestling! He's been practicing his stance at home 😂", time: "Tue 7:00 AM" },
  ],
  coaches: [
    { id: 1, sender: "Coach Joey", role: "coach", text: "Coaches meeting Wednesday at 5 PM before practice. Need to finalize Peach State lineup and discuss summer camp plans.", time: "Mon 8:00 AM" },
    { id: 2, sender: "Coach Sarah", role: "coach", text: "I have the weight management spreadsheet ready. Mason Clark might need to bump up to 182 if Logan can't make weight.", time: "Mon 12:30 PM" },
    { id: 3, sender: "Coach Brian", role: "coach", text: "I'll handle the travel logistics for Peach State. Need a headcount by Thursday.", time: "Mon 1:00 PM" },
  ],
};

// --- ICONS ---
const I = {
  brain: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 13a3.5 3.5 0 0 0-3.5-3.5 3.5 3.5 0 0 0-3.5 3.5"/><path d="M8.5 13a3.5 3.5 0 0 1-.95 2.41A3.5 3.5 0 0 0 6 18.5a3.5 3.5 0 0 0 3.5 3.5h5a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-1.55-2.9A3.5 3.5 0 0 1 15.5 13"/><path d="M12 2a3.5 3.5 0 0 0-3.5 3.5v.5"/><path d="M15.5 6v-.5A3.5 3.5 0 0 0 12 2"/><path d="M8.5 6A3.5 3.5 0 0 0 5 9.5c0 .98.4 1.86 1.05 2.5"/><path d="M15.5 6A3.5 3.5 0 0 1 19 9.5c0 .98-.4 1.86-1.05 2.5"/></svg>,
  send: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14L21 3"/><path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1z"/></svg>,
  calendar: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  check: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  clock: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mapPin: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  chevDown: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevLeft: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chat: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  school: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  phone: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  mail: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  user: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  star: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  megaphone: (s=18,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
  hash: (s=16,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  lock: (s=14,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  pin: (s=12,c="currentColor") => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
};

// --- CHANNELS CONFIG ---
const CHANNELS = [
  { id: "ai", label: "MatMind AI", desc: "Your private AI command center", icon: "brain", color: BRAND.columbia, private: true },
  { id: "announcements", label: "Announcements", desc: "Team-wide updates", icon: "megaphone", color: BRAND.navy, private: false },
  { id: "advanced", label: "Advanced", desc: "Skill-based group", icon: "hash", color: BRAND.navy, private: false },
  { id: "beginner", label: "Beginner", desc: "Skill-based group", icon: "hash", color: BRAND.columbia, private: false },
  { id: "tots", label: "Tots", desc: "Youngest wrestlers", icon: "hash", color: "#7B5EA7", private: false },
  { id: "coaches", label: "Coaches Only", desc: "Staff-only channel", icon: "lock", color: BRAND.gold, private: true },
];

// --- AI ENGINE ---
function generateAIResponse(message, roster, events, availability, setRoster, setEvents, setAvailability) {
  const lower = message.toLowerCase();
  const actions = [];
  const athletes = roster.filter(r => r.group !== "coaches");
  const coaches = roster.filter(r => r.group === "coaches");

  const detectGroup = (text) => {
    if (text.includes("coaches") || text.includes("coaching staff")) return "coaches";
    if (text.includes("tots")) return "tots";
    if (text.includes("beginner")) return "beginner";
    if (text.includes("advanced")) return "advanced";
    return null;
  };

  if ((lower.includes("who") && (lower.includes("confirmed") || lower.includes("available"))) || lower.includes("headcount")) {
    const event = events.find(e => lower.includes(e.title.toLowerCase()) || lower.includes(e.type));
    const targetEvent = event || events.find(e => e.type === "tournament");
    if (targetEvent) {
      const confirmed = Object.entries(availability).filter(([k, v]) => k.endsWith(`-${targetEvent.id}`) && v === "confirmed");
      const declined = Object.entries(availability).filter(([k, v]) => k.endsWith(`-${targetEvent.id}`) && v === "declined");
      const confirmedNames = confirmed.map(([k]) => athletes.find(r => r.id === parseInt(k.split("-")[0]))?.name).filter(Boolean);
      const eligible = targetEvent.group === "all" ? athletes : athletes.filter(r => r.group === targetEvent.group);
      const pending = eligible.filter(r => !Object.keys(availability).some(k => k === `${r.id}-${targetEvent.id}`)).length;
      return { text: `Here's the availability for **${targetEvent.title}** (${GROUP_LABELS[targetEvent.group] || "All groups"}):\n\n✅ **${confirmed.length} confirmed**: ${confirmedNames.join(", ")}\n\n❌ **${declined.length} declined**\n\n⏳ **${pending} pending**\n\nWant me to send a reminder to those who haven't responded?`, actions: [] };
    }
  }

  if ((lower.includes("sick") || lower.includes("injured") || lower.includes("can't compete") || lower.includes("unavailable") || lower.includes("pull")) && !lower.includes("who")) {
    const athlete = athletes.find(a => lower.includes(a.name.toLowerCase().split(" ")[0].toLowerCase()));
    if (athlete) {
      const nextTournament = events.find(e => e.type === "tournament" && (e.group === athlete.group || e.group === "all"));
      if (nextTournament) {
        const key = `${athlete.id}-${nextTournament.id}`;
        setAvailability(prev => ({ ...prev, [key]: "declined" }));
        actions.push(`Marked ${athlete.name} as unavailable for ${nextTournament.title}`);
        actions.push(`Notified ${athlete.parent1.name} via text`);
        if (athlete.parent2) actions.push(`Notified ${athlete.parent2.name} via text`);
        actions.push(`${athlete.weight} lb slot is now open`);
        return { text: "Done! I've handled everything:", actions, followUp: `The **${athlete.weight} lb** slot is now open for ${nextTournament.title}. Want me to check who else in **${GROUP_LABELS[athlete.group]}** could fill in?` };
      }
    }
  }

  if (lower.includes("add practice") || lower.includes("schedule practice") || lower.includes("new practice")) {
    const dayMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    const timeMatch = lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const group = detectGroup(lower) || "all";
    const day = dayMatch ? dayMatch[1] : "Thursday";
    const time = timeMatch ? timeMatch[1].toUpperCase() : "6:00 PM";
    setEvents(prev => [...prev, { id: prev.length + 1, title: `${day.charAt(0).toUpperCase() + day.slice(1)} Practice`, type: "practice", date: "2026-06-04", time, location: "Lovett Gym", group }]);
    const gl = group === "all" ? "All groups" : GROUP_LABELS[group];
    actions.push(`Added ${day} practice at ${time}`);
    actions.push(`Group: ${gl}`);
    return { text: "Practice added!", actions, followUp: `Want me to post an announcement to the ${gl === "All groups" ? "Announcements" : GROUP_LABELS[group]} channel?` };
  }

  if (lower.includes("send") && (lower.includes("reminder") || lower.includes("email") || lower.includes("notify") || lower.includes("update"))) {
    const group = detectGroup(lower);
    const filtered = group === "coaches" ? coaches : group ? athletes.filter(r => r.group === group) : athletes;
    const groupLabel = group ? GROUP_LABELS[group] : "all";
    const parentCount = group === "coaches" ? filtered.length : filtered.reduce((n, r) => n + 1 + (r.parent2 ? 1 : 0), 0);
    actions.push(`Drafted reminder for ${filtered.length} ${groupLabel} (${parentCount} recipients)`);
    actions.push("Ready to send via email + post to channel");
    return { text: `I've drafted a reminder for **${groupLabel}**:\n\n> *"Hi Lovett Wrestling families! Quick reminder about upcoming events. Please confirm availability in MatMind. Go Lions! 🦁"*`, actions, followUp: "Send this via email, post to the channel, or both?" };
  }

  if (lower.includes("post") && (lower.includes("channel") || lower.includes("announcement"))) {
    const group = detectGroup(lower);
    const channelName = group ? GROUP_LABELS[group] : "Announcements";
    actions.push(`Message drafted for #${channelName}`);
    return { text: `What would you like me to post to the **#${channelName}** channel? Type your message and I'll post it for you.`, actions: [] };
  }

  if (lower.includes("roster") || lower.includes("how many") || lower.includes("athletes")) {
    const counts = {};
    GROUPS.forEach(g => { counts[g] = roster.filter(r => r.group === g).length; });
    return { text: `Lovett Wrestling roster:\n\n⭐ **${counts.coaches} Coaches** on staff\n🟢 **${counts.advanced} Advanced** (skill-based)\n🔵 **${counts.beginner} Beginner** (skill-based)\n🟣 **${counts.tots} Tots**\n\n**${athletes.length} athletes** total.`, actions: [] };
  }

  if (lower.includes("this week") || lower.includes("upcoming") || lower.includes("what's coming") || lower.includes("schedule")) {
    const summary = events.slice(0, 5).map(e => {
      const icon = e.type === "tournament" ? "🏆" : e.type === "match" ? "🤼" : "💪";
      const tag = e.group === "all" ? "" : ` [${GROUP_LABELS[e.group]}]`;
      return `${icon} **${e.title}**${tag} — ${e.date} at ${e.time}`;
    }).join("\n");
    return { text: `Here's what's coming up:\n\n${summary}\n\nPeach State Tournament is Saturday for Advanced. Want me to check availability?`, actions: [] };
  }

  if (lower.includes("hello") || lower.includes("hey") || lower.includes("hi") || lower === "") {
    const ac = Object.entries(availability).filter(([k, v]) => k.endsWith("-3") && v === "confirmed").length;
    const at = athletes.filter(r => r.group === "advanced").length;
    return { text: `Hey Coach! 🦁 Your Lovett Wrestling snapshot:\n\n📅 **${events.length} events** on the schedule\n👥 **${athletes.length} athletes** + **${coaches.length} coaches**\n💬 **${CHANNELS.length} channels** active\n🏆 **Peach State** Saturday — ${ac}/${at} Advanced confirmed\n\nWhat do you need?`, actions: [] };
  }

  return { text: `Here's what I can do:\n\n• **Schedule**: "Add practice Wednesday 5pm"\n• **Roster**: "How many athletes?"\n• **Availability**: "Who's confirmed for Peach State?"\n• **Channels**: "Post an announcement" or "Send a reminder to beginner"\n• **Updates**: "Marcus is sick, pull him from Saturday"\n\nI understand groups — say **Tots**, **Beginner**, **Advanced**, or **Coaches**. Go Lions! 🦁`, actions: [] };
}

// --- CHAT MESSAGE ---
function ChatBubble({ msg, isUser, isAI }) {
  const isBot = msg.role === "ai";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          background: isBot ? BRAND.navy : msg.role === "coach" ? BRAND.gold : BRAND.columbiaLight,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: isBot || msg.role === "coach" ? "#fff" : BRAND.navy
        }}>
          {isBot ? I.brain(14, BRAND.columbia) : msg.sender?.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div style={{ maxWidth: "82%" }}>
        {!isUser && <p style={{ fontSize: 10, fontWeight: 600, color: msg.role === "coach" ? BRAND.goldDark : isBot ? BRAND.navyLight : "#888", margin: "0 0 3px 2px" }}>{msg.sender}{msg.role === "coach" && !isBot ? " • Coach" : ""}</p>}
        {msg.pinned && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, marginLeft: 2 }}>
            {I.pin(10, BRAND.gold)}
            <span style={{ fontSize: 10, color: BRAND.goldDark, fontWeight: 600 }}>Pinned</span>
          </div>
        )}
        <div style={{
          background: isUser ? BRAND.navy : isBot ? "#f0f4f8" : "#fff",
          color: isUser ? "#fff" : "#1a1a1a",
          borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          padding: "10px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line",
          border: isUser || isBot ? "none" : "1px solid #e8edf2",
        }}>
          {msg.text?.split(/(\*\*.*?\*\*)/).map((p, i) =>
            p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
          )}
          {msg.actions?.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              {msg.actions.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  {I.check(13, isUser ? BRAND.columbiaMid : BRAND.navy)}
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
          {msg.followUp && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: isUser ? "rgba(107,173,228,0.15)" : "rgba(27,58,92,0.06)", borderRadius: 8, fontSize: 12, color: isUser ? BRAND.columbiaMid : "#555" }}>
              {msg.followUp}
            </div>
          )}
        </div>
        {!isUser && <p style={{ fontSize: 10, color: "#bbb", margin: "3px 0 0 2px" }}>{msg.time}</p>}
      </div>
    </div>
  );
}

// --- CHANNEL THREAD ---
function ChannelThread({ channel, messages, onBack, roster, events, availability, setRoster, setEvents, setAvailability }) {
  const isAI = channel.id === "ai";
  const athletes = roster.filter(r => r.group !== "coaches");
  const advConfirmed = Object.entries(availability).filter(([k, v]) => k.endsWith("-3") && v === "confirmed").length;
  const advTotal = athletes.filter(r => r.group === "advanced").length;

  const [msgs, setMsgs] = useState(isAI ? [
    { id: 0, sender: "MatMind AI", role: "ai", text: `Hey Coach! 🦁 You have **${events.length} events** this week. Peach State Saturday — ${advConfirmed}/${advTotal} Advanced confirmed.\n\nThis is your private command center. What do you need?`, time: "Now" }
  ] : messages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: msgs.length + 1, sender: "Coach Joey", role: "coach", text: input.trim(), time: "Now" };
    setMsgs(prev => [...prev, userMsg]);
    const userInput = input.trim();
    setInput("");

    if (isAI) {
      setTyping(true);
      setTimeout(() => {
        const resp = generateAIResponse(userInput, roster, events, availability, setRoster, setEvents, setAvailability);
        setMsgs(prev => [...prev, { id: prev.length + 1, sender: "MatMind AI", role: "ai", text: resp.text, actions: resp.actions, followUp: resp.followUp, time: "Now" }]);
        setTyping(false);
      }, 800 + Math.random() * 600);
    }
  };

  const iconMap = { brain: I.brain, megaphone: I.megaphone, hash: I.hash, lock: I.lock };
  const ChannelIcon = iconMap[channel.icon] || I.hash;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #e8edf2", background: "#fff", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          {I.chevLeft(20, BRAND.navy)}
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: channel.color + "15"
        }}>
          {ChannelIcon(16, channel.color)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#1a1a1a" }}>
            {channel.private && I.lock(11, "#aaa")}{channel.private ? " " : "#"}{channel.label}
          </p>
          <p style={{ fontSize: 11, color: "#999", margin: 0 }}>{channel.desc}</p>
        </div>
        {isAI && <div style={{ padding: "3px 8px", borderRadius: 6, background: BRAND.columbiaLight, fontSize: 10, fontWeight: 600, color: BRAND.navy }}>Private</div>}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 12px", WebkitOverflowScrolling: "touch" }}>
        {msgs.map(m => <ChatBubble key={m.id} msg={m} isUser={false} isAI={m.role === "ai"} />)}
        {typing && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: BRAND.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {I.brain(14, BRAND.columbia)}
            </div>
            <div style={{ background: "#f0f4f8", borderRadius: "4px 14px 14px 14px", padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND.columbiaMid, animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
            </div>
          </div>
        )}
        {isAI && msgs.length === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <p style={{ fontSize: 11, color: "#999", margin: "0 0 2px", paddingLeft: 36 }}>Try asking:</p>
            {["Who's confirmed for Peach State?", "What's this week?", "Post an announcement"].map((q, i) => (
              <button key={i} onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                style={{ marginLeft: 36, textAlign: "left", background: "none", border: `1px dashed ${BRAND.columbiaMid}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: BRAND.navy, cursor: "pointer" }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e8edf2", display: "flex", gap: 8, alignItems: "center", background: "#fff" }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={isAI ? "Tell MatMind what you need..." : `Message #${channel.label}...`}
          style={{ flex: 1, background: "#f0f4f8", border: "none", borderRadius: 20, padding: "10px 16px", fontSize: 14, outline: "none", color: "#1a1a1a" }}
        />
        <button onClick={handleSend}
          style={{ width: 36, height: 36, borderRadius: "50%", background: input.trim() ? BRAND.navy : "#ccd5de", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}>
          {I.send(15, "#fff")}
        </button>
      </div>
    </div>
  );
}

// --- CHANNEL LIST ---
function ChannelList({ onSelect, channelMessages }) {
  const getLastMessage = (chId) => {
    const msgs = channelMessages[chId] || [];
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const getUnread = (chId) => {
    if (chId === "ai") return 0;
    const msgs = channelMessages[chId] || [];
    return msgs.filter(m => m.role === "parent").length > 0 ? 1 : 0;
  };

  const iconMap = { brain: I.brain, megaphone: I.megaphone, hash: I.hash, lock: I.lock };

  return (
    <div style={{ padding: "16px 12px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#1a1a1a" }}>Messages</p>
        <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{CHANNELS.length} channels</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => onSelect(CHANNELS[0])}
          style={{
            width: "100%", textAlign: "left", cursor: "pointer", border: `1px solid ${BRAND.columbia}30`,
            borderRadius: 14, padding: "14px 16px", background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`,
            display: "flex", alignItems: "center", gap: 12, transition: "transform 0.15s"
          }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(107,173,228,0.15)", border: "1px solid rgba(107,173,228,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {I.brain(22, BRAND.columbia)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>MatMind AI</p>
            <p style={{ fontSize: 12, color: BRAND.columbiaMid, margin: "2px 0 0" }}>Your private command center</p>
          </div>
          <div style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(107,173,228,0.15)", fontSize: 10, fontWeight: 600, color: BRAND.columbia }}>Private</div>
        </button>
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px 4px" }}>Team channels</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CHANNELS.slice(1).map(ch => {
          const ChIcon = iconMap[ch.icon] || I.hash;
          const last = getLastMessage(ch.id);
          const unread = getUnread(ch.id);
          return (
            <button key={ch.id} onClick={() => onSelect(ch)}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px",
                background: "#fff", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s"
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: ch.color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ChIcon(16, ch.color)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#1a1a1a" }}>
                    {ch.private ? "" : "# "}{ch.label}
                  </p>
                  {ch.private && I.lock(11, "#bbb")}
                </div>
                {last && (
                  <p style={{ fontSize: 12, color: "#999", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 500, color: "#777" }}>{last.sender?.split(" ")[0]}:</span> {last.text?.slice(0, 50)}{last.text?.length > 50 ? "..." : ""}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: BRAND.columbia, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{unread}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- LOGIN ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("coach");

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(145deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 50%, ${BRAND.navyLight} 100%)`,
      padding: "0 32px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
          {I.brain(36, BRAND.columbia)}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 4px", letterSpacing: -0.5 }}>MatMind</h1>
        <p style={{ fontSize: 13, color: BRAND.columbiaMid, margin: 0 }}>Lovett Wrestling AI Assistant</p>
      </div>
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: BRAND.columbiaMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>I am a...</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: "coach", label: "Coach" }, { id: "parent", label: "Parent" }].map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: role === r.id ? `2px solid ${BRAND.columbia}` : "1px solid rgba(255,255,255,0.15)", background: role === r.id ? "rgba(107,173,228,0.15)" : "transparent", color: role === r.id ? BRAND.columbia : "rgba(255,255,255,0.5)", transition: "all 0.2s" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: BRAND.columbiaMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && onLogin(role)}
            placeholder={role === "coach" ? "coach@lovett.org" : "parent@email.com"}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 14, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: BRAND.columbiaMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
          <input type="password" placeholder="••••••••" onKeyDown={e => e.key === "Enter" && onLogin(role)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 14, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={() => onLogin(role)}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer", background: BRAND.columbia, color: BRAND.navyDark, fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
          Sign in
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 16 }}>Powered by MatMind AI</p>
      </div>
    </div>
  );
}

// --- SCHEDULE TAB ---
function ScheduleTab({ events, availability, roster }) {
  const [expandedId, setExpandedId] = useState(null);
  const athletes = roster.filter(r => r.group !== "coaches");
  const typeStyle = {
    practice: { bg: "#EAF3DE", color: "#3B6D11", label: "Practice" },
    tournament: { bg: BRAND.goldLight, color: BRAND.goldDark, label: "Tournament" },
    match: { bg: BRAND.columbiaLight, color: BRAND.navy, label: "Match" }
  };
  const getAvailability = (event) => {
    const confirmed = Object.entries(availability).filter(([k, v]) => k.endsWith(`-${event.id}`) && v === "confirmed").length;
    const declined = Object.entries(availability).filter(([k, v]) => k.endsWith(`-${event.id}`) && v === "declined").length;
    const eligible = event.group === "all" ? athletes : athletes.filter(r => r.group === event.group);
    return { confirmed, declined, pending: eligible.length - confirmed - declined, total: eligible.length };
  };
  const formatDate = (ds) => { const d = new Date(ds + "T12:00:00"); return { day: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], date: d.getDate(), month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()] }; };

  return (
    <div style={{ padding: "16px 12px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 16 }}><p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Schedule</p><p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{events.length} upcoming</p></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map(ev => {
          const ts = typeStyle[ev.type]; const d = formatDate(ev.date); const av = getAvailability(ev); const exp = expandedId === ev.id;
          return (
            <div key={ev.id} onClick={() => setExpandedId(exp ? null : ev.id)} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8edf2", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 12, padding: "12px 14px", alignItems: "center" }}>
                <div style={{ width: 44, textAlign: "center", flexShrink: 0, borderRadius: 10, padding: "6px 0", background: ev.type === "tournament" ? BRAND.goldLight : "#f5f7fa" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#999", margin: 0, textTransform: "uppercase" }}>{d.day}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, margin: 0 }}>{d.date}</p>
                  <p style={{ fontSize: 9, color: "#aaa", margin: 0 }}>{d.month}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: ts.bg, color: ts.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{ts.label}</span>
                    {ev.group !== "all" && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: GROUP_COLORS[ev.group] + "18", color: GROUP_COLORS[ev.group], textTransform: "uppercase" }}>{GROUP_LABELS[ev.group]}</span>}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{ev.title}</p>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>{I.clock(12, "#aaa")} {ev.time}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{I.mapPin(12, "#aaa")} {ev.location}</span>
                  </div>
                </div>
                <div style={{ transform: exp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>{I.chevDown(16, "#ccc")}</div>
              </div>
              {exp && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>Availability ({av.confirmed}/{av.total})</p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <div style={{ flex: 1, background: BRAND.columbiaLight, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><p style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, margin: 0 }}>{av.confirmed}</p><p style={{ fontSize: 10, color: BRAND.navyLight, margin: 0 }}>Confirmed</p></div>
                    <div style={{ flex: 1, background: "#FEE2E2", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><p style={{ fontSize: 18, fontWeight: 700, color: "#DC2626", margin: 0 }}>{av.declined}</p><p style={{ fontSize: 10, color: "#991B1B", margin: 0 }}>Declined</p></div>
                    <div style={{ flex: 1, background: BRAND.goldLight, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><p style={{ fontSize: 18, fontWeight: 700, color: BRAND.goldDark, margin: 0 }}>{av.pending}</p><p style={{ fontSize: 10, color: BRAND.goldDark, margin: 0 }}>Pending</p></div>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#eee", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${(av.confirmed / Math.max(av.total, 1)) * 100}%`, background: BRAND.navy, transition: "width 0.3s" }} />
                    <div style={{ width: `${(av.declined / Math.max(av.total, 1)) * 100}%`, background: "#EF4444" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- ROSTER TAB ---
function RosterTab({ roster }) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const filtered = filter === "all" ? roster : roster.filter(r => r.group === filter);
  const sorted = [...filtered].sort((a, b) => { if (a.group === "coaches" && b.group !== "coaches") return -1; if (b.group === "coaches" && a.group !== "coaches") return 1; if (a.group === "coaches") return a.name.localeCompare(b.name); return parseInt(a.weight) - parseInt(b.weight); });
  const getInitials = (name) => name.split(" ").map(n => n[0]).join("");
  const avatarColors = { coaches: BRAND.gold, tots: "#7B5EA7", beginner: BRAND.columbia, advanced: BRAND.navy };

  const ParentCard = ({ parent, label }) => {
    if (!parent) return null;
    return (
      <div style={{ background: "#f5f7fa", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>{I.user(13, "#888")}<span style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span></div>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px", color: "#1a1a1a" }}>{parent.name}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>{I.mail(12, "#aaa")}<span style={{ color: BRAND.navyLight }}>{parent.email}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>{I.phone(12, "#aaa")}<span style={{ color: "#555" }}>{parent.phone}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 12px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 12 }}><p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Roster</p><p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{roster.length} members</p></div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: filter === "all" ? BRAND.navy : "#edf1f5", color: filter === "all" ? "#fff" : "#666" }}>All ({roster.length})</button>
        {GROUPS.map(g => <button key={g} onClick={() => setFilter(g)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: filter === g ? GROUP_COLORS[g] : "#edf1f5", color: filter === g ? "#fff" : "#666" }}>{GROUP_LABELS[g]} ({roster.filter(r => r.group === g).length})</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map(m => {
          const exp = expandedId === m.id; const isC = m.group === "coaches";
          return (
            <div key={m.id} onClick={() => setExpandedId(exp ? null : m.id)} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: isC ? `1px solid ${BRAND.gold}40` : "1px solid #e8edf2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColors[m.group], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{isC ? I.star(16, "#fff") : getInitials(m.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{m.name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    {isC ? <span style={{ fontSize: 11, color: BRAND.goldDark, fontWeight: 500 }}>{m.role}</span> : <><span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{m.weight} lbs</span><span style={{ fontSize: 11, color: "#ccc" }}>•</span><span style={{ fontSize: 11, color: "#888" }}>{m.grade}</span></>}
                    <span style={{ fontSize: 11, color: "#ccc" }}>•</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: GROUP_COLORS[m.group] + "18", color: GROUP_COLORS[m.group], textTransform: "uppercase", letterSpacing: 0.5 }}>{GROUP_LABELS[m.group]}</span>
                  </div>
                </div>
                <div style={{ transform: exp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>{I.chevDown(14, "#ccc")}</div>
              </div>
              {exp && (
                <div style={{ padding: "0 14px 12px", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, color: "#888" }}>{I.school(13, "#aaa")}<span style={{ fontWeight: 500 }}>{m.school}</span></div>
                  {isC ? (
                    <div style={{ background: "#f5f7fa", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>{m.parent1.name}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>{I.mail(12, "#aaa")}<span style={{ color: BRAND.navyLight }}>{m.parent1.email}</span></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>{I.phone(12, "#aaa")}<span style={{ color: "#555" }}>{m.parent1.phone}</span></div>
                      </div>
                    </div>
                  ) : (<><ParentCard parent={m.parent1} label="Parent / Guardian 1" /><ParentCard parent={m.parent2} label="Parent / Guardian 2" />{!m.parent2 && <p style={{ fontSize: 11, color: "#bbb", fontStyle: "italic", margin: "4px 0 0", paddingLeft: 2 }}>No second parent/guardian on file</p>}</>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function MatMind() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [tab, setTab] = useState("messages");
  const [activeChannel, setActiveChannel] = useState(null);
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [channelMessages] = useState(INITIAL_CHANNEL_MESSAGES);

  if (!loggedIn) return <LoginScreen onLogin={(role) => { setUserRole(role); setLoggedIn(true); }} />;

  const tabs = [
    { id: "messages", label: "Messages", icon: I.chat },
    { id: "schedule", label: "Schedule", icon: I.calendar },
    { id: "roster", label: "Roster", icon: I.users },
  ];

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth: 430, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column",
      background: "#f8fafb", color: "#1a1a1a", overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        input:focus { outline: none; }
        button:active { transform: scale(0.97); }
      `}</style>

      {!activeChannel && (
        <div style={{ background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(107,173,228,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(107,173,228,0.25)" }}>
            {I.brain(20, BRAND.columbia)}
          </div>
          <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 16, color: "#fff", margin: 0, letterSpacing: -0.3 }}>MatMind</p><p style={{ fontSize: 11, color: BRAND.columbiaMid, margin: 0 }}>Lovett Wrestling</p></div>
          <div style={{ fontSize: 11, color: BRAND.columbiaMid, display: "flex", alignItems: "center", gap: 4 }}>{I.user(12, BRAND.columbiaMid)}<span style={{ textTransform: "capitalize" }}>{userRole}</span></div>
        </div>
      )}

      {!activeChannel && (
        <div style={{ display: "flex", borderBottom: "1px solid #e8edf2", background: "#fff", flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, fontWeight: 600, color: tab === t.id ? BRAND.navy : "#aab4c0", borderBottom: tab === t.id ? `2px solid ${BRAND.navy}` : "2px solid transparent" }}>
              {t.icon(15, tab === t.id ? BRAND.navy : "#bcc5d0")}
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeChannel ? (
          <ChannelThread channel={activeChannel} messages={channelMessages[activeChannel.id] || []} onBack={() => setActiveChannel(null)} roster={roster} events={events} availability={availability} setRoster={setRoster} setEvents={setEvents} setAvailability={setAvailability} />
        ) : (
          <>
            {tab === "messages" && <ChannelList onSelect={setActiveChannel} channelMessages={channelMessages} />}
            {tab === "schedule" && <ScheduleTab events={events} availability={availability} roster={roster} />}
            {tab === "roster" && <RosterTab roster={roster} />}
          </>
        )}
      </div>
    </div>
  );
}
