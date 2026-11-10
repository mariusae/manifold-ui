// The light the backdrop is seen in, by the hour (Manifold's Daylight): the
// sun's height where you are gives its light's colour temperature — a touch
// warmer while the sun is low, cooler when it's high, a dim cool blue at
// night — as a multiplier for each linear channel.

import { cast as castAt, daylight } from './themes.js';

export const neutralCast = daylight.neutral;

/** Where the light is read from when no place is given: latitude 40°, and
 *  the longitude the time zone's offset stands for. */
export function defaultPlace(date = new Date()) {
  return { latitude: daylight.fallbackLatitude, longitude: -date.getTimezoneOffset() / 4 };
}

/** The cast at `date` from `place` ({latitude, longitude}, in degrees). */
export function cast(date = new Date(), place = null) {
  const p = place ?? defaultPlace(date);
  return castAt(date, p.latitude, p.longitude);
}
