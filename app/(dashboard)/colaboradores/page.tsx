"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { 
  Search, 
  Filter,
  ChevronDown,
  Check,
  Trash2,
  Users,
  Smile,
  FileSpreadsheet,
  Cake,
  UserMinus,
  Paperclip,
  Eye,
  UploadCloud,
  X,
  CheckCircle2
} from "lucide-react"

const DOCUMENT_TYPES = [
  {
    category: "1. Documentos Pessoais",
    items: [
      { key: "rg", name: "RG (ou CNH, etc.)" },
      { key: "cpf", name: "CPF" },
      { key: "residencia", name: "Comprovante de Residência" },
      { key: "titulo_voto", name: "Título de Eleitor e comprovante de votação" },
      { key: "certidao_nasc_cas", name: "Certidão de Nascimento ou Casamento" },
      { key: "reservista", name: "Certificado de Reservista ou dispensa" }
    ]
  },
  {
    category: "2. Documentos Profissionais e Financeiros",
    items: [
      { key: "ctps", name: "Carteira de Trabalho (CTPS)" },
      { key: "pis_pasep_nis", name: "Número do PIS/PASEP/NIS" },
      { key: "escolaridade", name: "Comprovante de Escolaridade" },
      { key: "dados_bancarios", name: "Dados Bancários para Salário" }
    ]
  },
  {
    category: "3. Documentos para Dependentes (Se houver)",
    items: [
      { key: "dep_cpf_nasc", name: "CPF e Certidão - Filhos < 14 anos" },
      { key: "dep_vacina", name: "Carteira de Vacinação (Até 6 anos)" },
      { key: "dep_escola", name: "Frequência Escolar (7 a 14 anos)" }
    ]
  },
  {
    category: "4. Obrigatório para a Admissão",
    items: [
      { key: "aso_admissional", name: "Atestado de Saúde Ocupacional (ASO) Admissional" }
    ]
  },
  {
    category: "5. Outros",
    items: [
      { key: "outro_1", name: "Outro Documento 1" },
      { key: "outro_2", name: "Outro Documento 2" },
      { key: "outro_3", name: "Outro Documento 3" }
    ]
  }
]

interface DBCollaborator {
  id?: string
  nome: string
  funcao?: string
  cpf?: string
  data_nascimento?: string
  estado_civil?: string
  endereco?: string
  telefone?: string
  email?: string
  telefone_emergencia?: string
  tamanho_calcado?: string
  filhos?: string
  tamanho_roupa?: string
  chocolate_preferido?: string
  bebida_preferida?: string
  comida_preferida?: string
  sugestao_campanhas?: string
  preferencia_incentivos?: string
  banco?: string
  agencia?: string
  conta?: string
  chave_pix?: string
  data_admissao?: string
  data_demissao?: string
  status?: string
}

function mapDBToCollaborator(db: DBCollaborator): Collaborator {
  return {
    id: db.id || "",
    name: db.nome || "",
    role: db.funcao || "",
    cpf: db.cpf || "",
    birthDate: db.data_nascimento || "",
    civilStatus: db.estado_civil || "",
    address: db.endereco || "",
    phone: db.telefone || "",
    email: db.email || "",
    emergencyPhone: db.telefone_emergencia || "",
    shoeSize: db.tamanho_calcado || "",
    children: db.filhos || "",
    clothingSize: db.tamanho_roupa || "",
    favChocolate: db.chocolate_preferido || "",
    favDrink: db.bebida_preferida || "",
    favFood: db.comida_preferida || "",
    campaignSuggestion: db.sugestao_campanhas || "",
    incentivesPreference: db.preferencia_incentivos || "",
    bank: db.banco || "",
    bankAgency: db.agencia || "",
    bankAccount: db.conta || "",
    pixKey: db.chave_pix || "",
    joinDate: db.data_admissao || "",
    exitDate: db.data_demissao || "",
    status: (db.status as "Ativo" | "Inativo") || "Ativo"
  }
}

function mapCollaboratorToDB(c: Partial<Collaborator>): DBCollaborator {
  const db: DBCollaborator = {}
  if (c.name !== undefined) db.nome = c.name
  if (c.role !== undefined) db.funcao = c.role
  if (c.cpf !== undefined) db.cpf = c.cpf
  if (c.birthDate !== undefined) db.data_nascimento = c.birthDate
  if (c.civilStatus !== undefined) db.estado_civil = c.civilStatus
  if (c.address !== undefined) db.endereco = c.address
  if (c.phone !== undefined) db.telefone = c.phone
  if (c.email !== undefined) db.email = c.email
  if (c.emergencyPhone !== undefined) db.telefone_emergencia = c.emergencyPhone
  if (c.shoeSize !== undefined) db.tamanho_calcado = c.shoeSize
  if (c.children !== undefined) db.filhos = c.children
  if (c.clothingSize !== undefined) db.tamanho_roupa = c.clothingSize
  if (c.favChocolate !== undefined) db.chocolate_preferido = c.favChocolate
  if (c.favDrink !== undefined) db.bebida_preferida = c.favDrink
  if (c.favFood !== undefined) db.comida_preferida = c.favFood
  if (c.campaignSuggestion !== undefined) db.sugestao_campanhas = c.campaignSuggestion
  if (c.incentivesPreference !== undefined) db.preferencia_incentivos = c.incentivesPreference
  if (c.bank !== undefined) db.banco = c.bank
  if (c.bankAgency !== undefined) db.agencia = c.bankAgency
  if (c.bankAccount !== undefined) db.conta = c.bankAccount
  if (c.pixKey !== undefined) db.chave_pix = c.pixKey
  if (c.joinDate !== undefined) db.data_admissao = c.joinDate
  if (c.exitDate !== undefined) db.data_demissao = c.exitDate
  if (c.status !== undefined) db.status = c.status
  return db
}

interface Collaborator {
  id: string
  name: string            // Nome Completo
  role: string            // Função
  cpf: string             // CPF
  birthDate: string       // Data de Nasc.
  civilStatus: string     // Estado Civil
  address: string         // Endereço Completo
  phone: string           // Telefone
  email: string           // E-mail
  emergencyPhone: string  // Telefone de Emergência
  shoeSize: string        // Nº Calçado
  children: string        // Filhos
  clothingSize: string    // Tamanho da Roupa
  favChocolate: string    // Chocolate Preferido
  favDrink: string        // Bebida Preferida
  favFood: string         // Comida Preferida
  campaignSuggestion: string // Sugestão de Campanhas
  incentivesPreference: string // Preferência de Incentivos
  joinDate: string        // Tempo de Casa
  exitDate?: string       // DATA DA DEMISSÃO
  status: "Ativo" | "Inativo"
  bank?: string
  bankAgency?: string
  bankAccount?: string
  pixKey?: string
}

