'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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

import { Badge } from './badge'
import { trpc } from '@/utils/trpc'
import { StatCard } from './stat-card'
import { EmptyState } from './empty-state'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'

const quickActions = [
  {
    href: '/documents',
    title: 'Manage documents',
    description: 'Upload, review, and delete indexed files',
    icon: <ArrowRight className="size-4 text-muted-foreground" />,
  },
  {
    href: '/chat',
    title: 'Open chat',
    description: 'Ask grounded questions over your indexed documents',
    icon: <ArrowRight className="size-4 text-muted-foreground" />,
  },
  {
    href: '/settings',
    title: 'Choose your model',
    description: 'Select which supported LLM answers your questions',
    icon: <Settings className="size-4 text-muted-foreground" />,
  },
] as const

const fadeUp = {
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
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <motion.section
        variants={fadeUp}
        custom={0}
        className="qa-glass-card rounded-[2rem] p-8"
      >
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {userName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload files, wait for indexing, and query only the documents you
              own through the shared Hono/tRPC backend.
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
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <motion.div variants={fadeUp} custom={1}>
          <StatCard
            label="Documents"
            value={overview.data.totalDocuments}
            icon={<FileText className="size-4" />}
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <StatCard
            label="Ready Documents"
            value={overview.data.readyDocuments}
            icon={<Upload className="size-4" />}
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={3}>
          <StatCard
            label="Queries This Week"
            value={overview.data.queryCountThisWeek}
            icon={<MessageSquare className="size-4" />}
          />
        </motion.div>
        <motion.div variants={fadeUp} custom={4}>
          <StatCard
            label="Active Model"
            value={overview.data.activeModel}
            icon={<Cpu className="size-4" />}
          />
        </motion.div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          variants={fadeUp}
          custom={5}
          className="qa-glass-card rounded-[2rem] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent documents</h3>
              <p className="text-sm text-muted-foreground">
                Recently uploaded documents in your workspace
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
                {overview.data.recentDocuments.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    variants={fadeUp}
                    custom={index + 6}
                    className="border-t border-border/60"
                  >
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
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            variants={fadeUp}
            custom={6}
            className="qa-glass-card rounded-[2rem] p-6"
          >
            <h3 className="text-lg font-semibold">Quick actions</h3>
            <div className="mt-4 grid gap-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.href}
                  variants={fadeUp}
                  custom={index + 7}
                >
                  <Link
                    href={action.href}
                    className="block rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 transition hover:bg-secondary/40"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{action.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      {action.icon}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={10}
            className="qa-glass-card rounded-[2rem] p-6"
          >
            <div className="flex items-center gap-3">
              <Clock3 className="size-4 text-primary" />
              <p className="font-medium">Migration status</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The dashboard is now hydrated from typed tRPC queries. Replacing
              the mock responses with database-backed implementations will not
              require a route restructure.
            </p>
          </motion.div>
        </div>
      </section>
    </motion.div>
  )
}
