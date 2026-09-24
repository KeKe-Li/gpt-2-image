// Node 26 can disable jsdom storage when no localstorage file is provided.
// Keep browser-facing tests deterministic without changing production code.
if (typeof window !== 'undefined' && !window.localStorage) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] || null,
    get length() { return values.size; }
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}
