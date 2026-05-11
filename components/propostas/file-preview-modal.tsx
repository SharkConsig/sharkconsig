"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configurar o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  label: string
  extension: string
}

export function FilePreviewModal({ isOpen, onClose, url, label, extension }: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState(1.0)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  
  const isImage = ["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(extension.toUpperCase())
  const isPdf = extension.toUpperCase() === "PDF"
  const containerRef = useRef<HTMLDivElement>(null)

  // Observer para largura do container para scaling automático
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Reduzimos um pouco para dar margem lateral
        setContainerWidth(entries[0].contentRect.width - 40);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const loadFileData = useCallback(async () => {
    if (!url) return
    setIsLoading(true)
    setError(null)
    try {
      // Usamos fetch para pegar os dados e criar um blob
      // Isso ajuda a evitar problemas de CORS em alguns casos e permite download mais limpo
      const response = await fetch(url)
      if (!response.ok) throw new Error("Falha ao carregar arquivo")
      const blob = await response.blob()
      
      const type = isPdf ? "application/pdf" : blob.type
      const fileBlob = new Blob([blob], { type })
      
      const newBlobUrl = window.URL.createObjectURL(fileBlob)
      setBlobUrl(newBlobUrl)
    } catch (err) {
      console.error("Erro ao carregar arquivo:", err)
      setError("Não foi possível carregar o arquivo para visualização.")
    } finally {
      setIsLoading(false)
    }
  }, [url, isPdf])

  useEffect(() => {
    if (isOpen && url) {
      loadFileData()
    }
  }, [isOpen, url, loadFileData])

  useEffect(() => {
    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    setIsLoading(false)
  }

  const handleDownload = () => {
    if (!blobUrl && !url) return
    const link = document.createElement("a")
    link.href = blobUrl || url
    link.download = `${label}.${extension.toLowerCase()}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[95vw] lg:max-w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-[#F8FAFC] border-none shadow-2xl">
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between space-y-0 shadow-sm z-50 px-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                {label}
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{extension}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPdf && numPages > 0 && (
              <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-3">
                  <span className="text-[11px] font-black text-slate-700 tabular-nums">
                    {pageNumber}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">/</span>
                  <span className="text-[11px] font-black text-slate-700 tabular-nums">
                    {numPages}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {isPdf && (
              <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setScale(1.0)}
                  className="px-2 text-[10px] font-black h-8 rounded-lg"
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setScale(prev => Math.min(3, prev + 0.2))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 ml-2">
              {!isLoading && !error && (
                <Button 
                  onClick={handleDownload}
                  className="h-10 px-5 text-[10px] font-black uppercase tracking-widest gap-2 bg-[#00C853] hover:bg-[#00C854] text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-10 w-10 p-0 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center bg-[#f0f2f5] custom-scrollbar min-h-0" 
          ref={containerRef}
        >
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando documento...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 max-w-md text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                <X className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <p className="text-[13px] font-black uppercase tracking-tight text-slate-700 mb-2">
                  Não foi possível visualizar
                </p>
                <p className="text-[11px] font-bold text-slate-400">
                  {error} Tente baixar o arquivo clicando no botão acima.
                </p>
              </div>
              <Button 
                onClick={() => window.open(url, "_blank")} 
                variant="outline" 
                className="rounded-xl border-slate-200 text-[11px] font-black uppercase tracking-widest px-6"
              >
                Abrir em nova aba
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center pb-8">
              {isImage ? (
                <div className="relative group max-w-full">
                  <img 
                    src={blobUrl || url} 
                    alt={label} 
                    className="max-w-full h-auto object-contain shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-xl bg-white ring-1 ring-slate-200/50" 
                  />
                </div>
              ) : isPdf && blobUrl ? (
                <div className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-xl bg-white ring-1 ring-slate-200/50">
                  <Document
                    file={blobUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => {
                      console.error("Erro no PDF:", err)
                      setError("Detectamos uma falha ao renderizar o PDF.")
                    }}
                    loading={null}
                    className="flex flex-col items-center"
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      width={containerWidth > 0 ? containerWidth : undefined}
                      className="max-w-full"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6 py-20">
                  <FileText className="w-16 h-16 opacity-30" />
                  <div className="text-center">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em]">
                      Visualização Indisponível
                    </p>
                    <p className="text-[10px] font-bold mt-1">O formato {extension} não possui visualizador nativo.</p>
                  </div>
                  <Button onClick={handleDownload} variant="outline" className="rounded-xl border-slate-200 h-10 px-6 font-black uppercase tracking-widest text-[10px]">
                    Fazer Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
