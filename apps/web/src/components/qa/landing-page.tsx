'use client'

import { buttonVariants } from '@Intelligent-QA-Assistant/ui/components/button'
import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import {
  ArrowRight,
  Brain,
  Cpu,
  FileText,
  Layers,
  MessageSquare,
  Settings,
  Upload,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import AuthDialog from './auth-dialog'
import { Badge } from './badge'

const features = [
  {
    icon: Upload,
    title: 'Upload and manage',
    desc: 'Bring TXT, Markdown, PDF, and DOCX files into a single document workspace.',
  },
  {
    icon: MessageSquare,
    title: 'Ask grounded questions',
    desc: 'Every conversation is shaped to behave like a retrieval-backed assistant.',
  },
  {
    icon: Layers,
    title: 'Split frontend and backend',
    desc: 'The migrated app now consumes typed mock APIs through the monorepo server.',
  },
  {
    icon: Cpu,
    title: 'Swap providers later',
    desc: 'Provider settings are already modeled so real model calls can replace mocks cleanly.',
  },
]

const steps = [
  ['01', 'Upload'],
  ['02', 'Process'],
  ['03', 'Ask'],
  ['04', 'Answer'],
] as const

const faqs = [
  {
    q: 'What file formats are supported?',
    a: 'The migrated UI keeps the original product posture: TXT and Markdown are first-class, with PDF and DOCX represented in the mock workflow.',
  },
  {
    q: 'Is the backend real?',
    a: 'The boundaries are real. The current implementations behind upload, chat, and settings are in-memory mock procedures running through Hono and tRPC.',
  },
  {
    q: 'Can I swap providers later?',
    a: 'Yes. Provider configuration is already modeled so real OpenAI, Anthropic, or local-model integrations can replace the mocks without rewriting the UI.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.08,
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
}

export default function QaLandingPage({
  initialAuthMode,
}: {
  initialAuthMode?: 'signin' | 'signup'
}) {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(
    initialAuthMode ?? 'signin',
  )
  const [authOpen, setAuthOpen] = useState(Boolean(initialAuthMode))

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const closeAuth = () => {
    setAuthOpen(false)
    router.replace('/')
  }

  return (
    <div className="qa-shell qa-grid min-h-screen">
      <div className="qa-hero-gradient">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-3xl bg-primary/12 text-primary">
              <Brain className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Docusage AI</p>
              <p className="text-xs text-muted-foreground">
                Migrated into Intelligent-QA-Assistant
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'rounded-full',
              )}
              onClick={() => openAuth('signin')}
            >
              Login
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-full px-5',
              )}
              onClick={() => openAuth('signup')}
            >
              Open workspace
            </button>
          </div>
        </nav>

        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:pb-28 lg:pt-24">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-6" variant="outline">
                <Zap className="size-3.5" />
                Intelligent Document Q&A Platform
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl font-semibold leading-tight tracking-tight md:text-7xl"
            >
              Chat with your <span className="text-primary">knowledge.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
            >
              Upload documents, build a second brain, and get instant answers
              from any AI model. The migrated build keeps the original product
              surface while splitting routing and API concerns cleanly.
            </motion.p>
            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-wrap gap-3"
            >
              <button
                type="button"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'rounded-full px-5',
                )}
                onClick={() => openAuth('signup')}
              >
                Start for Free
                <ArrowRight className="size-4" />
              </button>
              <Link
                href="/documents"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'rounded-full bg-background/50 px-5',
                )}
              >
                View Demo
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.18,
              duration: 0.6,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="qa-glass-card rounded-[2rem] p-6"
          >
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-border/70 bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Second-brain workspace
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload, index, and query documents from one place.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-secondary/20 p-4">
                <p className="text-sm font-medium">What is real today</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Layouts, route boundaries, auth-protected entry points, and
                  typed API contracts are real. Uploading, chat answers, and
                  provider settings currently use mock data.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Core capabilities
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need to unlock your documents
            </h2>
          </div>
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {features.map(({ icon: Icon, title, desc }, index) => (
            <motion.article
              key={title}
              variants={fadeUp}
              custom={index}
              className="qa-glass-card-hover rounded-[2rem] p-6"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {desc}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="qa-glass-card rounded-[2rem] p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent/12 p-3 text-accent">
              <Settings className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">
                How this migrated build works
              </h2>
              <p className="text-sm text-muted-foreground">
                The same product concepts, but with a healthier runtime
                boundary.
              </p>
            </div>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid gap-4 md:grid-cols-4"
          >
            {steps.map(([index, label], itemIndex) => (
              <motion.div
                key={index}
                variants={fadeUp}
                custom={itemIndex}
                className="rounded-[1.5rem] border border-border/70 bg-secondary/20 p-4"
              >
                <p className="text-3xl font-semibold text-primary/55">
                  {index}
                </p>
                <p className="mt-4 text-sm font-medium">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="qa-glass-card rounded-[1.5rem] px-5 py-4"
            >
              <summary className="cursor-pointer list-none text-sm font-medium">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="size-4 text-primary" />
            <span>DocMind AI — Intelligent Document Q&A</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/documents"
              className="hover:text-foreground transition-colors"
            >
              Documents
            </Link>
            <Link
              href="/chat"
              className="hover:text-foreground transition-colors"
            >
              Chat
            </Link>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} mode={authMode} onClose={closeAuth} />
    </div>
  )
}