const roleOptions = [
  { value: "CEO", label: "CEO", bg: "bg-slate-100 hover:bg-slate-200", border: "border-slate-300", text: "text-[#334155]" },
  { value: "Diretora Financeira", label: "Diretora Financeira", bg: "bg-[#dcfce7] hover:bg-[#bbf7d0]", border: "border-[#86efac]", text: "text-[#15803d]" },
  { value: "Supervisora Comercial", label: "Supervisora Comercial", bg: "bg-[#0284c7] hover:bg-[#0369a1]", border: "border-transparent", text: "text-white" },
  { value: "Promotor de Vendas", label: "Promotor de Vendas", bg: "bg-[#bae6fd] hover:bg-[#7dd3fc]", border: "border-[#38bdf8]", text: "text-[#0369a1]" },
  { value: "Supervisora Operacional", label: "Supervisora Operacional", bg: "bg-[#7c3aed] hover:bg-[#6d28d9]", border: "border-transparent", text: "text-white" },
  { value: "Operacional", label: "Operacional", bg: "bg-[#f3e8ff] hover:bg-[#e9d5ff]", border: "border-[#c084fc]", text: "text-[#6b21a8]" },
  { value: "RH", label: "RH", bg: "bg-[#2dd4bf] hover:bg-[#14b8a6]", border: "border-transparent", text: "text-[#115e59]" },
  { value: "Marketing", label: "Marketing", bg: "bg-[#b91c1c] hover:bg-[#991b1b]", border: "border-transparent", text: "text-white" },
  { value: "Serviços Gerais", label: "Serviços Gerais", bg: "bg-[#fef3c7] hover:bg-[#fde68a]", border: "border-[#fcd34d]", text: "text-[#92400e]" },
  { value: "Monitoria", label: "Monitoria", bg: "bg-[#4b5563] hover:bg-[#374151]", border: "border-transparent", text: "text-white" },
  { value: "Estagiário Operacional", label: "Estagiário Operacional", bg: "bg-[#31006f] hover:bg-[#20005a]", border: "border-transparent", text: "text-white" },
  { value: "PJ", label: "PJ", bg: "bg-black hover:bg-neutral-900", border: "border-transparent", text: "text-white" },
  { value: "Estagiário", label: "Estagiário", bg: "bg-[#1e3a8a] hover:bg-[#172554]", border: "border-transparent", text: "text-white" }
]

const initialCollaborators: Collaborator[] = []

const monthsList = [
  { value: 1, name: "Janeiro" },
  { value: 2, name: "Fevereiro" },
  { value: 3, name: "Março" },
  { value: 4, name: "Abril" },
  { value: 5, name: "Maio" },
  { value: 6, name: "Junho" },
  { value: 7, name: "Julho" },
  { value: 8, name: "Agosto" },
  { value: 9, name: "Setembro" },
  { value: 10, name: "Outubro" },
  { value: 11, name: "Novembro" },
  { value: 12, name: "Dezembro" },
]

