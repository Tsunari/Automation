export default {
  '*.{js,jsx,ts,tsx,json,css,html,md}': ['prettier --write'],
  '**/*.{ts,tsx}': () => 'tsc --noEmit',
}
