/**
 * Worker-safe shim for decode-named-character-reference.
 *
 * The browser export (index.dom.js) uses document.createElement which
 * doesn't exist in Web Workers. This re-implements the same function
 * using the character-entities lookup table (what the Node/worker
 * export does).
 */

import { characterEntities } from "character-entities";

const own = {}.hasOwnProperty;

export function decodeNamedCharacterReference(value: string): string | false {
  return own.call(characterEntities, value) ? characterEntities[value] : false;
}
