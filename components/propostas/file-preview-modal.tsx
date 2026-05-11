"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Printer, X, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  label: string
  extension: string
}

export function FilePreviewModal({ isOpen, onClose, url, label, extension }: FilePreviewModalProps) {
  useEffect(() => {
    // Configurar o worker do PDF.js apenas no cliente
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`
  }, [])

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState(1.0)
  
  const isImage = ["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(extension.toUpperCase())
  const isPdf = extension.toUpperCase() === "PDF"
  const containerRef = useRef<HTMLDivElement>(null)

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 64 // padding
      // Assumindo uma largura padrão de PDF (A4 ~600-800px em 1.0)
      const targetScale = Math.min(containerWidth / 650, 1.5)
      setScale(Math.max(targetScale, 0.5))
    }
  }, [])

  useEffect(() => {
    if (isPdf && !isLoading && !error) {
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }
  }, [isPdf, isLoading, error, updateScale])

  const loadFileData = useCallback(async () => {
    if (!url) return
    setIsLoading(true)
    setError(null)
    try {
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
    return () => {
      // Cleanup is handled by the clearBlob reference or dependencies if needed.
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

  const handlePrint = () => {
    if (!blobUrl) return

    if (isImage) {
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)

      const content = `
        <html>
          <head>
            <style>
              @page { size: auto; margin: 0; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${blobUrl}" onload="setTimeout(function(){ window.print(); }, 500);" />
          </body>
        </html>
      `
      
      try {
        const doc = iframe.contentWindow?.document || iframe.contentDocument
        if (doc) {
          doc.open()
          doc.write(content)
          doc.close()
        }
      } catch (e) {
        console.error("Erro ao preparar impressão de imagem:", e)
        window.open(blobUrl, '_blank')
      }

      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
      }, 5000)
    } else if (isPdf) {
      // Para PDF, abrir em nova aba é o método mais robusto e seguro contra erros de cross-origin
      // Especialmente em ambientes de iframe como o preview do AI Studio
      const printWindow = window.open(blobUrl, '_blank')
      if (printWindow) {
        printWindow.focus()
      } else {
        // Se o popup for bloqueado, tentamos o método do iframe com tratamento de erro rigoroso
        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = 'none'
        iframe.src = blobUrl
        document.body.appendChild(iframe)
        
        iframe.onload = () => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus()
              iframe.contentWindow.print()
            }
          } catch (e) {
            console.error("Erro ao imprimir PDF via iframe:", e)
            // Se tudo falhar, informamos ao usuário para baixar o arquivo
            setError("O bloqueador de pop-ups ou restrições do navegador impediram a impressão automática. Por favor, baixe o arquivo ou tente abrir em uma nova aba.")
          }
        }

        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe)
        }, 5000)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-[#F8FAFC]">
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between space-y-0 shadow-sm z-10 px-6">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
                {label}
              </DialogTitle>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{extension}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isPdf && numPages > 1 && (
              <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[10px] font-black tabular-nums px-2 border-x border-slate-200">
                  {pageNumber} / {numPages}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {!isLoading && !error && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrint}
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleDownload}
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                  <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                </>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-9 w-9 p-0 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0 flex items-center justify-center bg-[#F1F5F9]" ref={containerRef}>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Preparando visualização...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="bg-red-50 p-4 rounded-full">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-red-500">
                {error}
              </p>
              <Button onClick={() => window.open(url, "_blank")} variant="outline" className="bg-white">
                Abrir em nova aba
              </Button>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 md:p-8">
              {isImage ? (
                <img 
                  src={blobUrl || url} 
                  alt={label} 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg bg-white ring-1 ring-slate-200" 
                />
              ) : isPdf && blobUrl ? (
                <div className="shadow-2xl rounded-lg overflow-hidden bg-white max-w-full relative min-h-[400px] flex items-center justify-center">
                  <Document
                    file={blobUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => {
                      console.error("Erro no PDF:", err)
                      setError("O visualizador de PDF encontrou um problema. Você pode baixar o arquivo para visualizá-lo.")
                    }}
                    loading={
                      <div className="p-12 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando PDF...</p>
                      </div>
                    }
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      className="max-w-full h-auto"
                      loading={
                        <div className="p-12 flex flex-col items-center gap-3">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-500/50" />
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Processando página...</p>
                        </div>
                      }
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <FileText className="w-16 h-16 opacity-20" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] opacity-40">
                    Visualização não disponível
                  </p>
                  <Button onClick={handleDownload} variant="outline" className="bg-white font-bold uppercase tracking-widest text-[10px]">
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
