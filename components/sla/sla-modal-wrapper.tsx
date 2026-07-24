'use client'

import React from 'react'
import { useAuth } from '@/context/auth-context'
import { SLAForcedQuestionModal } from '@/components/sla/sla-forced-question-modal'

export function SLAModalWrapper() {
  const { user, perfil } = useAuth()

  if (!user || !perfil) return null

  return <SLAForcedQuestionModal user={user} perfil={perfil} />
}

