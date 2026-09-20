/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not `tailwind-merge`: this project has no runtime deps beyond
 * React, and the components below put the caller's `className` last so it
 * wins on equal specificity. If conflicting utilities (e.g. passing `p-2` to a
 * Card that already sets `p-6`) become a real problem, add `tailwind-merge`
 * and swap the body of this function — nothing else needs to change.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
