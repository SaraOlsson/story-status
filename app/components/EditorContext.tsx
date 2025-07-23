"use client"
import React, { createContext, useContext, useState, useEffect } from "react";

export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

interface EditorContextType {
  editorText: string;
  setEditorText: (text: string) => void;
  chapterTree: TreeNode[];
  setChapterTree: (tree: TreeNode[]) => void;
  currentChapter: number;
  setCurrentChapter: (idx: number) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const EDITOR_TEXT_KEY = "storyStatus_editorText";
const CHAPTER_TREE_KEY = "storyStatus_chapterTree";

export const EditorContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editorText, setEditorTextState] = useState("");
  const [chapterTree, setChapterTreeState] = useState<TreeNode[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    const savedText = localStorage.getItem(EDITOR_TEXT_KEY);
    const savedTree = localStorage.getItem(CHAPTER_TREE_KEY);
    if (savedText) setEditorTextState(savedText);
    if (savedTree) {
      try {
        setChapterTreeState(JSON.parse(savedTree));
      } catch {}
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(EDITOR_TEXT_KEY, editorText);
  }, [editorText]);
  useEffect(() => {
    localStorage.setItem(CHAPTER_TREE_KEY, JSON.stringify(chapterTree));
  }, [chapterTree]);

  // Wrapped setters
  const setEditorText = (text: string) => {
    setEditorTextState(text);
  };
  const setChapterTree = (tree: TreeNode[]) => {
    setChapterTreeState(tree);
  };

  return (
    <EditorContext.Provider value={{ editorText, setEditorText, chapterTree, setChapterTree, currentChapter, setCurrentChapter }}>
      {children}
    </EditorContext.Provider>
  );
};

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used within EditorContextProvider");
  return ctx;
} 