"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import { 
  Search, 
  Briefcase, 
  Filter,
  ChevronDown,
  Check,
  Trash2,
  Users,
  Smile,
  FileSpreadsheet
} from "lucide-react"

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
  data_admissao?: string
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
    joinDate: db.data_admissao || "",
    status: (db.status as "Ativo" | "Inativo") || "Ativo"
  }
}

function mapCollaboratorToDB(c: Partial<Collaborator>): DBCollaborator {
  const db: DBCollaborator = {
    nome: c.name || ""
  }
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
  if (c.joinDate !== undefined) db.data_admissao = c.joinDate
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
  status: "Ativo" | "Inativo"
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

const initialCollaborators: Collaborator[] = [
  {
    id: "1",
    name: "Robson Ramos",
    role: "CEO",
    cpf: "",
    birthDate: "01/02/1987",
    civilStatus: "",
    address: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    shoeSize: "",
    children: "",
    clothingSize: "",
    favChocolate: "",
    favDrink: "",
    favFood: "",
    campaignSuggestion: "",
    incentivesPreference: "",
    joinDate: "15/01/2024",
    status: "Ativo"
  },
  {
    id: "2",
    name: "Larissa Ramos",
    role: "Diretora Financeira",
    cpf: "",
    birthDate: "19/01/1992",
    civilStatus: "",
    address: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    shoeSize: "",
    children: "",
    clothingSize: "",
    favChocolate: "",
    favDrink: "",
    favFood: "",
    campaignSuggestion: "",
    incentivesPreference: "",
    joinDate: "16/10/2023",
    status: "Ativo"
  },
  {
    id: "3",
    name: "Nathali Beneduzi da Silva",
    role: "Supervisora Comercial",
    cpf: "038.669.150-98",
    birthDate: "24/11/1995",
    civilStatus: "Solteira",
    address: "Servidão Dois Pinheiros, Saco dos Limões, 134",
    phone: "(48) 99148-5756",
    email: "nathy_looks@hotmail.com",
    emergencyPhone: "(51) 98551-2738",
    shoeSize: "35/36",
    children: "Gael, 4 anos",
    clothingSize: "P/M",
    favChocolate: "Milka - Toblerone com nuts",
    favDrink: "Aperol Spritz",
    favFood: "Frutos do mar",
    campaignSuggestion: "Finais de semana com experiência próxima",
    incentivesPreference: "Vale cultura",
    joinDate: "04/10/2021",
    status: "Ativo"
  },
  {
    id: "4",
    name: "Felícia Moraes",
    role: "Promotor de Vendas",
    cpf: "432.505.758-79",
    birthDate: "10/04/1995",
    civilStatus: "Solteira",
    address: "R. Irineu Hofman, 84 - Forquilhas",
    phone: "(48) 98850-8578",
    email: "feliciamoraesdosanjos@gmail.com",
    emergencyPhone: "(48) 99699-7917",
    shoeSize: "42",
    children: "4",
    clothingSize: "48 ou GG",
    favChocolate: "Língua de gato ou milka caramelo",
    favDrink: "Vinho e coca 0",
    favFood: "Pizza e sushi",
    campaignSuggestion: "Campanhas semanais com 2 equipes disputando",
    incentivesPreference: "SPA, dinheiro, vale salão",
    joinDate: "16/10/2023",
    status: "Ativo"
  },
  {
    id: "5",
    name: "Valéria Sena do Nascimento",
    role: "Promotor de Vendas",
    cpf: "023.649.892-48",
    birthDate: "24/09/1994",
    civilStatus: "Solteira",
    address: "Nossa Senhora Do Rosário 650, Jardim Atlântico",
    phone: "(48) 99848-7790",
    email: "senavaleria03@gmail.com",
    emergencyPhone: "",
    shoeSize: "35",
    children: "Não",
    clothingSize: "36/38",
    favChocolate: "KitKat",
    favDrink: "Suco de limão",
    favFood: "Camarão e sushi",
    campaignSuggestion: "Dinheiro",
    incentivesPreference: "Estética",
    joinDate: "04/10/2021",
    status: "Ativo"
  },
  {
    id: "6",
    name: "Jorge Fabrício Marques Siqueira",
    role: "Promotor de Vendas",
    cpf: "047.199.420-08",
    birthDate: "14/08/2005",
    civilStatus: "Solteira",
    address: "Rua Prof Walter de Bona Castelan nº157",
    phone: "54 9204-2336",
    email: "juniorfabriciojorge@gmail.com",
    emergencyPhone: "54 9715-6137",
    shoeSize: "45",
    children: "Não",
    clothingSize: "M",
    favChocolate: "Milka Oreo",
    favDrink: "Vinho branco suave",
    favFood: "Empadão de frango cremoso",
    campaignSuggestion: "Dia no SPA",
    incentivesPreference: "Voucher de roupa/perfume",
    joinDate: "05/01/2026",
    status: "Ativo"
  },
  {
    id: "7",
    name: "Emanuella de Souza Lima",
    role: "Estagiário",
    cpf: "138.358.169-00",
    birthDate: "27/01/2004",
    civilStatus: "Solteira",
    address: "Servidão Daniel Trajano Honorato, 83 - Costeira do Pirajubaé",
    phone: "48 9146-2701",
    email: "Emanuella.desouza98@gmail.com",
    emergencyPhone: "(48) 988045527",
    shoeSize: "36-37",
    children: "Não",
    clothingSize: "M",
    favChocolate: "Chocolate meio amargo",
    favDrink: "",
    favFood: "Sushi",
    campaignSuggestion: "Dia no SPA",
    incentivesPreference: "Dinheiro",
    joinDate: "29/04/2026",
    status: "Ativo"
  },
  {
    id: "8",
    name: "Marcel Rodrigo Teixeira de Oliveira",
    role: "PJ",
    cpf: "059.246.350-82",
    birthDate: "17/12/2007",
    civilStatus: "Solteira",
    address: "Servidão do Bosque, 66",
    phone: "51 99936-2593",
    email: "marcel.tx.oliveira@gmail.com",
    emergencyPhone: "51 996538988",
    shoeSize: "43",
    children: "Não",
    clothingSize: "G",
    favChocolate: "Branco",
    favDrink: "Sprit",
    favFood: "Churrasco",
    campaignSuggestion: "Viagem",
    incentivesPreference: "Dinheiro",
    joinDate: "06/05/2026",
    status: "Ativo"
  },
  {
    id: "9",
    name: "Ana Carla Simões Braganholo",
    role: "Estagiário",
    cpf: "074.013.041-20",
    birthDate: "10/04/2008",
    civilStatus: "Solteira",
    address: "",
    phone: "48 9174-1391",
    email: "anacarlabraganholo@gmail.com",
    emergencyPhone: "48 99133-8866",
    shoeSize: "36/37",
    children: "Não",
    clothingSize: "M",
    favChocolate: "Lacta/ouro branco",
    favDrink: "Guaraná",
    favFood: "Pizza",
    campaignSuggestion: "VR/VA",
    incentivesPreference: "",
    joinDate: "20/05/2026",
    status: "Ativo"
  },
  {
    id: "10",
    name: "Maria Luiza Galvan Domingos",
    role: "Estagiário",
    cpf: "082.403.499-60",
    birthDate: "19/01/2007",
    civilStatus: "Solteira",
    address: "Rua Deputado Antonio Edu Vieira 680, Pantanal",
    phone: "47 9718-5975",
    email: "maria.lgalvand@gmail.com",
    emergencyPhone: "92 985663478",
    shoeSize: "36",
    children: "Não",
    clothingSize: "M",
    favChocolate: "bis extra Black",
    favDrink: "refrigerante de morango do shadow",
    favFood: "pizza de frango com catupiry",
    campaignSuggestion: "bonificações no salário",
    incentivesPreference: "",
    joinDate: "25/05/2026",
    status: "Ativo"
  },
  {
    id: "11",
    name: "Henry Alexy dos Santos Mendes",
    role: "Estagiário",
    cpf: "600.214.400-50",
    birthDate: "04/10/2006",
    civilStatus: "Solteira",
    address: "Rua Ilha da Gralha Azul, 3855",
    phone: "48 9135-6549",
    email: "henry.inter.rs@gmail.com",
    emergencyPhone: "51 99845-7795",
    shoeSize: "41",
    children: "Não",
    clothingSize: "G",
    favChocolate: "Chocolate branco",
    favDrink: "Monster de Manga",
    favFood: "Churrasco",
    campaignSuggestion: "Vale jantar e Pix",
    incentivesPreference: "Vale jantar e Pix",
    joinDate: "25/05/2026",
    status: "Ativo"
  },
  {
    id: "12",
    name: "Yasmin Limas",
    role: "Estagiário",
    cpf: "095.352.959-26",
    birthDate: "22/03/2008",
    civilStatus: "Solteira",
    address: "Rua José Batista Rosa, 148",
    phone: "47 8473-4549",
    email: "yasminlimas6028@gmail.com",
    emergencyPhone: "47 98466-3106",
    shoeSize: "38",
    children: "Não",
    clothingSize: "M",
    favChocolate: "Suflar - normal",
    favDrink: "Suco de abacaxi com hortelã",
    favFood: "Frango empanado",
    campaignSuggestion: "Beto Carrero",
    incentivesPreference: "Vale Jantar",
    joinDate: "02/06/2026",
    status: "Ativo"
  },
  {
    id: "13",
    name: "Talita da Silva Haupt",
    role: "Supervisora Operacional",
    cpf: "083.930.239-80",
    birthDate: "29/09/1996",
    civilStatus: "Solteira",
    address: "Rua Olavio de Biasi, 659, casa 02, Palhoça - SC",
    phone: "48 9653-2351",
    email: "talitashaupt@gmail.com",
    emergencyPhone: "48 9631-6301 11 99345-9288",
    shoeSize: "37/38",
    children: "Não",
    clothingSize: "G",
    favChocolate: "Chocolates aerados / preto",
    favDrink: "Vinho rose",
    favFood: "Japonesa",
    campaignSuggestion: "Procedimentos estéticos",
    incentivesPreference: "",
    joinDate: "02/08/2021",
    status: "Ativo"
  },
  {
    id: "14",
    name: "INDIANARA MACHADO DOS SANTOS",
    role: "Serviços Gerais",
    cpf: "",
    birthDate: "12/05/1993",
    civilStatus: "",
    address: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    shoeSize: "",
    children: "",
    clothingSize: "",
    favChocolate: "",
    favDrink: "",
    favFood: "",
    campaignSuggestion: "",
    incentivesPreference: "",
    joinDate: "12/03/2025",
    status: "Ativo"
  },
  {
    id: "15",
    name: "Sergio",
    role: "Serviços Gerais",
    cpf: "",
    birthDate: "01/02/1964",
    civilStatus: "",
    address: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    shoeSize: "",
    children: "",
    clothingSize: "",
    favChocolate: "",
    favDrink: "",
    favFood: "",
    campaignSuggestion: "",
    incentivesPreference: "",
    joinDate: "05/09/2022",
    status: "Ativo"
  },
  {
    id: "16",
    name: "Isadora Meira Marques",
    role: "RH",
    cpf: "132.285.299-59",
    birthDate: "18/05/2003",
    civilStatus: "Solteira",
    address: "Servidão Arnoldo João Meira, 101 - Ipiranga, São José",
    phone: "(48) 98418-1469",
    email: "isameiradora.com@gmail.com",
    emergencyPhone: "(48) 98464-9229",
    shoeSize: "33/34",
    children: "Não",
    clothingSize: "PP",
    favChocolate: "Kinder bueno white",
    favDrink: "Suco",
    favFood: "Strogonoff",
    campaignSuggestion: "Viagens, massagem",
    incentivesPreference: "Presentes e doces",
    joinDate: "05/08/2025",
    status: "Ativo"
  },
  {
    id: "17",
    name: "Letícia de Lourdes Araújo Pereira",
    role: "Monitoria",
    cpf: "104.280.734-50",
    birthDate: "04/07/2003",
    civilStatus: "Casada",
    address: "R. Valdemiro Monguilhot, 213 - Centro, Florianópolis",
    phone: "(82) 99425-1038",
    email: "ldelourdes216@gmail.com",
    emergencyPhone: "(82) 99407-4720 (82) 99415-2093",
    shoeSize: "38",
    children: "Não",
    clothingSize: "M",
    favChocolate: "Ao leite",
    favDrink: "Suco de manga",
    favFood: "Lasanha",
    campaignSuggestion: "Campanhas temáticas: aproveitar datas comemorativas",
    incentivesPreference: "Vale jantar, dinheiro e cestas",
    joinDate: "07/10/2024",
    status: "Ativo"
  }
]

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
  const [activeTab, setActiveTab] = useState<"clt" | "aniversarios">("clt")
  const [loadingTable, setLoadingTable] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("todos")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  // Form State
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("Promotor de Vendas")
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

  // Load from Supabase on mount
  useEffect(() => {
    async function loadCollaborators() {
      setLoadingTable(true)
      try {
        const { data, error } = await supabase
          .from("colaboradores")
          .select("*")
          .order("nome", { ascending: true })

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          setCollaborators(data.map(mapDBToCollaborator))
        } else {
          // If empty in Supabase, seed from initial records
          const seedList = initialCollaborators
          const dbRows = seedList.map(({ id: _id, ...rest }) => mapCollaboratorToDB(rest))

          const { data: insertedData, error: insertError } = await supabase
            .from("colaboradores")
            .insert(dbRows)
            .select()

          if (insertError) {
            console.error("Erro ao semear colaboradores no Supabase:", insertError)
            setCollaborators(seedList)
          } else if (insertedData) {
            setCollaborators(insertedData.map(mapDBToCollaborator))
          } else {
            setCollaborators(seedList)
          }
        }
      } catch (err) {
        console.error("Erro ao carregar colaboradores do Supabase:", err)
        // Fallback to local storage or initial values if Supabase is down
        const saved = localStorage.getItem("shark_hr_collaborators_spreadsheet")
        if (saved) {
          try {
            setCollaborators(JSON.parse(saved))
          } catch {
            setCollaborators(initialCollaborators)
          }
        } else {
          setCollaborators(initialCollaborators)
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

  const updateCell = async (id: string, field: keyof Collaborator, value: string) => {
    // Optimistic state update
    const updated = collaborators.map(c => c.id === id ? { ...c, [field]: value } : c)
    saveCollaborators(updated)

    try {
      const mappedField = mapCollaboratorToDB({ [field]: value })
      const { error } = await supabase
        .from("colaboradores")
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
          .from("colaboradores")
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
        .from("colaboradores")
        .insert([dbRow])
        .select()

      if (error) {
        throw error
      }

      if (data && data[0]) {
        const savedColab = mapDBToCollaborator(data[0])
        setCollaborators(prev => prev.map(c => c.id === tempId ? savedColab : c))
      }
    } catch (err) {
      console.error("Erro ao salvar colaborador no Supabase:", err)
    }

    // Reset Form
    setNewName("")
    setNewRole("Promotor de Vendas")
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
  }

  const filteredCollaborators = collaborators.filter(c => {
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores Cadastrados</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {collaborators.length}
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargos & Funções</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {new Set(collaborators.map(c => c.role)).size}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Com Preciosismo Social</p>
                <p className="text-sm font-semibold text-slate-500 mt-1.5 leading-snug">
                  Mapeamento de mimos, preferências, tamanhos e dados pessoais integrados em tempo real.
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Smile className="w-6 h-6" />
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
            COLABORADORES CLT
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
        </div>

        {activeTab === "clt" ? (
          <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl rounded-tl-none shadow-sm animate-in fade-in duration-300">
            <CardContent className="p-0">
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100">
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

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="todos">Todas as Funções</option>
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Form Cadastro */}
            <div className="bg-slate-50/50 p-6 border-b border-slate-150">
              <form onSubmit={handleCreateCollaborator} className="space-y-6">
                  {/* Grid 1: Informações Pessoais Principais */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Informações Básicas e Administrativas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Nathali Beneduzi" 
                          value={newName} 
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função (Cargo)</label>
                        <select 
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none field-sizing-content"
                        >
                          {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.value}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">CPF</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 038.669.150-98" 
                          value={newCpf} 
                          onChange={(e) => setNewCpf(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Admissão (Tempo de Casa)</label>
                        <input 
                          type="text" 
                          placeholder="DD/MM/AAAA ou data" 
                          value={newJoinDate} 
                          onChange={(e) => setNewJoinDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Contatos e Endereço */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Contatos, Família e Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Telefone</label>
                        <input 
                          type="text" 
                          placeholder="Ex: (48) 99148-5756" 
                          value={newPhone} 
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail</label>
                        <input 
                          type="email" 
                          placeholder="nathy@hotmail.com" 
                          value={newEmail} 
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Fone de Emergência</label>
                        <input 
                          type="text" 
                          placeholder="Ex: (51) 98551-2738" 
                          value={newEmergencyPhone} 
                          onChange={(e) => setNewEmergencyPhone(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Filhos</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Gael, 4 anos ou Não" 
                          value={newChildren} 
                          onChange={(e) => setNewChildren(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Endereço Completo</label>
                        <input 
                          type="text" 
                          placeholder="Rua, Número, Bairro, Cidade - UF" 
                          value={newAddress} 
                          onChange={(e) => setNewAddress(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Data de Nasc.</label>
                        <input 
                          type="text" 
                          placeholder="DD/MM/AAAA" 
                          value={newBirthDate} 
                          onChange={(e) => setNewBirthDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Estado Civil</label>
                        <input 
                          type="text" 
                          placeholder="Solteira / Casada" 
                          value={newCivilStatus} 
                          onChange={(e) => setNewCivilStatus(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Preferências & Mimos */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">3. Mimos, Tamanhos e Preferências (Afinidade Social)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Tamanho da Roupa</label>
                        <input 
                          type="text" 
                          placeholder="Ex: M, P/M, G, GG" 
                          value={newClothingSize} 
                          onChange={(e) => setNewClothingSize(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nº do Calçado</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 35/36" 
                          value={newShoeSize} 
                          onChange={(e) => setNewShoeSize(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Chocolate Preferido</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Milka Oreo" 
                          value={newFavChocolate} 
                          onChange={(e) => setNewFavChocolate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Bebida Preferida</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Aperol Spritz" 
                          value={newFavDrink} 
                          onChange={(e) => setNewFavDrink(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Comida Preferida</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Sushi, Strogonoff" 
                          value={newFavFood} 
                          onChange={(e) => setNewFavFood(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Sugestão de Campanhas</label>
                        <input 
                          type="text" 
                          placeholder="Ideia de campanhas, incentivos ou dinâmicas" 
                          value={newCampaignSuggestion} 
                          onChange={(e) => setNewCampaignSuggestion(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Preferência de Incentivos</label>
                        <input 
                          type="text" 
                          placeholder="Vale cultura, dinheiro, PIX, etc." 
                          value={newIncentivesPreference} 
                          onChange={(e) => setNewIncentivesPreference(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setNewName("")
                        setNewRole("Promotor de Vendas")
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

            {/* List Table */}
            <div className="overflow-x-auto min-h-[500px] px-6">
              <table className="w-full text-left border-collapse table-fixed min-w-[3100px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="w-[220px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome Completo</th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Função</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</th>
                    <th className="w-[110px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Nasc.</th>
                    <th className="w-[120px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Civil</th>
                    <th className="w-[320px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço Completo</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</th>
                    <th className="w-[220px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone de Emergência</th>
                    <th className="w-[100px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº Calçado</th>
                    <th className="w-[110px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filhos</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tamanho da Roupa</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chocolate Preferido</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bebida Preferida</th>
                    <th className="w-[200px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comida Preferida</th>
                    <th className="w-[250px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sugestão de Campanhas</th>
                    <th className="w-[220px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preferência de Incentivos</th>
                    <th className="w-[120px] px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo de Casa</th>
                    <th className="w-[80px] px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTable ? (
                    <tr>
                      <td colSpan={19} className="text-center py-20 bg-slate-50/10">
                        <div className="flex flex-col items-center justify-center space-y-3 animate-pulse">
                          <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Carregando planilha de colaboradores...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="text-center py-20 bg-slate-50/10 border-none">
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

                        {/* 18. TEMPO DE CASA */}
                        <td className="px-4 py-3.5">
                          <TextInputCell 
                            value={colab.joinDate} 
                            onChange={(val) => updateCell(colab.id, "joinDate", val)}
                            placeholder="DD/MM/AAAA"
                            fontClass="font-mono text-slate-600 text-[11px]"
                          />
                        </td>

                        {/* EXCLUIR ROW BUTTON */}
                        <td className="px-2 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(colab.id)}
                            className="p-1.5 text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all"
                            title="Deletar colaborador permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        ) : (
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
                  const itemBirthdays = collaborators
                    .filter(c => {
                      if (!c.birthDate || c.status !== "Ativo") return false;
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
                        <div className="bg-[#002060] text-center text-[10.5px] font-black uppercase text-white py-2 tracking-widest border-b border-blue-900 leading-none">
                          {m.name}
                        </div>

                        {/* Cabeçalho da Mini Tabela */}
                        <div className="grid grid-cols-10 bg-[#002060]/95 text-white text-[8.5px] font-black uppercase tracking-wider py-1 border-b border-blue-900 leading-none">
                          <div className="col-span-7 px-3 text-left border-r border-[#002060]/35">Nome</div>
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
        )}
      </div>

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
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded px-2 py-1 outline-none transition-all truncate text-[11.5px]",
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
