interface ProviderProps {
  children: React.ReactNode;
}

/**
 * Minimal provider wrapper. Theme class is managed by useThemeEffect.
 */
export function Provider({ children }: ProviderProps) {
  return <>{children}</>;
}
