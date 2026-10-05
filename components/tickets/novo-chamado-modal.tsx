"use client"

import React, { Suspense } from "react"
import { NewTicketForm } from "@/app/(dashboard)/chamados/novo/page"

export interface NovoChamadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    nome?: string;
    cpf?: string;
    tel1?: string;
    tel2?: string;
    tel3?: string;
    margem?: string;
    liquida5?: string;
    beneficio5?: string;
    convenio?: string;
    matricula?: string;
    origem?: string;
  };
  onSuccess?: () => void;
}

export function NovoChamadoModal({ isOpen, onClose, initialData, onSuccess }: NovoChamadoModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 bg-slate-900/60 backdrop-blur-xs">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[95vw] lg:max-w-6xl h-[92vh] max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <Suspense fallback={<div className="p-16 text-center text-xs font-bold text-slate-500">Carregando área de chamado...</div>}>
          <NewTicketForm 
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
