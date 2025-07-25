"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Save,
  FileText,
  Tag,
  Edit,
  X,
  Lightbulb,
  PenTool,
  CheckCircle,
  MousePointer,
  Type,
  Cloud,
  Upload,
  Download,
  LogOut,
  Loader2
} from "lucide-react"
import { sampleText } from "./sample-text"
import { useGoogleDrive } from "@/hooks/use-google-drive"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useEditorContext, TreeNode } from "@/components/EditorContext";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"

type MarkingStatus = "ideas" | "draft" | "done"

// New array-based marking system
type MarkingValue = 0 | 1 | 2 | 3 // 0=unmarked, 1=ideas, 2=draft, 3=done

interface EditorState {
  text: string
  markings: MarkingValue[] // Array of same length as text, each index corresponds to character
}

function parseChaptersFromText(text: string): TreeNode[] {
  // Simple parser: finds all lines starting with '## '
  const lines = text.split(/\r?\n/);
  const chapters: TreeNode[] = [];
  let lastChapter = null;
  lines.forEach((line, idx) => {
    const match = line.match(/^##\s+(.*)/);
    if (match) {
      const chapter: TreeNode = {
        id: `chapter-${idx}`,
        label: match[1],
        children: [],
      };
      chapters.push(chapter);
      lastChapter = chapter;
    }
  });
  return chapters;
}

// Replace updateMarkingsForChapterEdit with a robust version
function updateMarkingsForChapterEdit(
  oldText: string,
  newText: string,
  oldMarkings: MarkingValue[],
  chapterStart: number,
  chapterEnd: number,
  newChapterText: string
) {
  // Markings before the chapter
  const before = oldMarkings.slice(0, chapterStart);
  // Markings after the chapter (will be offset if chapter length changes)
  const after = oldMarkings.slice(chapterEnd);

  // Old and new chapter text
  const oldChapterText = oldText.slice(chapterStart, chapterEnd);
  const oldChapterMarkings = oldMarkings.slice(chapterStart, chapterEnd);

  // Build new markings for the chapter
  let i = 0, j = 0;
  let newChapterMarkings: MarkingValue[] = [];
  while (i < oldChapterText.length && j < newChapterText.length) {
    if (oldChapterText[i] === newChapterText[j]) {
      newChapterMarkings.push(oldChapterMarkings[i]);
      i++;
      j++;
    } else {
      if (oldChapterText.length < newChapterText.length) {
        // Insertion
        const inherit = j > 0 ? newChapterMarkings[j - 1] : 0;
        newChapterMarkings.push(inherit);
        j++;
      } else {
        // Deletion
        i++;
      }
    }
  }
  // Handle any remaining insertions
  while (j < newChapterText.length) {
    const inherit = j > 0 ? newChapterMarkings[j - 1] : 0;
    newChapterMarkings.push(inherit);
    j++;
  }
  // No need to handle deletions at the end, as we just don't add them

  // Combine
  return before.concat(newChapterMarkings, after);
}

export default function Editor() {
  const [editorState, setEditorState] = useState<EditorState>({ 
    text: "", 
    markings: [] // Start with no markings
  })
  const [selectedText, setSelectedText] = useState<{ start: number; end: number; text: string } | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isStatusMode, setIsStatusMode] = useState(false)
  const [useHighlighting, setUseHighlighting] = useState(false)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [pendingProjectName, setPendingProjectName] = useState("")
  const [savedProjectName, setSavedProjectName] = useState<string | null>(null)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [loadStoriesList, setLoadStoriesList] = useState<any[]>([])
  const [selectedStoryTitle, setSelectedStoryTitle] = useState<string>("")
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { setEditorText, setChapterTree, editorText, chapterTree } = useEditorContext();
  const { currentChapter, setCurrentChapter } = useEditorContext();

  const EDITOR_TEXT_KEY = "storyStatus_editorText";
  const EDITOR_MARKINGS_KEY = "storyStatus_editorMarkings";

  // Google Drive integration
  const {
    isAuthenticated,
    isLoading: driveLoading,
    error: driveError,
    authenticate,
    loadStoredTokens,
    saveStory,
    loadStories,
    searchExistingStories,
    signOut
  } = useGoogleDrive()

  // Initialize with sample markings and load stored tokens
  useEffect(() => {
    // Load stored Google Drive tokens
    loadStoredTokens()
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const tokens = urlParams.get('tokens');
    
    if (success === 'auth_success' && tokens) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(tokens));
        // Store tokens and update authentication state
        localStorage.setItem('googleDriveTokens', JSON.stringify(tokenData));
        window.location.search = ''; // Clear URL parameters
      } catch (e) {
        console.error('Failed to parse tokens:', e);
      }
    } else if (error) {
      console.error('OAuth error:', error);
      alert('Authentication failed. Please try again.');
      window.location.search = ''; // Clear URL parameters
    }
    
    // Add some sample markings to demonstrate the system
    const newMarkings = [...editorState.markings]
    
    // Mark "The weathered parchment" as ideas (status 1)
    const ideaStart = sampleText.indexOf("The weathered parchment")
    const ideaEnd = sampleText.indexOf("crackled in Elena's trembling hands") + "crackled in Elena's trembling hands".length
    for (let i = ideaStart; i < ideaEnd; i++) {
      if (i < newMarkings.length) {
        newMarkings[i] = 1 // ideas
      }
    }
    
    // Mark "The discovery had come" as draft (status 2)
    const draftStart = sampleText.indexOf("The discovery had come")
    const draftEnd = sampleText.indexOf("on the eve of her thirtieth birthday") + "on the eve of her thirtieth birthday".length
    for (let i = draftStart; i < draftEnd; i++) {
      if (i < newMarkings.length) {
        newMarkings[i] = 2 // draft
      }
    }
    
    setEditorState(prev => ({ ...prev, markings: newMarkings }))
    setEditorText(editorState.text);
    setChapterTree(parseChaptersFromText(editorState.text));
  }, [loadStoredTokens])

  // Update word and character counts
  useEffect(() => {
    setCharCount(editorState.text.length)
    setWordCount(editorState.text.trim() ? editorState.text.trim().split(/\s+/).length : 0)
  }, [editorState.text])

  // Restore from localStorage on mount
  useEffect(() => {
    const savedText = localStorage.getItem(EDITOR_TEXT_KEY);
    const savedMarkings = localStorage.getItem(EDITOR_MARKINGS_KEY);
    if (savedText) {
      setEditorState(prev => ({ ...prev, text: savedText }));
      setEditorText(savedText);
      setChapterTree(parseChaptersFromText(savedText));
    }
    if (savedMarkings) {
      try {
        setEditorState(prev => ({ ...prev, markings: JSON.parse(savedMarkings) }));
      } catch {}
    }
  }, []);

  // Save to localStorage on every edit
  useEffect(() => {
    localStorage.setItem(EDITOR_TEXT_KEY, editorState.text);
    localStorage.setItem(EDITOR_MARKINGS_KEY, JSON.stringify(editorState.markings));
  }, [editorState.text, editorState.markings]);

  const handleTextChange = (newText: string) => {
    // When text changes, we need to update the markings array
    const newMarkings = [...editorState.markings]
    
    if (newText.length > editorState.text.length) {
      // Text was inserted - we need to expand the markings array
      const diff = newText.length - editorState.text.length
      // Find where the insertion happened by comparing the texts
      let insertIndex = 0
      for (let i = 0; i < Math.min(editorState.text.length, newText.length); i++) {
        if (editorState.text[i] !== newText[i]) {
          insertIndex = i
          break
        }
      }
      
      // Insert new marking values at the insertion point
      // Use the status of surrounding text to determine the new marking value
      const surroundingStatus = insertIndex > 0 ? newMarkings[insertIndex - 1] : 0
      const newValues = new Array(diff).fill(surroundingStatus)
      newMarkings.splice(insertIndex, 0, ...newValues)
    } else if (newText.length < editorState.text.length) {
      // Text was deleted - we need to shrink the markings array
      const diff = editorState.text.length - newText.length
      // Find where the deletion happened
      let deleteIndex = 0
      for (let i = 0; i < Math.min(editorState.text.length, newText.length); i++) {
        if (editorState.text[i] !== newText[i]) {
          deleteIndex = i
          break
        }
      }
      
      // Remove the deleted marking values
      newMarkings.splice(deleteIndex, diff)
    }
    
    // Ensure the markings array is the same length as the text
    while (newMarkings.length < newText.length) {
      newMarkings.push(0) // Add unmarked for any remaining characters
    }
    while (newMarkings.length > newText.length) {
      newMarkings.pop() // Remove extra marking values
    }
    
    setEditorState(prev => ({ 
      text: newText, 
      markings: newMarkings 
    }))
    setEditorText(newText);
    setChapterTree(parseChaptersFromText(newText));
    // localStorage will be updated by useEffect
  }

  const handleTextSelection = () => {
    if (!isStatusMode) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setSelectedText(null)
      return
    }

    const range = selection.getRangeAt(0)
    const editorElement = editorRef.current
    if (!editorElement || !editorElement.contains(range.commonAncestorContainer)) {
      setSelectedText(null)
      return
    }

    // Get the text content and selection positions
    const textContent = editorElement.textContent || ""
    const selectedTextContent = selection.toString().trim()
    
    if (!selectedTextContent) {
      setSelectedText(null)
      return
    }

    // Find the start and end positions in the original text
    const start = editorState.text.indexOf(selectedTextContent)
    if (start === -1) {
      setSelectedText(null)
      return
    }
    const end = start + selectedTextContent.length

    setSelectedText({ 
      start, 
      end, 
      text: selectedTextContent 
    })
  }

  const addMarking = (status: MarkingStatus) => {
    if (!selectedText) return

    const statusValue: MarkingValue = status === "ideas" ? 1 : status === "draft" ? 2 : 3
    const newMarkings = [...editorState.markings]
    
    // Mark the selected range
    for (let i = selectedText.start; i < selectedText.end; i++) {
      if (i < newMarkings.length) {
        newMarkings[i] = statusValue
      }
    }

    setEditorState(prev => ({
      ...prev,
      markings: newMarkings
    }))
    setSelectedText(null)
    
    // Clear the selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }

  const updateMarkingStatus = (startIndex: number, endIndex: number, newStatus: MarkingStatus) => {
    console.log('updateMarkingStatus called:', { startIndex, endIndex, newStatus })
    
    const statusValue: MarkingValue = newStatus === "ideas" ? 1 : newStatus === "draft" ? 2 : 3
    const newMarkings = [...editorState.markings]
    
    for (let i = startIndex; i < endIndex; i++) {
      if (i < newMarkings.length) {
        newMarkings[i] = statusValue
      }
    }
    
    console.log('Updating markings:', { oldMarkings: editorState.markings.slice(startIndex, endIndex), newMarkings: newMarkings.slice(startIndex, endIndex) })
    
    setEditorState(prev => ({
      ...prev,
      markings: newMarkings
    }))
    
    // Close the popover
    setOpenPopover(null)
  }

  const removeMarking = (startIndex: number, endIndex: number) => {
    console.log('removeMarking called:', { startIndex, endIndex })
    
    const newMarkings = [...editorState.markings]
    
    for (let i = startIndex; i < endIndex; i++) {
      if (i < newMarkings.length) {
        newMarkings[i] = 0 // Unmark
      }
    }
    
    console.log('Removing markings:', { oldMarkings: editorState.markings.slice(startIndex, endIndex), newMarkings: newMarkings.slice(startIndex, endIndex) })
    
    setEditorState(prev => ({
      ...prev,
      markings: newMarkings
    }))
    
    // Close the popover
    setOpenPopover(null)
  }

  const getStatusColor = (status: MarkingValue) => {
    switch (status) {
      case 1: return "bg-purple-200 border-purple-300" // ideas
      case 2: return "bg-blue-200 border-blue-300" // draft
      case 3: return "bg-green-200 border-green-300" // done
      default: return ""
    }
  }

  const getStatusHighlightColor = (status: MarkingValue) => {
    switch (status) {
      case 1: return "bg-yellow-200" // ideas
      case 2: return "bg-blue-200" // draft
      case 3: return "bg-green-200" // done
      default: return ""
    }
  }

  const getStatusHighlightColorDark = (status: MarkingValue) => {
    switch (status) {
      case 1: return "bg-yellow-300" // ideas
      case 2: return "bg-blue-300" // draft
      case 3: return "bg-green-300" // done
      default: return ""
    }
  }

  const getStatusIcon = (status: MarkingValue) => {
    switch (status) {
      case 1: return <Lightbulb className="h-4 w-4" />
      case 2: return <PenTool className="h-4 w-4" />
      case 3: return <CheckCircle className="h-4 w-4" />
      default: return null
    }
  }

  const getStatusLabel = (status: MarkingValue) => {
    switch (status) {
      case 1: return "Ideas"
      case 2: return "Draft"
      case 3: return "Done"
      default: return "Unmarked"
    }
  }

  const getMarkingStatus = (status: MarkingValue): MarkingStatus => {
    switch (status) {
      case 1: return "ideas"
      case 2: return "draft"
      case 3: return "done"
      default: return "ideas" // fallback
    }
  }

  const renderTextWithMarkings = () => {
    if (editorState.markings.every(m => m === 0)) {
      return editorState.text
    }

    const result = []
    let currentStatus: MarkingValue = 0
    let currentStart = 0

    for (let i = 0; i < editorState.text.length; i++) {
      const char = editorState.text[i]
      const status = editorState.markings[i] || 0

      if (status !== currentStatus) {
        // Status changed, render the previous segment
        if (currentStart < i) {
          const segment = editorState.text.substring(currentStart, i)
          if (currentStatus === 0) {
            result.push(segment)
          } else {
            // Render marked segment
            const popoverKey = `${currentStart}-${i}`
            const segmentStart = currentStart
            const segmentEnd = i
            // Offset for paginated mode
            const globalStart = currentRange ? currentRange.start + segmentStart : segmentStart;
            const globalEnd = currentRange ? currentRange.start + segmentEnd : segmentEnd;
            if (useHighlighting) {
              result.push(
                <Popover key={popoverKey} open={openPopover === popoverKey} onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}>
                  <PopoverTrigger asChild>
                    <span
                      className={`${getStatusHighlightColor(currentStatus)} px-1 py-0.5 rounded-sm hover:${getStatusHighlightColorDark(currentStatus)} transition-colors inline-block ${isStatusMode ? 'cursor-pointer' : 'cursor-text'}`}
                    >
                      {segment}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(currentStatus)}
                        <span className="font-medium">{getStatusLabel(currentStatus)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{segment}</p>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Change status to:</div>
                        <div className="grid grid-cols-1 gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Ideas button clicked for segment (highlight):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "ideas")
                            }}
                          >
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Ideas
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Draft button clicked for segment (highlight):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "draft")
                            }}
                          >
                            <PenTool className="h-4 w-4 mr-2" />
                            Draft
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Done button clicked for segment (highlight):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "done")
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Done
                          </Button>
                        </div>
                        <Separator />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            console.log('Remove button clicked for segment (highlight):', { globalStart, globalEnd })
                            removeMarking(globalStart, globalEnd)
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Marking
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            } else {
              result.push(
                <Popover key={popoverKey} open={openPopover === popoverKey} onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}>
                  <PopoverTrigger asChild>
                    <span
                      className={`${getStatusColor(currentStatus)} border-2 border-dashed px-1 rounded hover:opacity-80 inline-block ${isStatusMode ? 'cursor-pointer' : 'cursor-text'}`}
                    >
                      {segment}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(currentStatus)}
                        <span className="font-medium">{getStatusLabel(currentStatus)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{segment}</p>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Change status to:</div>
                        <div className="grid grid-cols-1 gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Ideas button clicked for segment (border):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "ideas")
                            }}
                          >
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Ideas
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Draft button clicked for segment (border):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "draft")
                            }}
                          >
                            <PenTool className="h-4 w-4 mr-2" />
                            Draft
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              console.log('Done button clicked for segment (border):', { globalStart, globalEnd })
                              updateMarkingStatus(globalStart, globalEnd, "done")
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Done
                          </Button>
                        </div>
                        <Separator />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            console.log('Remove button clicked for segment (border):', { globalStart, globalEnd })
                            removeMarking(globalStart, globalEnd)
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Marking
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            }
          }
        }
        currentStatus = status
        currentStart = i
      }
    }

    // Handle the last segment
    if (currentStart < editorState.text.length) {
      const segment = editorState.text.substring(currentStart)
      if (currentStatus === 0) {
        result.push(segment)
      } else {
        // Render marked segment
        const popoverKey = `${currentStart}-${editorState.text.length}`
        const segmentStart = currentStart
        const segmentEnd = editorState.text.length
        // Offset for paginated mode
        const globalStart = currentRange ? currentRange.start + segmentStart : segmentStart;
        const globalEnd = currentRange ? currentRange.start + segmentEnd : segmentEnd;
      if (useHighlighting) {
        result.push(
            <Popover key={popoverKey} open={openPopover === popoverKey} onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}>
            <PopoverTrigger asChild>
              <span
                  className={`${getStatusHighlightColor(currentStatus)} px-1 py-0.5 rounded-sm hover:${getStatusHighlightColorDark(currentStatus)} transition-colors inline-block ${isStatusMode ? 'cursor-pointer' : 'cursor-text'}`}
              >
                  {segment}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {getStatusIcon(currentStatus)}
                    <span className="font-medium">{getStatusLabel(currentStatus)}</span>
                </div>
                  <p className="text-sm text-muted-foreground">{segment}</p>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Change status to:</div>
                  <div className="grid grid-cols-1 gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Ideas button clicked for last segment (highlight):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "ideas")
                        }}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Ideas
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Draft button clicked for last segment (highlight):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "draft")
                        }}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Draft
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Done button clicked for last segment (highlight):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "done")
                        }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                  </div>
                  <Separator />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                      onClick={() => {
                        console.log('Remove button clicked for last segment (highlight):', { globalStart, globalEnd })
                        removeMarking(globalStart, globalEnd)
                      }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Marking
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )
      } else {
        result.push(
            <Popover key={popoverKey} open={openPopover === popoverKey} onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}>
            <PopoverTrigger asChild>
              <span
                  className={`${getStatusColor(currentStatus)} border-2 border-dashed px-1 rounded hover:opacity-80 inline-block ${isStatusMode ? 'cursor-pointer' : 'cursor-text'}`}
              >
                  {segment}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {getStatusIcon(currentStatus)}
                    <span className="font-medium">{getStatusLabel(currentStatus)}</span>
                </div>
                  <p className="text-sm text-muted-foreground">{segment}</p>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Change status to:</div>
                  <div className="grid grid-cols-1 gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Ideas button clicked for last segment (border):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "ideas")
                        }}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Ideas
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Draft button clicked for last segment (border):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "draft")
                        }}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Draft
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start"
                        onClick={() => {
                          console.log('Done button clicked for last segment (border):', { globalStart, globalEnd })
                          updateMarkingStatus(globalStart, globalEnd, "done")
                        }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                  </div>
                  <Separator />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                      onClick={() => {
                        console.log('Remove button clicked for last segment (border):', { globalStart, globalEnd })
                        removeMarking(globalStart, globalEnd)
                      }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Marking
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )
      }
      }
    }

    return result
  }

  // Calculate chapter ranges
  function getChapterRanges(text: string) {
    const lines = text.split(/\r?\n/);
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
          end: text.length, // will be set when next chapter is found
        });
      }
      charIndex += line.length + 1; // +1 for newline
    }
    if (ranges.length > 0) {
      ranges[ranges.length - 1].end = text.length;
    }
    return ranges;
  }

  const chapterRanges = getChapterRanges(editorState.text);
  const currentRange = chapterRanges[currentChapter] || { start: 0, end: editorState.text.length };
  const chapterText = editorState.text.substring(currentRange.start, currentRange.end);
  const chapterMarkings = editorState.markings.slice(currentRange.start, currentRange.end);

  const handleSave = async () => {
    if (!isAuthenticated) {
      if (confirm("You need to connect to Google Drive first. Connect now?")) {
        await authenticate()
      }
      return
    }
    setPendingProjectName(savedProjectName || "")
    setShowNameDialog(true)
  }

  const handleConfirmSave = async () => {
    const folderName = "Story Status Editor"
    const projectName = pendingProjectName.trim() || "Untitled Story"
    setIsSaving(true)
    try {
      const success = await saveStory({
        title: projectName,
        content: editorState.text,
        markings: editorState.markings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, folderName)
      if (success) {
        setSavedProjectName(projectName)
        setShowNameDialog(false)
        toast("Story saved successfully!")
      } else {
        toast.error("Failed to save story. Please try again.")
      }
    } catch (error) {
      toast.error("Failed to save story. Please try again.")
    }
    setIsSaving(false)
  }

  const handleLoadStories = async () => {
    if (!isAuthenticated) {
      if (confirm("Connect to Google Drive to load your stories?")) {
        await authenticate()
      }
      return
    }
    setShowLoadDialog(true)
    setIsLoadingStories(true)
    try {
      const stories = await loadStories()
      setLoadStoriesList(stories)
      setSelectedStoryTitle("")
      setIsLoadingStories(false)
    } catch (error) {
      setIsLoadingStories(false)
      alert("Failed to load stories. Please try again.")
    }
  }

  const handleConfirmLoad = () => {
    const story = loadStoriesList.find(s => s.title === selectedStoryTitle)
    if (story) {
      setEditorState({
        text: story.content,
        markings: story.markings as MarkingValue[]
      })
      setEditorText(story.content);
      setChapterTree(parseChaptersFromText(story.content));
      localStorage.setItem(EDITOR_TEXT_KEY, story.content);
      localStorage.setItem(EDITOR_MARKINGS_KEY, JSON.stringify(story.markings));
      setSavedProjectName(story.title)
      setShowLoadDialog(false)
      toast("Story loaded successfully!")
    } else {
      alert("Please select a story to load.")
    }
  }

  // Calculate marking statistics
  const markingCount = editorState.markings.filter(m => m !== 0).length
  const ideasCount = editorState.markings.filter(m => m === 1).length
  const draftCount = editorState.markings.filter(m => m === 2).length
  const doneCount = editorState.markings.filter(m => m === 3).length

  return (
    <div className="h-full flex flex-col">
      {/* Error Display */}
      {driveError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Cloud className="h-4 w-4" />
            <span>Google Drive Error: {driveError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="ml-auto text-red-700 hover:text-red-800"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Editor Header */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Editor</h1>
          </div>
          {savedProjectName && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Title:</span>
              <span className="px-2 py-1 text-sm border rounded bg-background cursor-default select-text opacity-80">{savedProjectName}</span>
            </div>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            <Separator orientation="vertical" className="h-4" />
            
            {/* Google Drive Controls */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLoadStories}
                  disabled={driveLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Load Story
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={authenticate}
                disabled={driveLoading}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Connect Drive
              </Button>
            )}
            
            <Separator orientation="vertical" className="h-4" />
            
            <Button 
              variant={isStatusMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsStatusMode(!isStatusMode)}
            >
              <MousePointer className="h-4 w-4 mr-2" />
              {isStatusMode ? "Marking Mode ON" : "Marking Mode OFF"}
            </Button>
            <Button 
              onClick={() => {
                handleSave()
              }} 
              size="sm"
              disabled={!isAuthenticated || driveLoading || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isAuthenticated ? "Save" : "Connect to Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Marking Controls - sticky and always reserves space */}
      {isStatusMode && (
        <div
          className="sticky top-[56px] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center min-h-[48px]"
        >
          {selectedText ? (
            <div className="flex items-center gap-2 max-w-4xl mx-auto p-2 w-full">
              <span className="text-sm text-muted-foreground">Mark selection as:</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addMarking("ideas")}
                className="bg-purple-100 border-purple-300 hover:bg-purple-200"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Ideas
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addMarking("draft")}
                className="bg-blue-100 border-blue-300 hover:bg-blue-200"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Draft
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addMarking("done")}
                className="bg-green-100 border-green-300 hover:bg-green-200"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedText(null)
                  if (window.getSelection) {
                    window.getSelection()?.removeAllRanges()
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto p-2 w-full h-full">
              <span className="text-sm text-muted-foreground">Select text to mark a status</span>
            </div>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {isStatusMode ? (
            // Marking mode - show rendered text with markings for current chapter only
            <div 
              ref={editorRef}
              className="min-h-[calc(100vh-200px)] text-lg leading-relaxed p-8 border-0 focus-visible:ring-0 whitespace-pre-wrap select-text"
              style={{ 
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '1.125rem',
                lineHeight: '1.75'
              }}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              onSelect={handleTextSelection}
            >
              {/* Only render current chapter's text and markings */}
              {(() => {
                // Temporarily swap in chapterText and chapterMarkings for rendering
                const prevText = editorState.text;
                const prevMarkings = editorState.markings;
                editorState.text = chapterText;
                editorState.markings = chapterMarkings;
                const rendered = renderTextWithMarkings();
                editorState.text = prevText;
                editorState.markings = prevMarkings;
                return rendered;
              })()}
            </div>
          ) : (
            // Edit mode - show textarea for editing current chapter only
            <Textarea
              ref={textareaRef}
              value={chapterText}
              onChange={(e) => {
                const newChapterText = e.target.value;
                const before = editorState.text.slice(0, currentRange.start);
                const after = editorState.text.slice(currentRange.end);
                const newText = before + newChapterText + after;
                const newMarkings = updateMarkingsForChapterEdit(
                  editorState.text,
                  newText,
                  editorState.markings,
                  currentRange.start,
                  currentRange.end,
                  newChapterText
                );
                // Detect if a new chapter was added
                const prevChapters = parseChaptersFromText(editorState.text);
                const newChapters = parseChaptersFromText(newText);
                setEditorState(prev => ({
                  ...prev,
                  text: newText,
                  markings: newMarkings
                }));
                setEditorText(newText);
                setChapterTree(newChapters);
                // If a new chapter was added, activate it
                if (newChapters.length > prevChapters.length) {
                  setCurrentChapter(newChapters.length - 1);
                }
              }}
              className="min-h-[calc(100vh-200px)] text-lg leading-relaxed p-8 border-0 focus-visible:ring-0 resize-none"
              style={{ 
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '1.125rem',
                lineHeight: '1.75'
              }}
              placeholder="Start writing your story..."
            />
          )}
        </div>
      </div>

      {/* Markings Summary */}
      {markingCount > 0 && (
        <div className="border-t bg-muted/30 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Markings Summary ({markingCount} marked characters)
            </h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-600" />
                <span>Ideas: {ideasCount} characters</span>
              </div>
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-blue-600" />
                <span>Draft: {draftCount} characters</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Done: {doneCount} characters</span>
              </div>
            </div>
            <div className="flex justify-end gap-4 text-sm text-muted-foreground mt-4">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
          </div>
        </div>
      )}

      {/* Project Name Dialog */}
      <Sheet open={showNameDialog} onOpenChange={setShowNameDialog}>
        <SheetContent className="max-w-md mx-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fixed !h-auto">
          <SheetHeader>
            <SheetTitle>Set Project Name</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <Input
              autoFocus
              value={pendingProjectName}
              onChange={e => setPendingProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full"
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave() }}
            />
          </div>
          <SheetFooter>
            <Button onClick={handleConfirmSave} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
     {/* Load Story Dialog */}
     <Sheet open={showLoadDialog} onOpenChange={setShowLoadDialog}>
       <SheetContent className="max-w-md mx-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fixed !h-auto">
         <SheetHeader>
           <SheetTitle>Load Story</SheetTitle>
         </SheetHeader>
         <div className="p-4">
           {isLoadingStories ? (
             <div className="flex flex-col items-center justify-center min-h-[120px]">
               <Loader2 className="animate-spin mb-2" />
               <span>Loading stories...</span>
             </div>
           ) : (
             <>
               <Select value={selectedStoryTitle} onValueChange={setSelectedStoryTitle}>
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder="Select a story to load" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectGroup>
                     {loadStoriesList.length === 0 && (
                       <SelectItem value="" disabled>No stories found</SelectItem>
                     )}
                     {loadStoriesList.map(story => (
                       <SelectItem key={story.title} value={story.title}>{story.title}</SelectItem>
                     ))}
                   </SelectGroup>
                 </SelectContent>
               </Select>
             </>
           )}
         </div>
         <SheetFooter>
           <Button onClick={handleConfirmLoad} className="w-full" disabled={!selectedStoryTitle || isLoadingStories}>Load</Button>
         </SheetFooter>
       </SheetContent>
     </Sheet>
    </div>
  )
}
