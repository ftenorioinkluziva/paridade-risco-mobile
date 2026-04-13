export const typography = {
  mono: "monospace",
};

export const typographyScale = {
  xs: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  sm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  md: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  lg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  xl: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
} as const;
