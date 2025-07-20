# Story Status Editor - Specification

## Overview

The Story Status Editor is a specialized text editor designed for writers to mark and track different stages of their writing process. It allows users to highlight text segments and assign them statuses like "ideas", "draft", and "done" to organize their writing workflow.

## Core Features

### 1. Text Editing
- **Single Text Field**: All content is stored in one continuous text field
- **Dual-Mode Editing**: Separate modes for editing and marking
- **Real-time Updates**: Text changes are reflected immediately
- **Word/Character Count**: Live tracking of document statistics

### 2. Marking System

#### Marking Types
- **Ideas**: Purple/Yellow highlighting for initial concepts and brainstorming
- **Draft**: Blue highlighting for work-in-progress content
- **Done**: Green highlighting for completed sections

#### Array-Based Marking System
The marking system uses a character-index-based approach for maximum robustness:

**Data Structure:**
```typescript
type MarkingValue = 0 | 1 | 2 | 3
// 0 = unmarked, 1 = ideas, 2 = draft, 3 = done

interface EditorState {
  text: string
  markings: MarkingValue[] // Array of same length as text
}
```

**Key Advantages:**
- **Character-Level Precision**: Each character has its own marking status
- **Robust to Text Changes**: Insertions and deletions automatically update marking positions
- **No Context Loss**: Markings never become "broken" due to text changes
- **Efficient Updates**: O(1) marking updates for any character range
- **Simple Serialization**: Easy to save/load marking data

#### Marking Creation
- **Text Selection**: Select text in marking mode to create new markings
- **Character-Level Marking**: Each character in the selection gets marked with the chosen status
- **Automatic Array Management**: System maintains marking array length equal to text length
- **Selection Detection**: Uses browser's native text selection API for accurate position detection

#### Marking Management
- **Status Updates**: Click existing markings to change their status
- **Marking Removal**: Remove markings through popup interface
- **Visual Feedback**: Different styling for borders vs highlighting modes

### 3. Dual Rendering Modes

#### Border Mode
- Dashed borders around marked text
- More prominent visual separation
- Purple/Blue/Green border colors

#### Highlighting Mode
- Google Docs-style background highlighting
- Subtle background colors
- Yellow/Blue/Green highlighting

### 4. Mode System

#### Edit Mode (Default)
- **Textarea Interface**: Standard textarea for normal text editing
- **Full Editing Capabilities**: Type, delete, copy, paste, undo, redo
- **Real-time Updates**: Text changes immediately update the marking array
- **No Marking Interactions**: Focus purely on text composition

#### Marking Mode
- **Rendered View**: Text displayed with React elements showing markings
- **Text Selection**: Select text to create new markings
- **Marking Interactions**: Click existing markings to modify status
- **No Text Editing**: Cannot edit text directly in marking mode

### 5. Text Selection and Marking Controls

#### Selection Detection
- **Native Browser Selection**: Uses `window.getSelection()` API for accurate text selection
- **Position Mapping**: Maps selected text to character positions in the original text
- **Real-time Updates**: Selection detection triggers on mouse up, key up, and select events

#### Marking Controls Interface
- **Conditional Display**: Controls only appear when text is selected in marking mode
- **Status Buttons**: Ideas, Draft, Done with color coding
- **Cancel Option**: Clear current selection and hide controls
- **Selection Clearing**: Automatically clears browser selection after marking

**Control Flow:**
1. User enables marking mode
2. User selects text in the editor
3. Marking controls appear below the header
4. User clicks a status button to mark the selection
5. Selection is cleared and controls disappear

## Technical Architecture

### Data Structure

```typescript
interface EditorState {
  text: string                    // Single text field
  markings: MarkingValue[]        // Array of marking values
}

type MarkingValue = 0 | 1 | 2 | 3
// 0 = unmarked, 1 = ideas, 2 = draft, 3 = done
```

### Character-Index-Based Positioning

The system uses character-index-based positioning instead of context-based positioning:

**Advantages:**
- Survives all text insertions/deletions
- No need to update marking ranges
- More robust than context-based positioning
- Natural for character-level precision
- Efficient O(1) marking operations

**Text Change Handling:**
- **Insertions**: New characters inherit marking status from surrounding text
- **Deletions**: Marking array shrinks to match text length
- **Array Synchronization**: System ensures marking array length always equals text length

### Smart Text Change Detection

**Insertion Detection:**
- Compare old and new text to find insertion point
- Insert new marking values at the correct position
- Inherit marking status from surrounding characters

**Deletion Detection:**
- Compare old and new text to find deletion point
- Remove marking values for deleted characters
- Maintain array synchronization

