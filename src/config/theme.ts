export const theme = {
  colors: {
    // Brand core
    primary: '#2c3e50', // Primary dark (buttons, app bars)
    primaryHover: '#1e2b37', // Hover state
    primaryActive: '#1a252f', // Active/pressed state
    accent: '#3788d8', // Accent blue (links, highlights)
    accentAlt: '#8fdf82', // Alternate accent (event background / success)

    // Text
    text: '#2c3e50', // Primary text on light backgrounds
    textInverse: '#ffffff', // Text on dark / primary backgrounds
    neutralText: 'grey', // Secondary / muted text

    // Backgrounds & surfaces
    background: '#ffffff', // Page background
    backgroundDark: '#000000', // Full dark background (login screen)
    backgroundAlt: '#d0d0d0', // Sub-surface / subtle filled elements
    backgroundNeutral: 'hsla(0,0%,82%,0.3)', // Neutral translucent surface
    highlightBg: 'rgba(188,232,241,0.3)', // Highlight background
    todayBg: 'rgba(255,220,40,0.15)', // Today background highlight

    // Borders
    border: '#ddd',

    // Semantic / indicators
    success: '#8fdf82',
    warning: 'rgba(255,220,40,0.15)',
    danger: 'red',
    nowIndicator: 'red',
  },
};

export type AppTheme = typeof theme;
