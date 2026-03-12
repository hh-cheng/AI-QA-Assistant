import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@Intelligent-QA-Assistant/ui/components/card'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <Card className="qa-glass-card rounded-3xl border-border/70 bg-card/60 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent className="py-5">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}
