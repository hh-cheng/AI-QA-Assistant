export const quickActions = [
  {
    href: '/documents',
    title: 'Manage documents',
    description: 'Upload, review, and delete indexed files',
    iconName: 'arrow-right' as const,
  },
  {
    href: '/chat',
    title: 'Open chat',
    description: 'Ask grounded questions over your indexed documents',
    iconName: 'arrow-right' as const,
  },
  {
    href: '/settings',
    title: 'Choose your model',
    description: 'Select which supported LLM answers your questions',
    iconName: 'settings' as const,
  },
] as const

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

export function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)))

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function getDocumentStatusBadgeVariant(status: string) {
  switch (status) {
    case 'ready':
      return 'success' as const
    case 'processing':
      return 'processing' as const
    case 'failed':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}
