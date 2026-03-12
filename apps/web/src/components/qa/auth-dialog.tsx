'use client'

import { useState } from 'react'

import SignInForm from '@/components/sign-in-form'
import SignUpForm from '@/components/sign-up-form'

import { Modal } from './modal'

export default function AuthDialog({
  open,
  mode = 'signin',
  onClose,
}: {
  open: boolean
  mode?: 'signin' | 'signup'
  onClose: () => void
}) {
  const [view, setView] = useState<'signin' | 'signup'>(mode)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={view === 'signin' ? 'Welcome back' : 'Create your account'}
      description="Use Better Auth to enter the document workspace."
      className="max-w-md p-0"
    >
      <div className="qa-theme rounded-[1.75rem] bg-background p-6">
        {view === 'signin' ? (
          <SignInForm embedded onSwitchToSignUp={() => setView('signup')} />
        ) : (
          <SignUpForm embedded onSwitchToSignIn={() => setView('signin')} />
        )}
      </div>
    </Modal>
  )
}