function getBirthdayDetails(dateStr: string) {
  if (!dateStr) return null;
  let day = 99;
  let month = 99;
  
  // Limpar espaços extras
  const cleanStr = dateStr.trim();
  
  if (cleanStr.includes("/")) {
    const parts = cleanStr.split("/");
    if (parts.length >= 2) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }
  } else if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-");
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY ou outro formato
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }
  }
  
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12) {
    return null;
  }
  return { day, month };
}

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [activeTab, setActiveTab] = useState<"clt" | "aniversarios" | "ex_colaboradores">("clt")
  const [loadingTable, setLoadingTable] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("todos")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  // Document management states
  const [formDocs, setFormDocs] = useState<Record<string, File | null>>({})
  const [colabDocs, setColabDocs] = useState<Record<string, string[]>>({})
  const [activeModalColab, setActiveModalColab] = useState<Collaborator | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  
  // Form State
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")
  const [newCpf, setNewCpf] = useState("")
  const [newBirthDate, setNewBirthDate] = useState("")
  const [newCivilStatus, setNewCivilStatus] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newEmergencyPhone, setNewEmergencyPhone] = useState("")
  const [newShoeSize, setNewShoeSize] = useState("")
  const [newChildren, setNewChildren] = useState("")
  const [newClothingSize, setNewClothingSize] = useState("")
  const [newFavChocolate, setNewFavChocolate] = useState("")
  const [newFavDrink, setNewFavDrink] = useState("")
  const [newFavFood, setNewFavFood] = useState("")
  const [newCampaignSuggestion, setNewCampaignSuggestion] = useState("")
  const [newIncentivesPreference, setNewIncentivesPreference] = useState("")
  const [newJoinDate, setNewJoinDate] = useState("")
  const [newBank, setNewBank] = useState("")
  const [newBankAgency, setNewBankAgency] = useState("")
  const [newBankAccount, setNewBankAccount] = useState("")
  const [newPixKey, setNewPixKey] = useState("")

  // Load from Supabase on mount
  useEffect(() => {
    // Purge old mock custom local storage data if present
    try {
      const oldSaved = localStorage.getItem("shark_hr_collaborators_spreadsheet")
      if (oldSaved && (oldSaved.includes("Robson Ramos") || oldSaved.includes("Nathali Beneduzi"))) {
        localStorage.removeItem("shark_hr_collaborators_spreadsheet")
      }
    } catch (e) {
      // ignore
    }

    async function loadCollaborators() {
      setLoadingTable(true)
      setSupabaseError(null)
      try {
        const { data, error } = await supabase
          .from("hr_colaboradores")
          .select("*")
          .order("nome", { ascending: true })

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          const loaded = data.map(mapDBToCollaborator)
          setCollaborators(loaded)
        } else {
          setCollaborators([])
        }
      } catch (err) {
        console.error("Erro ao carregar colaboradores do Supabase:", err)
        const pgError = err as { message?: string; code?: string; details?: string; hint?: string };
        const detailedError = pgError ? `${pgError.message || JSON.stringify(pgError)} [Código: ${pgError.code || 'n/a'}] [Detalhes: ${pgError.details || 'n/a'}] [Dica: ${pgError.hint || 'n/a'}]` : "Erro desconhecido";
        setSupabaseError(detailedError)
        // Fallback to local storage if Supabase is down
        const saved = localStorage.getItem("shark_hr_collaborators_spreadsheet")
        if (saved) {
          try {
            setCollaborators(JSON.parse(saved))
          } catch {
            setCollaborators([])
          }
        } else {
          setCollaborators([])
        }
      } finally {
        setLoadingTable(false)
      }
    }

    loadCollaborators()
  }, [])

  const saveCollaborators = (updated: Collaborator[]) => {
    setCollaborators(updated)
    localStorage.setItem("shark_hr_collaborators_spreadsheet", JSON.stringify(updated))
  }

  const refreshColabDocs = async (colabId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('colaboradores-documentos')
        .list(colabId)
      if (data) {
        setColabDocs(prev => ({
          ...prev,
          [colabId]: data.map(f => f.name)
        }))
      }
    } catch (e) {
      console.error("Erro ao atualizar lista de documentos:", e)
    }
  }

  useEffect(() => {
    if (collaborators.length === 0) return;
    
    async function fetchDocs() {
      const docsMap: Record<string, string[]> = {}
      await Promise.all(collaborators.map(async (colab) => {
        if (!colab.id || colab.id.startsWith('temp-')) return;
        try {
          const { data, error } = await supabase.storage
            .from('colaboradores-documentos')
            .list(colab.id)
          if (data) {
            docsMap[colab.id] = data.map(f => f.name)
          }
        } catch (err) {
          console.error("Error listing docs:", err)
        }
      }));
      setColabDocs(docsMap)
    }
    
    fetchDocs()
  }, [collaborators])

  const handleUploadDocument = async (colabId: string, docKey: string, file: File) => {
    setIsUploadingDoc(true)
    try {
      // 1. check and delete existing files starting with docKey (e.g. if we upload a .png over a .pdf)
      const { data: existingFiles } = await supabase.storage
        .from('colaboradores-documentos')
        .list(colabId)
        
      if (existingFiles) {
        const toDelete = existingFiles
          .filter(f => f.name.split('.')[0] === docKey)
          .map(f => `${colabId}/${f.name}`)
        if (toDelete.length > 0) {
          await supabase.storage.from('colaboradores-documentos').remove(toDelete)
        }
      }
      
      // 2. Upload the new file
      const fileExt = file.name.split('.').pop() || 'pdf'
      const filePath = `${colabId}/${docKey}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('colaboradores-documentos')
        .upload(filePath, file, { cacheControl: '0', upsert: true })
        
      if (uploadError) throw uploadError
      
      // 3. Re-fetch documents for this collaborator
      await refreshColabDocs(colabId)
      toast.success("Documento enviado com sucesso!")
    } catch (err) {
      console.error("Erro ao enviar documento:", err)
      toast.error("Erro ao enviar documento")
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (colabId: string, docKey: string) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;
    try {
      const { data: existingFiles } = await supabase.storage
        .from('colaboradores-documentos')
        .list(colabId)
        
      if (existingFiles) {
        const toDelete = existingFiles
          .filter(f => f.name.split('.')[0] === docKey)
          .map(f => `${colabId}/${f.name}`)
        if (toDelete.length > 0) {
          await supabase.storage.from('colaboradores-documentos').remove(toDelete)
        }
      }
      await refreshColabDocs(colabId)
      toast.success("Documento removido com sucesso!")
    } catch (err) {
      console.error("Erro ao deletar documento:", err)
      toast.error("Erro ao deletar documento")
    }
  }

  const handleFormDocChange = (key: string, file: File | null) => {
    setFormDocs(prev => ({
      ...prev,
      [key]: file
    }))
  }

  const updateCell = async (id: string, field: keyof Collaborator, value: string) => {
    // Optimistic state update
    const updated = collaborators.map(c => {
      if (c.id === id) {
        if (field === "status") {
          if (value === "Inativo") {
            return {
              ...c,
              status: "Inativo",
              exitDate: c.exitDate || new Date().toLocaleDateString("pt-BR"),
              // preenchendo somente com os dados das colunas da tabela de lá (Ex-colaboradores)
              joinDate: "",
              bank: "",
              bankAgency: "",
              bankAccount: "",
              pixKey: "",
              shoeSize: "",
              children: "",
              clothingSize: "",
              favChocolate: "",
              favDrink: "",
              favFood: "",
              campaignSuggestion: "",
              incentivesPreference: ""
            } as Collaborator
          } else if (value === "Ativo") {
            return {
              ...c,
              status: "Ativo",
              joinDate: c.joinDate || new Date().toLocaleDateString("pt-BR"),
              exitDate: ""
            } as Collaborator
          }
        }
        return { ...c, [field]: value } as Collaborator
      }
      return c
    })
    saveCollaborators(updated)

    try {
      const colab = updated.find(c => c.id === id)
      if (!colab) return

      let mappedField: Partial<DBCollaborator> = {}
      if (field === "status") {
        // Sync the entire transitioned object to Supabase
        mappedField = mapCollaboratorToDB(colab)
      } else {
        mappedField = mapCollaboratorToDB({ [field]: value })
      }

      const { error } = await supabase
        .from("hr_colaboradores")
        .update(mappedField)
        .eq("id", id)

      if (error) {
        throw error
      }
    } catch (err) {
      console.error("Erro ao atualizar colaborador no Supabase:", err)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      const updated = collaborators.filter(c => c.id !== deleteConfirmId)
      saveCollaborators(updated)

      try {
        const { error } = await supabase
          .from("hr_colaboradores")
          .delete()
          .eq("id", deleteConfirmId)

        if (error) {
          throw error
        }
      } catch (err) {
        console.error("Erro ao deletar colaborador do Supabase:", err)
      } finally {
        setDeleteConfirmId(null)
      }
    }
  }

  const handleCreateCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return

    // Temporary optimistic representation until saved in database
    const tempId = `temp-${Date.now()}`
    const colabData: Partial<Collaborator> = {
      name: newName,
      role: newRole,
      cpf: newCpf || "",
      birthDate: newBirthDate || "",
      civilStatus: newCivilStatus || "",
      address: newAddress || "",
      phone: newPhone || "",
      email: newEmail || "",
      emergencyPhone: newEmergencyPhone || "",
      shoeSize: newShoeSize || "",
      children: newChildren || "",
      clothingSize: newClothingSize || "",
      favChocolate: newFavChocolate || "",
      favDrink: newFavDrink || "",
      favFood: newFavFood || "",
      campaignSuggestion: newCampaignSuggestion || "",
      incentivesPreference: newIncentivesPreference || "",
      bank: newBank || "",
      bankAgency: newBankAgency || "",
      bankAccount: newBankAccount || "",
      pixKey: newPixKey || "",
      joinDate: newJoinDate || new Date().toLocaleDateString("pt-BR"),
      status: "Ativo"
    }

    const tempColab: Collaborator = {
      id: tempId,
      ...colabData as Omit<Collaborator, "id">
    }

    setCollaborators(prev => [tempColab, ...prev])

    try {
      const dbRow = mapCollaboratorToDB(colabData)
      const { data, error } = await supabase
        .from("hr_colaboradores")
        .insert([dbRow])
        .select()

      if (error) {
        throw error
      }

      if (data && data[0]) {
        const savedColab = mapDBToCollaborator(data[0])
        setCollaborators(prev => prev.map(c => c.id === tempId ? savedColab : c))

        // Upload documents if any exist in formDocs
        const docKeys = Object.keys(formDocs).filter(k => formDocs[k] !== null)
        if (docKeys.length > 0) {
          const loadingToast = toast.loading("Enviando documentos estruturados para o banco...")
          try {
            for (const docKey of docKeys) {
              const file = formDocs[docKey]
              if (file) {
                const fileExt = file.name.split('.').pop() || 'pdf'
                const filePath = `${savedColab.id}/${docKey}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                  .from('colaboradores-documentos')
                  .upload(filePath, file, { cacheControl: '0', upsert: true })
                if (uploadError) {
                  console.error(`Erro ao subir ${docKey}:`, uploadError)
                }
              }
            }
            await refreshColabDocs(savedColab.id)
            toast.success("Colaborador cadastrado e documentos arquivados com sucesso!", { id: loadingToast })
          } catch (uploadException) {
            console.error("Erro geral no upload:", uploadException)
            toast.error("Colaborador cadastrado, mas houve falha ao salvar alguns documentos.", { id: loadingToast })
          }
        } else {
          toast.success("Colaborador cadastrado com sucesso!")
        }
      }
    } catch (err) {
      console.error("Erro ao salvar colaborador no Supabase:", err)
      toast.error("Erro ao cadastrar colaborador")
    }

    // Reset Form
    setNewName("")
    setNewRole("")
    setNewCpf("")
    setNewBirthDate("")
    setNewCivilStatus("")
    setNewAddress("")
    setNewPhone("")
    setNewEmail("")
    setNewEmergencyPhone("")
    setNewShoeSize("")
    setNewChildren("")
    setNewClothingSize("")
    setNewFavChocolate("")
    setNewFavDrink("")
    setNewFavFood("")
    setNewCampaignSuggestion("")
    setNewIncentivesPreference("")
    setNewBank("")
    setNewBankAgency("")
    setNewBankAccount("")
    setNewPixKey("")
    setNewJoinDate("")
    setFormDocs({})
  }

  const activeCollaborators = collaborators.filter(c => c.status !== "Inativo")
  const inactiveCollaborators = collaborators.filter(c => c.status === "Inativo")

  const currentMonthNum = new Date().getMonth() + 1
  const activeBirthdaysCurrentMonth = activeCollaborators.filter(c => {
    if (!c.birthDate) return false
    const details = getBirthdayDetails(c.birthDate)
    return details && details.month === currentMonthNum
  })

  const filteredCollaborators = activeCollaborators.filter(c => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      (c.name || "").toLowerCase().includes(query) || 
      (c.role || "").toLowerCase().includes(query) || 
      (c.cpf || "").toLowerCase().includes(query) || 
      (c.email || "").toLowerCase().includes(query) || 
      (c.phone || "").toLowerCase().includes(query) || 
      (c.address || "").toLowerCase().includes(query)

    const matchesRole = filterRole === "todos" || c.role === filterRole
    return matchesSearch && matchesRole
  })

  const filteredExCollaborators = inactiveCollaborators.filter(c => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      (c.name || "").toLowerCase().includes(query) || 
      (c.role || "").toLowerCase().includes(query) || 
      (c.cpf || "").toLowerCase().includes(query) || 
      (c.email || "").toLowerCase().includes(query) || 
      (c.phone || "").toLowerCase().includes(query) || 
      (c.address || "").toLowerCase().includes(query)

    const matchesRole = filterRole === "todos" || c.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="COLABORADORES" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores Ativos</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {activeCollaborators.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aniversariantes do Mês</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {activeBirthdaysCurrentMonth.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Cake className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores Inativos</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {inactiveCollaborators.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <UserMinus className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs style navigation identical to customers/clientes page */}
        <div className="flex flex-wrap gap-1 px-4 sm:px-8 -mb-[1px]">
          <button
            type="button"
            onClick={() => setActiveTab("clt")}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 cursor-pointer",
              activeTab === "clt"
                ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            id="tab-clt"
          >
            COLABORADORES
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("aniversarios")}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 cursor-pointer",
              activeTab === "aniversarios"
                ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            id="tab-aniversarios"
          >
            CALENDÁRIO DE ANIVERSÁRIOS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ex_colaboradores")}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 cursor-pointer",
              activeTab === "ex_colaboradores"
                ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            id="tab-ex-colaboradores"
          >
            EX COLABORADORES
          </button>
        </div>

        {activeTab === "clt" ? (
          <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl rounded-tl-none shadow-sm animate-in fade-in duration-300">
            <CardContent className="p-0">
              {/* Form Cadastro */}
              <div className="bg-slate-50/50 p-6 border-b border-slate-150">
                <form onSubmit={handleCreateCollaborator} className="space-y-6">
                  {/* Grid 1: Informações Pessoais Principais */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Informações Básicas e Administrativas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="space-y-1.5 col-span-1 md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo *</label>
                        <input 
                          type="text" 
                          required
                          value={newName} 
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">CPF</label>
                        <input 
                          type="text" 
                          value={newCpf} 
                          onChange={(e) => setNewCpf(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Data de Nasc.</label>
                        <input 
                          type="date" 
                          value={newBirthDate} 
                          onChange={(e) => setNewBirthDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função (Cargo)</label>
                        <select 
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none cursor-pointer focus:border-slate-350 text-slate-700"
                        >
                          <option value=""></option>
                          {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.value}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Admissão</label>
                        <input 
                          type="date" 
                          value={newJoinDate} 
                          onChange={(e) => setNewJoinDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Dados Bancários */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Dados Bancários</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Banco</label>
                        <input 
                          type="text" 
                          value={newBank} 
                          onChange={(e) => setNewBank(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Agência</label>
                        <input 
                          type="text" 
                          value={newBankAgency} 
                          onChange={(e) => setNewBankAgency(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Conta-Bancária</label>
                        <input 
                          type="text" 
                          value={newBankAccount} 
                          onChange={(e) => setNewBankAccount(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Chave Pix</label>
                        <input 
                          type="text" 
                          value={newPixKey} 
                          onChange={(e) => setNewPixKey(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Contatos e Endereço */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">3. Contatos, Família e Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Telefone</label>
                        <input 
                          type="text" 
                          value={newPhone} 
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail</label>
                        <input 
                          type="email" 
                          value={newEmail} 
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Fone de Emergência</label>
                        <input 
                          type="text" 
                          value={newEmergencyPhone} 
                          onChange={(e) => setNewEmergencyPhone(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Filhos</label>
                        <input 
                          type="text" 
                          value={newChildren} 
                          onChange={(e) => setNewChildren(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Endereço Completo</label>
                        <input 
                          type="text" 
                          value={newAddress} 
                          onChange={(e) => setNewAddress(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Estado Civil</label>
                        <input 
                          type="text" 
                          value={newCivilStatus} 
                          onChange={(e) => setNewCivilStatus(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Preferências & Mimos */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">4. Mimos, Tamanhos e Preferências (Afinidade Social)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Tamanho da Roupa</label>
                        <input 
                          type="text" 
                          value={newClothingSize} 
                          onChange={(e) => setNewClothingSize(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nº do Calçado</label>
                        <input 
                          type="text" 
                          value={newShoeSize} 
                          onChange={(e) => setNewShoeSize(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Chocolate Preferido</label>
                        <input 
                          type="text" 
                          value={newFavChocolate} 
                          onChange={(e) => setNewFavChocolate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Bebida Preferida</label>
                        <input 
                          type="text" 
                          value={newFavDrink} 
                          onChange={(e) => setNewFavDrink(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Comida Preferida</label>
                        <input 
                          type="text" 
                          value={newFavFood} 
                          onChange={(e) => setNewFavFood(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Sugestão de Campanhas</label>
                        <input 
                          type="text" 
                          value={newCampaignSuggestion} 
                          onChange={(e) => setNewCampaignSuggestion(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Preferência de Incentivos</label>
                        <input 
                          type="text" 
                          value={newIncentivesPreference} 
                          onChange={(e) => setNewIncentivesPreference(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ANEXAR DOCUMENTOS */}
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#002060]" />
                      ANEXAR DOCUMENTOS COBRADOS NA ADMISSÃO
                    </h3>
                    
                    <div className="space-y-6 text-left">
                      {DOCUMENT_TYPES.map((cat) => (
                        <div key={cat.category} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
                            {cat.category}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cat.items.map((item) => {
                              const selectedFile = formDocs[item.key];
                              return (
                                <div key={item.key} className="flex flex-col gap-1.5 p-2 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                                  <label className="text-[10px] font-bold text-slate-600 truncate block">
                                    {item.name}
                                  </label>
                                  {selectedFile ? (
                                    <div className="flex items-center justify-between gap-2 p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800">
                                      <span className="text-[10px] font-semibold truncate max-w-[120px]">
                                        {selectedFile.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleFormDocChange(item.key, null)}
                                        className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 p-0.5 rounded-md transition-all cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center gap-1.5 py-1.5 px-3 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer transition-all text-slate-500 hover:text-slate-700 select-none">
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-black uppercase tracking-wider">Selecionar</span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleFormDocChange(item.key, file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setNewName("")
                        setNewRole("")
                        setNewCpf("")
                        setNewBirthDate("")
                        setNewCivilStatus("")
                        setNewAddress("")
                        setNewPhone("")
                        setNewEmail("")
                        setNewEmergencyPhone("")
                        setNewShoeSize("")
                        setNewChildren("")
                        setNewClothingSize("")
                        setNewFavChocolate("")
                        setNewFavDrink("")
                        setNewFavFood("")
                        setNewCampaignSuggestion("")
                        setNewIncentivesPreference("")
                        setNewJoinDate("")
                        setFormDocs({})
                      }}
                      className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                    >
                      Limpar Campos
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-6 h-[38px] font-bold text-[10px] uppercase tracking-widest"
                    >
                      ADICIONAR COLABORADOR
                    </Button>
                  </div>
                </form>
              </div>

              {/* Campo de Pesquisa */}
              <div className="p-6 flex items-center justify-between gap-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome, função, CPF, telefone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                  />
                </div>
              </div>

              {supabaseError && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 animate-in fade-in duration-250">
                  <span className="font-bold uppercase tracking-wider block mb-1">Erro de Conectividade do Supabase:</span>
                  {supabaseError}
                </div>
              )}

            {/* List Table */}
            <div className="overflow-x-auto min-h-[500px] px-6">
              <table className="w-full text-left border-collapse table-fixed min-w-[3700px]">
                <thead>
                  <tr className="bg-[#171717] text-white">
                    <th className="w-[220px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest rounded-l-xl">Nome Completo</th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">Função</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">CPF</th>
                    <th className="w-[120px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Admissão</th>
                    <th className="w-[130px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Banco</th>
                    <th className="w-[100px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Agência</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Conta-Bancária</th>
                    <th className="w-[160px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Chave Pix</th>
                    <th className="w-[110px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Data de Nasc.</th>
                    <th className="w-[120px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Estado Civil</th>
                    <th className="w-[320px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Endereço Completo</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Telefone</th>
                    <th className="w-[220px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">E-mail</th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Telefone de Emergência</th>
                    <th className="w-[100px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Nº Calçado</th>
                    <th className="w-[110px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Filhos</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Tamanho da Roupa</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Chocolate Preferido</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Bebida Preferida</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Comida Preferida</th>
                    <th className="w-[250px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Sugestão de Campanhas</th>
                    <th className="w-[220px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Preferência de Incentivos</th>
                    <th className="w-[120px] px-2 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center animate-none">SITUAÇÃO</th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center rounded-r-xl">DOCUMENTOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTable ? (
                    <tr>
                      <td colSpan={24} className="text-center py-20 bg-slate-50/10">
                        <div className="flex flex-col items-center justify-center space-y-3 animate-pulse">
                          <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Carregando planilha de colaboradores...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={24} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileSpreadsheet className="w-10 h-10 text-slate-350" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum colaborador encontrado</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCollaborators.map((colab) => (
                      <tr key={colab.id} className="hover:bg-slate-50/20 transition-all font-semibold align-middle whitespace-nowrap">
                        {/* 1. NOME COMPLETO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.name} 
                            onChange={(val) => updateCell(colab.id, "name", val)}
                            placeholder="Adicionar Nome..."
                            fontClass="font-bold text-slate-800 uppercase text-[11px]"
                          />
                        </td>

                        {/* 2. FUNÇÃO (Pill select dropdown) */}
                        <td className="px-4 py-3.5 text-center">
                          <PillDropdown 
                            value={colab.role} 
                            onChange={(val) => updateCell(colab.id, "role", val)}
                            options={roleOptions}
                          />
                        </td>

                        {/* 3. CPF */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.cpf} 
                            onChange={(val) => updateCell(colab.id, "cpf", val)}
                            placeholder="---.---.------"
                            fontClass="font-mono text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* ADMISSÃO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.joinDate} 
                            onChange={(val) => updateCell(colab.id, "joinDate", val)}
                            placeholder="Admissão..."
                            fontClass="font-mono text-slate-605 text-[11px]"
                          />
                        </td>

                        {/* BANCO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.bank} 
                            onChange={(val) => updateCell(colab.id, "bank", val)}
                            placeholder="Banco..."
                            fontClass="text-slate-605 text-[11px]"
                          />
                        </td>

                        {/* AGÊNCIA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.bankAgency} 
                            onChange={(val) => updateCell(colab.id, "bankAgency", val)}
                            placeholder="Agência..."
                            fontClass="font-mono text-slate-605 text-[11px]"
                          />
                        </td>

                        {/* CONTA-BANCÁRIA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.bankAccount} 
                            onChange={(val) => updateCell(colab.id, "bankAccount", val)}
                            placeholder="Conta..."
                            fontClass="font-mono text-slate-605 text-[11px]"
                          />
                        </td>

                        {/* CHAVE PIX */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.pixKey} 
                            onChange={(val) => updateCell(colab.id, "pixKey", val)}
                            placeholder="Chave Pix..."
                            fontClass="text-slate-605 text-[11px]"
                          />
                        </td>

                        {/* 4. DATA DE NASC. */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.birthDate} 
                            onChange={(val) => updateCell(colab.id, "birthDate", val)}
                            placeholder="DD/MM/AAAA"
                            fontClass="font-mono text-slate-500 text-[11px]"
                          />
                        </td>

                        {/* 5. ESTADO CIVIL */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.civilStatus} 
                            onChange={(val) => updateCell(colab.id, "civilStatus", val)}
                            placeholder="Solteiro/Casado"
                            fontClass="text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 6. ENDEREÇO COMPLETO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.address} 
                            onChange={(val) => updateCell(colab.id, "address", val)}
                            placeholder="Endereço eletrônico..."
                            fontClass="text-slate-600 text-[11px] font-medium"
                          />
                        </td>

                        {/* 7. TELEFONE */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.phone} 
                            onChange={(val) => updateCell(colab.id, "phone", val)}
                            placeholder="(--) -----_----"
                            fontClass="font-mono text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 8. E-MAIL */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.email} 
                            onChange={(val) => updateCell(colab.id, "email", val)}
                            placeholder="nome@email.com"
                            fontClass="text-[#0369a1] text-[11px] font-medium underline lowercase cursor-pointer"
                          />
                        </td>

                        {/* 9. TELEFONE DE EMERGÊNCIA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.emergencyPhone} 
                            onChange={(val) => updateCell(colab.id, "emergencyPhone", val)}
                            placeholder="Contato emergência..."
                            fontClass="font-mono text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 10. Nº CALÇADO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.shoeSize} 
                            onChange={(val) => updateCell(colab.id, "shoeSize", val)}
                            placeholder="Nº"
                            fontClass="text-slate-600 text-[11px] text-center"
                          />
                        </td>

                        {/* 11. FILHOS */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.children} 
                            onChange={(val) => updateCell(colab.id, "children", val)}
                            placeholder="Não / Qtd..."
                            fontClass="text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 12. TAMANHO DA ROUPA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.clothingSize} 
                            onChange={(val) => updateCell(colab.id, "clothingSize", val)}
                            placeholder="PP, P, M, G, GG..."
                            fontClass="text-slate-600 text-[11px] font-extrabold text-center"
                          />
                        </td>

                        {/* 13. CHOCOLATE PREFERIDO */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.favChocolate} 
                            onChange={(val) => updateCell(colab.id, "favChocolate", val)}
                            placeholder="Ex: Milka Oreo"
                            fontClass="text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 14. BEBIDA PREFERIDA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.favDrink} 
                            onChange={(val) => updateCell(colab.id, "favDrink", val)}
                            placeholder="Ex: Aperol Spritz"
                            fontClass="text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 15. COMIDA PREFERIDA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.favFood} 
                            onChange={(val) => updateCell(colab.id, "favFood", val)}
                            placeholder="Ex: Frutos do mar"
                            fontClass="text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* 16. SUGESTÃO DE CAMPANHAS */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.campaignSuggestion} 
                            onChange={(val) => updateCell(colab.id, "campaignSuggestion", val)}
                            placeholder="Ideias e melhorias..."
                            fontClass="text-slate-650 text-[11px]"
                          />
                        </td>

                        {/* 17. PREFERÊNCIA DE INCENTIVOS */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.incentivesPreference} 
                            onChange={(val) => updateCell(colab.id, "incentivesPreference", val)}
                            placeholder="Vale cultura, dinheiro..."
                            fontClass="text-slate-650 text-[11px]"
                          />
                        </td>

                        {/* SITUAÇÃO (ATIVO/DESATIVAR) ROW BUTTON */}
                        <td className="px-2 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => updateCell(colab.id, "status", "Inactive" && "Inativo")}
                            className="group w-[100px] h-[28px] mx-auto flex items-center justify-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-rose-50 hover:text-rose-700 border border-emerald-200 hover:border-rose-200 rounded-lg transition-all uppercase tracking-wider text-[9.5px] cursor-pointer"
                            title="Desativar colaborador (mover para Ex-colaboradores)"
                          >
                            <span className="group-hover:hidden">Ativo</span>
                            <span className="group-hover:inline hidden">Desativar</span>
                          </button>
                        </td>

                        {/* DOCUMENTO ROW LINK/MODAL CONTROL */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveModalColab(colab)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-[#002060]/5 hover:border-[#002060]/30 hover:text-[#002060] transition-all rounded-xl text-[10.5px] font-black uppercase text-slate-700 cursor-pointer shadow-sm text-center justify-center"
                          >
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            DOCUMENTOS ({colabDocs[colab.id]?.length || 0})
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        ) : activeTab === "aniversarios" ? (
          <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl rounded-tl-none shadow-sm animate-in fade-in duration-300">
            <CardContent className="p-6">
              <div className="mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[#002060]" />
                  Quadro Geral de Aniversários
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Calendário estruturado por mês com as datas de nascimento de todos os colaboradores ativos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
                {monthsList.map((m) => {
                  const itemBirthdays = activeCollaborators
                    .filter(c => {
                      if (!c.birthDate) return false;
                      const details = getBirthdayDetails(c.birthDate);
                      return details && details.month === m.value;
                    })
                    .sort((a, b) => {
                      const detA = getBirthdayDetails(a.birthDate);
                      const detB = getBirthdayDetails(b.birthDate);
                      return (detA?.day || 99) - (detB?.day || 99);
                    });

                  // Exibir exatamente 4 linhas para alinhamento estético similar ao formato de planilha Excel
                  const maxRows = 4;
                  const displayRows: { name: string; date: string; isPlaceholder?: boolean }[] = itemBirthdays.map(b => ({
                    name: b.name,
                    date: b.birthDate
                  }));
                  
                  while (displayRows.length < maxRows) {
                    displayRows.push({ name: "", date: "", isPlaceholder: true });
                  }

                  return (
                    <div key={m.value} className="border border-slate-200 rounded-xl overflow-hidden shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] bg-white flex flex-col justify-between" id={`month-box-${m.value}`}>
                      <div>
                        {/* Título do Mês */}
                        <div className="bg-[#171717] text-center text-[10.5px] font-black uppercase text-white py-2 tracking-widest border-b border-[#171717]/80 leading-none">
                          {m.name}
                        </div>

                        {/* Cabeçalho da Mini Tabela */}
                        <div className="grid grid-cols-10 bg-[#171717]/95 text-white text-[8.5px] font-black uppercase tracking-wider py-1 border-b border-[#171717]/80 leading-none">
                          <div className="col-span-7 px-3 text-left border-r border-[#171717]/35">Nome</div>
                          <div className="col-span-3 text-center">Data</div>
                        </div>

                        {/* Linhas de aniversários */}
                        <div className="divide-y divide-slate-100 flex flex-col">
                          {displayRows.map((row, idx) => (
                            <div key={idx} className={cn("grid grid-cols-10 h-8 items-center text-[10.5px] font-semibold transition-colors hover:bg-slate-50/20", row.isPlaceholder ? "bg-slate-50/5" : "bg-white")}>
                              <div className="col-span-7 px-3 font-bold text-slate-700 truncate border-r border-slate-100 h-full flex items-center uppercase text-[10px]">
                                {row.name}
                              </div>
                              <div className={cn("col-span-3 text-center font-mono h-full flex items-center justify-center text-[10px]", row.isPlaceholder ? "text-slate-200" : "text-slate-600 font-bold")}>
                                {row.isPlaceholder ? "──/──/──" : row.date}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl rounded-tl-none shadow-sm animate-in fade-in duration-300">
            <CardContent className="p-0">
              <div className="p-6 flex items-center justify-between gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome, função, CPF, telefone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                  />
                </div>
              </div>

              {/* List Table */}
              <div className="overflow-x-auto min-h-[500px] px-6 py-4">
                <table className="w-full text-left border-collapse table-fixed min-w-[1900px]">
                  <thead>
                    <tr className="bg-[#171717] text-white">
                      <th className="w-[220px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest animate-none rounded-l-xl">Nome Completo</th>
                      <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center animate-none">Função</th>
                      <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest animate-none">CPF</th>
                      <th className="w-[110px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest animate-none">Data de Nasc.</th>
                      <th className="w-[120px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Estado Civil</th>
                      <th className="w-[320px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Endereço Completo</th>
                      <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Telefone</th>
                      <th className="w-[220px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">E-mail</th>
                      <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Telefone de Emergência</th>
                      <th className="w-[160px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center animate-none">DATA DA DEMISSÃO</th>
                      <th className="w-[120px] px-2 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center animate-none">SITUAÇÃO</th>
                      <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center rounded-r-xl">DOCUMENTOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingTable ? (
                      <tr>
                        <td colSpan={12} className="text-center py-20 bg-slate-50/10">
                          <div className="flex flex-col items-center justify-center space-y-3 animate-pulse">
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Carregando planilha de ex-colaboradores...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredExCollaborators.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-20 bg-slate-50/10 border-none">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <FileSpreadsheet className="w-10 h-10 text-slate-350" />
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum ex-colaborador encontrado</p>
                            <p className="text-slate-400 text-[9px] font-semibold">Tabela vazia ou sem correspondências.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredExCollaborators.map((colab) => (
                        <tr key={colab.id} className="hover:bg-slate-50/40 transition-colors uppercase font-bold text-slate-700">
                          {/* Nome Completo */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.name} 
                              onChange={(val) => updateCell(colab.id, "name", val)}
                              placeholder=""
                              fontClass="font-bold text-slate-800 text-[11px]"
                            />
                          </td>

                          {/* Funcao */}
                          <td className="px-4 py-3.5 text-center">
                            <PillDropdown 
                              value={colab.role} 
                              options={roleOptions} 
                              onChange={(val) => updateCell(colab.id, "role", val)} 
                            />
                          </td>

                          {/* CPF */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.cpf} 
                              onChange={(val) => updateCell(colab.id, "cpf", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* Data de Nasc. */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.birthDate} 
                              onChange={(val) => updateCell(colab.id, "birthDate", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* Estado Civil */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.civilStatus} 
                              onChange={(val) => updateCell(colab.id, "civilStatus", val)}
                              placeholder=""
                              fontClass="text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* Endereco */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.address} 
                              onChange={(val) => updateCell(colab.id, "address", val)}
                              placeholder=""
                              fontClass="text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* Telefone */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.phone} 
                              onChange={(val) => updateCell(colab.id, "phone", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.email} 
                              onChange={(val) => updateCell(colab.id, "email", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11.5px] lowercase"
                            />
                          </td>

                          {/* Telefone de Emergencia */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.emergencyPhone} 
                              onChange={(val) => updateCell(colab.id, "emergencyPhone", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* DATA DA DEMISSÃO */}
                          <td className="px-4 py-3.5">
                            <TextInputCell 
                              value={colab.exitDate || ""} 
                              onChange={(val) => updateCell(colab.id, "exitDate", val)}
                              placeholder=""
                              fontClass="font-mono text-slate-650 text-[11px]"
                            />
                          </td>

                          {/* SITUAÇÃO (INATIVO/ATIVAR) ROW BUTTON */}
                          <td className="px-2 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => updateCell(colab.id, "status", "Ativo")}
                              className="group w-[100px] h-[28px] mx-auto flex items-center justify-center text-xs font-bold text-rose-700 bg-rose-50 hover:bg-emerald-50 hover:text-emerald-700 border border-rose-200 hover:border-emerald-200 rounded-lg transition-all uppercase tracking-wider text-[9.5px] cursor-pointer"
                              title="Reativar colaborador (mover para Colaboradores)"
                            >
                              <span className="group-hover:hidden">Inativo</span>
                              <span className="group-hover:inline hidden">Ativar</span>
                            </button>
                          </td>

                          {/* DOCUMENTO ROW LINK/MODAL CONTROL */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveModalColab(colab)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-[#002060]/5 hover:border-[#002060]/30 hover:text-[#002060] transition-all rounded-xl text-[10.5px] font-black uppercase text-slate-700 cursor-pointer shadow-sm text-center justify-center"
                            >
                              <Paperclip className="w-3.5 h-3.5 shrink-0" />
                              DOCUMENTOS ({colabDocs[colab.id]?.length || 0})
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* REPOSITÓRIO DE DOCUMENTOS MODAL */}
      <AnimatePresence>
        {activeModalColab && (
          <div className="fixed inset-0 bg-[#0d2040]/40 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4" id="docs-repository-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
              id="docs-repository-modal"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-105 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#002060]" />
                    Pasta Digital de {activeModalColab.name}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                    Histórico consolidado de documentos no Bucket Seguro da Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalColab(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrolling List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isUploadingDoc && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-[10px] font-black uppercase tracking-wider text-center animate-pulse">
                    Enviando arquivo ao repositório do colaborador...
                  </div>
                )}
                
                <div className="space-y-6">
                  {DOCUMENT_TYPES.map((cat) => (
                    <div key={cat.category} className="bg-slate-50/40 rounded-2xl p-4 border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-4 pb-1 border-b border-slate-200">
                        {cat.category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.items.map((item) => {
                          const uploadedFile = colabDocs[activeModalColab.id]?.find(f => f.split('.')[0] === item.key);
                          const publicUrl = uploadedFile 
                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/colaboradores-documentos/${activeModalColab.id}/${uploadedFile}`
                            : null;
                          
                          return (
                            <div key={item.key} className="flex items-center justify-between gap-4 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-350 transition-all">
                              <div className="min-w-0 pr-1 flex-1">
                                <span className="text-[10.5px] font-black text-slate-700 block truncate">
                                  {item.name}
                                </span>
                                {uploadedFile ? (
                                  <span className="text-[8.5px] font-mono font-extrabold text-emerald-600 uppercase flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                    ENVIADO ({uploadedFile.split('.').pop()?.toUpperCase()})
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block mt-1">
                                    Não enviado
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                {publicUrl ? (
                                  <>
                                    <a
                                      href={publicUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-[30px] px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-750 transition-all flex items-center justify-center gap-1 text-[9.5px] font-black uppercase shadow-sm"
                                      title="Abrir arquivo em nova guia"
                                    >
                                      <Eye className="w-3.5 h-3.5 shrink-0" />
                                      Ver
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDocument(activeModalColab.id, item.key)}
                                      className="h-[30px] w-[30px] flex items-center justify-center bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl text-rose-600 transition-all cursor-pointer shadow-sm"
                                      title="Deletar este anexo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="h-[30px] px-3 bg-[#0d2040] hover:bg-[#0d2040]/90 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase cursor-pointer shadow-md">
                                    <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                                    Sobe
                                    <input
                                      type="file"
                                      className="hidden"
                                      disabled={isUploadingDoc}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadDocument(activeModalColab.id, item.key, file);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 flex items-center justify-end border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setActiveModalColab(null)}
                  className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-5 h-[36px] font-bold text-[9px] uppercase tracking-widest cursor-pointer shadow-md animate-none"
                >
                  Fechar Pasta Digital
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMAÇÃO DE DELEÇÃO CUSTOMIZADA */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4" id="delete-confirmation-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden"
              id="delete-confirmation-modal"
            >
              <div className="p-5 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  Excluir Colaborador?
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Tem certeza que deseja excluir permanentemente o colaborador{" "}
                  <strong>
                    {collaborators.find(c => c.id === deleteConfirmId)?.name || "este registro"}
                  </strong>{" "}
                  do sistema? Esta operação é definitiva.
                </p>
              </div>
              <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-lg transition-all cursor-pointer"
                  id="btn-cancel-delete"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-[10px] font-black uppercase tracking-widest text-white rounded-lg transition-all cursor-pointer shadow-sm"
                  id="btn-confirm-delete"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -------------------------------------------------------------
// INLINE TEXT COMPONENT WITH DIRECT ON-EDIT BINDINGS
// -------------------------------------------------------------
function TextInputCell({ 
  value, 
  onChange, 
  placeholder = "", 
  fontClass = "text-slate-600" 
}: { 
  value: string
  onChange: (v: string) => void
  placeholder?: string
  fontClass?: string
}) {
  const [localVal, setLocalVal] = useState(value || "")

  useEffect(() => {
    setLocalVal(value || "")
  }, [value])

  const handleBlur = () => {
    if (localVal !== (value || "")) {
      onChange(localVal)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    }
  }

  return (
    <input 
      type="text" 
      value={localVal} 
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder=""
      className={cn(
        "w-full bg-transparent border border-transparent rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none transition-all truncate hover:bg-slate-100/40 focus:border-slate-300 focus:bg-white focus:ring-1 focus:ring-slate-300",
        fontClass
      )}
    />
  )
}

// -------------------------------------------------------------
// FLOATING POPUP-SELECT MENU FOR EXCEL PILLS MATCHING ENTREVISTAS
// -------------------------------------------------------------
function PillDropdown({ 
  value, 
  options, 
  onChange
}: { 
  value: string
  options: { value: string; label: string; bg: string; border?: string; text: string }[]
  onChange: (val: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentOpt = options.find(o => o.value === value) || {
    value: value,
    label: value || "Definir",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200"
  }

  return (
    <div className={cn("relative inline-block text-left w-full max-w-full select-none", isOpen ? "z-30" : "z-10")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full rounded-full px-3 py-1.5 text-[9.5px] font-black uppercase transition-all shadow-sm outline-none cursor-pointer",
          currentOpt.bg,
          currentOpt.text,
          currentOpt.border ? `border ${currentOpt.border}` : "border border-transparent"
        )}
      >
        <span className="truncate pr-1 text-left">{currentOpt.label}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-85 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-[200px] rounded-xl bg-white shadow-2xl border border-slate-200 focus:outline-none z-30 py-1.5 p-1 flex flex-col gap-1 max-h-[260px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase transition-all text-left hover:brightness-95",
                  opt.bg,
                  opt.text,
                  opt.border ? `border ${opt.border}` : "border border-transparent"
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-3 h-3 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
