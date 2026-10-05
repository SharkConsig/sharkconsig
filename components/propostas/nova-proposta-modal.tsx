"use client"

import React, { Suspense } from "react"
import { NewProposalForm } from "@/app/(dashboard)/propostas/nova/page"

export interface NovaPropostaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    nome?: string;
    cpf?: string;
    nascimento?: string;
    matricula?: string;
    origem?: string;
    tel1?: string;
    tel2?: string;
    tel3?: string;
    tel4?: string;
    convenio?: string;
  };
  onSuccess?: () => void;
}

export function NovaPropostaModal({ isOpen, onClose, initialData, onSuccess }: NovaPropostaModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 bg-slate-900/60 backdrop-blur-xs">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[95vw] lg:max-w-6xl h-[92vh] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <Suspense fallback={<div className="p-16 text-center text-xs font-bold text-slate-500">Carregando área de proposta...</div>}>
          <NewProposalForm 
            isModal={true}
            modalInitialData={initialData}
            onCloseModal={onClose}
            onSuccessModal={() => {
              if (onSuccess) onSuccess()
              onClose()
            }}
          />
        </Suspense>
      </div>
    </div>
  )
}
