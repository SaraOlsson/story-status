"use client"

import { Edit, Home, Settings } from "lucide-react"
import React, { useState } from "react";
import { SidebarTree } from "./SidebarTree";
import { useEditorContext } from "@/components/EditorContext";
import { useMemo } from "react";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

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
  const { editorText, currentChapter, setCurrentChapter } = useEditorContext();

  // Calculate chapter ranges (copied from editor logic)
  const chapterRanges = useMemo(() => {
    const lines = editorText.split(/\r?\n/);
    const ranges = [];
    let charIndex = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const match = line.match(/^##\s+(.*)/);
      if (match) {
        if (ranges.length > 0) {
          ranges[ranges.length - 1].end = charIndex - 1;
        }
        ranges.push({
          id: `chapter-${idx}`,
          label: match[1],
          start: charIndex,
          end: editorText.length, // will be set when next chapter is found
        });
      }
      charIndex += line.length + 1; // +1 for newline
    }
    if (ranges.length > 0) {
      ranges[ranges.length - 1].end = editorText.length;
    }
    return ranges;
  }, [editorText]);

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

       {/* Chapter Pagination Controls */}
       {chapterRanges.length > 0 && (
         <SidebarGroup>
           <SidebarGroupLabel>Chapters</SidebarGroupLabel>
           <SidebarGroupContent>
              <div className="flex flex-col gap-2">
                {/* Previous/Next buttons removed as requested */}
                <div className="flex flex-col gap-1 mt-2">
                  {chapterRanges.map((chapter, idx) => (
                    <button
                      key={chapter.id}
                      className={`px-2 py-1 rounded w-full text-left ${currentChapter === idx ? 'font-bold bg-muted' : ''}`}
                      onClick={() => setCurrentChapter(idx)}
                    >
                      {chapter.label}
                    </button>
                  ))}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}