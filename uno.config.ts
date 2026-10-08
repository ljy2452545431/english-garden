import { defineConfig, presetWind3 } from 'unocss';
export default defineConfig({ presets: [presetWind3()], shortcuts: { 'row': 'flex items-center gap-3', 'stack': 'flex flex-col gap-3' }, theme: { colors: { garden: 'var(--accent)' }, breakpoints: { sm: '640px', md: '800px', lg: '1100px' } } });
