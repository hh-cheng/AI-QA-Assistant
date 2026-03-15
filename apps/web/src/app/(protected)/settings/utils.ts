export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.08,
      duration: 0.45,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
}

export function providerBadge(status: 'connected' | 'not_configured') {
  switch (status) {
    case 'connected':
      return 'success' as const
    default:
      return 'secondary' as const
  }
}