### Text Selection Implementation

**Selection API Integration:**
```typescript
const handleTextSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  
  const range = selection.getRangeAt(0)
  const selectedText = selection.toString().trim()
  
  // Map selection to character positions
  const start = editorState.text.indexOf(selectedText)
  const end = start + selectedText.length
  
  setSelectedText({ start, end, text: selectedText })
}
```

**Event Handling:**
- `onMouseUp`: Detects selection after mouse release
- `onKeyUp`: Detects selection after keyboard navigation
- `onSelect`: Detects selection changes in real-time

### Dual-Mode Interface

**Edit Mode Interface:**
```typescript
<Textarea
  value={editorState.text}
  onChange={(e) => handleTextChange(e.target.value)}
  className="min-h-[calc(100vh-200px)] text-lg leading-relaxed"
  placeholder="Start writing your story..."
/>
```

**Marking Mode Interface:**
```typescript
<div 
  ref={editorRef}
  className="min-h-[calc(100vh-200px)] text-lg leading-relaxed"
  onMouseUp={handleTextSelection}
  onKeyUp={handleTextSelection}
  onSelect={handleTextSelection}
>
  {renderTextWithMarkings()}
</div>
```

## User Interface

### Header Controls
- **Mode Toggle**: Switch between "Edit Text" and "Marking Mode"
- **Style Toggle**: Switch between "Borders" and "Highlighting"
- **Statistics**: Word count, character count, marked character count
- **Real-time Updates**: All statistics update immediately

### Marking Controls
- **Selection-Based**: Appears when text is selected in marking mode
- **Status Buttons**: Ideas, Draft, Done with color coding
- **Cancel Option**: Clear current selection
- **Auto-Hide**: Controls disappear after marking or cancellation

### Marking Popups
- **Status Display**: Current marking status with icon
- **Text Preview**: Shows marked text content
- **Status Change**: Buttons to change marking status
- **Remove Option**: Delete marking entirely

## File Structure

```
app/
├── app/
│   ├── editor/
│   │   ├── page.tsx           # Main editor component
│   │   └── sample-text.ts     # Sample content
│   └── layout.tsx             # App layout
├── components/
│   └── ui/                    # Shadcn UI components
└── SPECIFICATION.md           # This document
```

## Future Enhancements

### Data Structure Improvements
- **Piece Table**: Consider implementing piece table for better performance
- **Immutable Updates**: Add undo/redo functionality
- **Version Control**: Track marking changes over time

### Advanced Features
- **Marking Categories**: Custom marking types beyond the three defaults
- **Marking Notes**: Add notes/comments to markings
- **Export Options**: Export marked sections by status
- **Collaboration**: Share markings with other users

### Performance Optimizations
- **Virtual Scrolling**: For very large documents
- **Lazy Rendering**: Only render visible markings
- **Debounced Updates**: Optimize marking position calculations

## Technical Considerations

### Text Rendering
- **Mixed Content**: Render text with inline React elements for markings
- **Performance**: Efficient rendering of large documents
- **Accessibility**: Proper ARIA labels and keyboard navigation

### State Management
- **React State**: Uses React useState for local state
- **Efficient Updates**: Minimal re-renders on text changes
- **Array Synchronization**: Maintains marking array length equal to text length

### Browser Compatibility
- **Text Selection**: Uses standard browser selection APIs
- **CSS Compatibility**: Works across modern browsers
- **Mobile Support**: Responsive design for mobile devices

## Implementation Notes

### Current Limitations
- **Memory Usage**: Large documents require large marking arrays
- **Single Document**: Currently supports one document at a time
- **No Persistence**: Markings are not saved between sessions

### Design Decisions
- **Character Indices vs Context**: Chose character-index-based for robustness
- **Single Text Field**: Simplified data structure over segmented approach
- **Dual Rendering Modes**: Provides flexibility for different user preferences
- **Native Selection API**: Uses browser's built-in text selection for accuracy
- **Dual-Mode Interface**: Separate editing and marking modes for optimal UX

### Performance Characteristics
- **O(1) Marking Updates**: For any character range
- **O(n) Text Rendering**: Where n is text length
- **O(1) Array Synchronization**: For text changes
- **O(1) Selection Detection**: Using native browser APIs

## Conclusion

The Story Status Editor provides a specialized writing environment that balances simplicity with powerful marking capabilities. The character-index-based marking system ensures maximum robustness while the dual rendering modes accommodate different user preferences. The dual-mode interface provides optimal editing and marking experiences, with the selection-based marking controls providing an intuitive interface for creating and managing markings. The architecture is designed to scale with future enhancements while maintaining excellent performance characteristics. 