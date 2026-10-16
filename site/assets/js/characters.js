// Character roster (names, taglines). Visuals live in mascot.js (SKINS).
(function (root) {
  const LIST = [
    { id: 'panda', name: 'Bao', species: 'Panda', tagline: 'Calm, cuddly, always cheering for you' },
    { id: 'cat', name: 'Mochi', species: 'Cat', tagline: 'Curious, a little cheeky' },
    { id: 'bunny', name: 'Pip', species: 'Bunny', tagline: 'Bouncy and extra encouraging' },
    { id: 'penguin', name: 'Pebble', species: 'Penguin', tagline: 'Loves cold water, naturally' },
    { id: 'axolotl', name: 'Ollie', species: 'Axolotl', tagline: 'The ultimate water buddy' },
  ];
  const API = {
    list: LIST,
    get(id) { return LIST.find((c) => c.id === id) || LIST[0]; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Characters = API;
})(typeof window !== 'undefined' ? window : globalThis);
