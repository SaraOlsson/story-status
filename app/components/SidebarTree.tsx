// SidebarTree.tsx
import React, { type FC, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

interface SidebarTreeProps {
  onSelect: (id: string) => void;
  selectedId: string;
}

const treeData: TreeNode[] = [
  { id: "chapter1", label: "Chapter 1" },
  { 
    id: "chapter2", 
    label: "Chapter 2", 
    children: [
      { id: "section1", label: "Section 1" },
      { id: "section2", label: "Section 2" }
    ]
  }
];

export function SidebarTree({ onSelect, selectedId }: SidebarTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTree = (nodes: TreeNode[]): React.ReactElement => (
    <SidebarMenu>
      {nodes.map((node: TreeNode) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        
        if (hasChildren) {
          return (
            <SidebarMenuItem key={node.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleNode(node.id)}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    onClick={() => onSelect(node.id)}
                    className={`w-full justify-between ${node.id === selectedId ? "bg-accent" : ""}`}
                  >
                    <span>{node.label}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      {renderTree(node.children!)}
                    </SidebarGroupContent>
                  </SidebarGroup>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          );
        }
        
        return (
          <SidebarMenuItem key={node.id}>
            <SidebarMenuButton 
              onClick={() => onSelect(node.id)}
              className={node.id === selectedId ? "bg-accent" : ""}
            >
              <span>{node.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Book content</SidebarGroupLabel>
      <SidebarGroupContent>
        {renderTree(treeData)}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}