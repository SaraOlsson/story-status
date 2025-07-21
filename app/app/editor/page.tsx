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
  LogOut
} from "lucide-react"
import { sampleText } from "./sample-text"
import { useGoogleDrive } from "@/hooks/use-google-drive"

type MarkingStatus = "ideas" | "draft" | "done"

// New array-based marking system
type MarkingValue = 0 | 1 | 2 | 3 // 0=unmarked, 1=ideas, 2=draft, 3=done

interface EditorState {
  text: string
  markings: MarkingValue[] // Array of same length as text, each index corresponds to character
}

export default function Editor() {
  const [editorState, setEditorState] = useState<EditorState>({ 
    text: sampleText, 
    markings: new Array(sampleText.length).fill(0) // Initialize with all unmarked
  })
  const [selectedText, setSelectedText] = useState<{ start: number; end: number; text: string } | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isStatusMode, setIsStatusMode] = useState(false)
  const [useHighlighting, setUseHighlighting] = useState(false)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [storyTitle, setStoryTitle] = useState("Untitled Story")
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
  }, [loadStoredTokens])

  // Update word and character counts
  useEffect(() => {
    setCharCount(editorState.text.length)
    setWordCount(editorState.text.trim() ? editorState.text.trim().split(/\s+/).length : 0)
  }, [editorState.text])

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
                              console.log('Ideas button clicked for segment (highlight):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "ideas")
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
                              console.log('Draft button clicked for segment (highlight):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "draft")
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
                              console.log('Done button clicked for segment (highlight):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "done")
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
                            console.log('Remove button clicked for segment (highlight):', { segmentStart, segmentEnd })
                            removeMarking(segmentStart, segmentEnd)
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
                              console.log('Ideas button clicked for segment (border):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "ideas")
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
                              console.log('Draft button clicked for segment (border):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "draft")
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
                              console.log('Done button clicked for segment (border):', { segmentStart, segmentEnd })
                              updateMarkingStatus(segmentStart, segmentEnd, "done")
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
                            console.log('Remove button clicked for segment (border):', { segmentStart, segmentEnd })
                            removeMarking(segmentStart, segmentEnd)
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
                          console.log('Ideas button clicked for last segment (highlight):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "ideas")
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
                          console.log('Draft button clicked for last segment (highlight):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "draft")
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
                          console.log('Done button clicked for last segment (highlight):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "done")
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
                        console.log('Remove button clicked for last segment (highlight):', { segmentStart, segmentEnd })
                        removeMarking(segmentStart, segmentEnd)
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
                          console.log('Ideas button clicked for last segment (border):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "ideas")
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
                          console.log('Draft button clicked for last segment (border):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "draft")
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
                          console.log('Done button clicked for last segment (border):', { segmentStart, segmentEnd })
                          updateMarkingStatus(segmentStart, segmentEnd, "done")
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
                        console.log('Remove button clicked for last segment (border):', { segmentStart, segmentEnd })
                        removeMarking(segmentStart, segmentEnd)
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

  const handleSave = async () => {
    console.log("Save button clicked")
    console.log("Is authenticated:", isAuthenticated)
    console.log("Drive loading:", driveLoading)
    console.log("Drive error:", driveError)
    
    if (!isAuthenticated) {
      // If not authenticated, prompt user to connect Google Drive
      if (confirm("You need to connect to Google Drive first. Connect now?")) {
        await authenticate()
      }
      return
    }

    // Ask user where to save
    const folderName = prompt("Enter folder name (or leave empty for 'Story Status Editor'):", "Story Status Editor") || "Story Status Editor"
    
    console.log("Saving story with data:", {
      title: storyTitle,
      contentLength: editorState.text.length,
      markingsLength: editorState.markings.length,
      folderName
    })

    try {
      const success = await saveStory({
        title: storyTitle,
        content: editorState.text,
        markings: editorState.markings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, folderName)

      console.log("Save result:", success)

      if (success) {
        alert(`Story saved successfully to Google Drive folder: ${folderName}!`)
      } else {
        alert("Failed to save story. Please try again.")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save story. Please try again.")
    }
  }

  const handleLoadStories = async () => {
    console.log("Load stories button clicked")
    console.log("Is authenticated:", isAuthenticated)
    
    if (!isAuthenticated) {
      if (confirm("Connect to Google Drive to load your stories?")) {
        await authenticate()
      }
      return
    }

    try {
      console.log("Attempting to load stories...")
      // Load stories from the app's dedicated folder
      const stories = await loadStories()
      console.log("Stories loaded:", stories.length)
      console.log("Story titles:", stories.map(s => s.title))

      if (stories.length > 0) {
        const storyNames = stories.map(s => s.title).join('\n')
        const selectedStory = prompt(`Available stories:\n${storyNames}\n\nEnter the exact title of the story to load:`)
        
        if (selectedStory) {
          const story = stories.find(s => s.title === selectedStory)
          if (story) {
            console.log("Loading story:", story.title)
            setEditorState({
              text: story.content,
              markings: story.markings as MarkingValue[]
            })
            setStoryTitle(story.title)
            alert("Story loaded successfully!")
          } else {
            alert("Story not found. Please check the title and try again.")
          }
        }
      } else {
        console.log("No stories found in folder")
        alert("No stories found in the 'Story Status Editor' folder. Create a new story and save it to get started!")
      }
    } catch (error) {
      console.error("Load error:", error)
      alert("Failed to load stories. Please try again.")
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
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Editor</h1>
          </div>
          
          {/* Story Title Input */}
          <div className="ml-6 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Title:</span>
            <input
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              className="px-2 py-1 text-sm border rounded bg-background"
              placeholder="Enter story title..."
            />
          </div>
          
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
                console.log("Save button clicked - testing")
                handleSave()
              }} 
              size="sm"
              disabled={!isAuthenticated || driveLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isAuthenticated ? "Save" : "Connect to Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Marking Controls - Only show in Marking Mode when text is selected */}
      {isStatusMode && selectedText && (
        <div className="border-b bg-muted/50 p-2">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
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
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {isStatusMode ? (
            // Marking mode - show rendered text with markings
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
            {renderTextWithMarkings()}
          </div>
          ) : (
            // Edit mode - show textarea for editing
            <Textarea
              ref={textareaRef}
              value={editorState.text}
              onChange={(e) => handleTextChange(e.target.value)}
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
    </div>
  )
}
