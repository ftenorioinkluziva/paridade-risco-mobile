export const typography = {
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
};

export const typographyScale = {
  xs: { fontSize: 10, lineHeight: 14, fontWeight: "400", letterSpacing: 0 } as const,
  sm: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 } as const,
  md: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0 } as const,
  lg: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0 } as const,
  xl: { fontSize: 18, lineHeight: 26, fontWeight: "600", letterSpacing: 0 } as const,
};