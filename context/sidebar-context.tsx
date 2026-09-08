"use client"

import { createContext, useContext } from "react"

export const SidebarContext = createContext<{ 
  toggleSidebar: () => void,
  isCollapsed: boolean,
  toggleCollapse: () => void,
  isHovered?: boolean,
  setIsHovered?: (hovered: boolean) => void,
  isTrainingBlocked?: boolean,
  setIsTrainingBlocked?: (blocked: boolean) => void
}>({
  toggleSidebar: () => {},
  isCollapsed: false,
  toggleCollapse: () => {},
  isHovered: false,
  setIsHovered: () => {},
  isTrainingBlocked: false,
  setIsTrainingBlocked: () => {},
})

export const useSidebar = () => useContext(SidebarContext)
