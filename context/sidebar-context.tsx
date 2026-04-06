"use client"

import { createContext, useContext } from "react"

export const SidebarContext = createContext<{ 
  toggleSidebar: () => void,
  isCollapsed: boolean,
  toggleCollapse: () => void
}>({
  toggleSidebar: () => {},
  isCollapsed: false,
  toggleCollapse: () => {},
})

export const useSidebar = () => useContext(SidebarContext)
