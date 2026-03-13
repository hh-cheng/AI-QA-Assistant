'use client'

import { useState } from 'react'

import { Modal } from './modal'
import SignInForm from '@/components/sign-in-form'
import SignUpForm from '@/components/sign-up-form'

export default function AuthDialog({
  open,
  onClose,
  mode = 'signin',
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
      className="max-w-md p-4"
      title={view === 'signin' ? 'Welcome back' : 'Create your account'}
      description="Use Better Auth to enter the document workspace."
    >
      <div className="qa-theme rounded-[1.75rem] bg-transparent p-6 pt-2 px-0">
        {view === 'signin' ? (
          <SignInForm embedded onSwitchToSignUp={() => setView('signup')} />
        ) : (
          <SignUpForm embedded onSwitchToSignIn={() => setView('signin')} />
        )}
      </div>
    </Modal>
  )
}
