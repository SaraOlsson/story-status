"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Save,
  FileText
} from "lucide-react"

export default function Editor() {
  const [content, setContent] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const handleContentChange = (value: string) => {
    setContent(value)
    setCharCount(value.length)
    setWordCount(value.trim() ? value.trim().split(/\s+/).length : 0)
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving content:", content)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Editor</h1>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Textarea
            placeholder="Start writing your story..."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[calc(100vh-200px)] resize-none border-0 focus-visible:ring-0 text-lg leading-relaxed p-8"
            style={{ 
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '1.125rem',
              lineHeight: '1.75'
            }}
          />
        </div>
      </div>
    </div>
  )
}
