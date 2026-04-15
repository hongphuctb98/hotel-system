/**
 * Booking number generator.
 *
 * Produces a 6-character uppercase alphanumeric code using an unambiguous
 * alphabet that excludes visually confusing characters:
 *   excluded digits:  0, 1, 5, 8
 *   excluded letters: B, I, L, O, S
 *
 * Resulting alphabet (27 chars): 2 3 4 6 7 9 A C D E F G H J K M N P Q R T U V W X Y Z
 * Keyspace: 27^6 ≈ 387 million — sufficient for typical hotel volumes.
 */

const ALPHABET = "23469ACDEFGHJKMNPQRTUVWXYZ";

export function generateBookingNumber(): string {
  let result = "";
  const len = ALPHABET.length;
  for (let i = 0; i < 6; i++) {
    result += ALPHABET[Math.floor(Math.random() * len)];
  }
  return result;
}
