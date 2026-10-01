import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator"

/**
 * Generate a random, URL-friendly slug from an adjective + animal pair,
 * e.g. `brave-otter`.
 *
 * Both dictionaries are plain lowercase ascii words, so the result is always
 * safe to use as a path segment or stable identifier (~427k combinations).
 */
export function generateSlug(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    length: 2,
    separator: "-",
    style: "lowerCase",
  })
}
