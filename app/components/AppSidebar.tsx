"use client"

import { Edit, Home, Settings } from "lucide-react"
import React, { useState } from "react";
import { SidebarTree } from "./SidebarTree";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Projects",
    url: "#",
    icon: Home,
  },
  {
    title: "Editor",
    url: "/editor",
    icon: Edit,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

export function AppSidebar() {
  const [selected, setSelected] = useState("dashboard");
  return (
    <Sidebar>
      <SidebarContent>
        
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarTree onSelect={setSelected} selectedId={selected} />
      </SidebarContent>
    </Sidebar>
  )
}