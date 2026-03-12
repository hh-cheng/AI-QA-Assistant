'use client'

import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Clock3,
  Cpu,
  FileText,
  MessageSquare,
  Settings,
  Upload,
} from 'lucide-react'
import Link from 'next/link'

import { trpc } from '@/utils/trpc'

import { Badge } from './badge'
import { EmptyState } from './empty-state'
import { StatCard } from './stat-card'

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)))
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function QaDashboardPage({ userName }: { userName: string }) {
  const overview = useQuery(trpc.qa.dashboard.getOverview.queryOptions())

  if (overview.isLoading) {
    return (
      <div className="qa-glass-card rounded-[2rem] p-8">
        Loading dashboard...
      </div>
    )
  }

  if (!overview.data) {
    return (
      <EmptyState
        icon={<FileText className="size-8" />}
        title="Dashboard unavailable"
        description="The mock overview data could not be loaded."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="qa-glass-card rounded-[2rem] p-8">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {userName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This workspace is now served from the Next.js app while the data
              flows come from the shared Hono/tRPC layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/documents">
              <Button className="rounded-full px-5">
                <Upload className="size-4" />
                Upload document
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" className="rounded-full px-5">
                <MessageSquare className="size-4" />
                Ask a question
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={overview.data.totalDocuments}
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Ready Documents"
          value={overview.data.readyDocuments}
          icon={<Upload className="size-4" />}
        />
        <StatCard
          label="Queries This Week"
          value={overview.data.queryCountThisWeek}
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label="Active Model"
          value={overview.data.activeModel}
          icon={<Cpu className="size-4" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="qa-glass-card rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent documents</h3>
              <p className="text-sm text-muted-foreground">
                Documents returned by the mock backend
              </p>
            </div>
            <Link href="/documents" className="text-sm text-primary">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/30 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {overview.data.recentDocuments.map((doc) => (
                  <tr key={doc.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{doc.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{doc.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          doc.status === 'ready'
                            ? 'success'
                            : doc.status === 'processing'
                              ? 'processing'
                              : doc.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                        }
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTimeAgo(doc.uploadedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="qa-glass-card rounded-[2rem] p-6">
            <h3 className="text-lg font-semibold">Quick actions</h3>
            <div className="mt-4 grid gap-3">
              <Link
                href="/documents"
                className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 transition hover:bg-secondary/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manage documents</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload, review, and delete indexed files
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
              <Link
                href="/chat"
                className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 transition hover:bg-secondary/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Open chat</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Run a mock document-grounded conversation
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
              <Link
                href="/settings"
                className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 transition hover:bg-secondary/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Configure providers</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adjust default model and retrieval behavior
                    </p>
                  </div>
                  <Settings className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>

          <div className="qa-glass-card rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="size-4 text-primary" />
              <p className="font-medium">Migration status</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The dashboard is now hydrated from typed tRPC queries. Replacing
              the mock responses with database-backed implementations will not
              require a route restructure.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
