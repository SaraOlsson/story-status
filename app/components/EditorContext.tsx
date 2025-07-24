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
  editorState: { text: string; markings: number[] };
  setEditorState: React.Dispatch<React.SetStateAction<{ text: string; markings: number[] }>>;
  resetEditor: () => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const EDITOR_TEXT_KEY = "storyStatus_editorText";
const CHAPTER_TREE_KEY = "storyStatus_chapterTree";

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editorText, setEditorText] = useState("");
  const [chapterTree, setChapterTree] = useState<TreeNode[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [editorState, setEditorState] = useState<{ text: string; markings: number[] }>({ text: "", markings: [] });

  const resetEditor = () => {
    setEditorText("");
    setChapterTree([]);
    setCurrentChapter(0);
    setEditorState({ text: "", markings: [] });
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedText = localStorage.getItem(EDITOR_TEXT_KEY);
    const savedTree = localStorage.getItem(CHAPTER_TREE_KEY);
    if (savedText) setEditorText(savedText);
    if (savedTree) {
      try {
        setChapterTree(JSON.parse(savedTree));
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

  return (
    <EditorContext.Provider value={{ editorText, setEditorText, chapterTree, setChapterTree, currentChapter, setCurrentChapter, editorState, setEditorState, resetEditor }}>
      {children}
    </EditorContext.Provider>
  );
};

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used within EditorContextProvider");
  return ctx;
} 