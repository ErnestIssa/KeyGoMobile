/** Short chat label: given name(s) + first letter of family name, e.g. "Maria Jose G." */
export function chatDisplayNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
  fullName?: string | null
): string {
  const fn = firstName?.trim();
  const ln = lastName?.trim();
  if (fn && ln) {
    return `${fn} ${ln.charAt(0).toUpperCase()}.`;
  }
  const full = fullName?.trim() ?? '';
  if (!full) return 'User';
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'User';
  if (parts.length === 1) return parts[0];
  const given = parts.slice(0, -1).join(' ');
  const last = parts[parts.length - 1];
  return `${given} ${last.charAt(0).toUpperCase()}.`;
}

/** Two-letter initials for avatar fallback. */
export function chatInitialsFromParts(
  firstName?: string | null,
  lastName?: string | null,
  fullName?: string | null
): string {
  const fn = firstName?.trim();
  const ln = lastName?.trim();
  if (fn && ln) {
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
  }
  const full = fullName?.trim() ?? '';
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/** @deprecated use chatDisplayNameFromParts */
export function chatDisplayName(fullName: string): string {
  return chatDisplayNameFromParts(undefined, undefined, fullName);
}

/** @deprecated use chatInitialsFromParts */
export function chatInitials(fullName: string): string {
  return chatInitialsFromParts(undefined, undefined, fullName);
}
