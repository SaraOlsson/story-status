# Test Document for Array-Based Marking System

This is a test document to verify that the new array-based marking system works correctly.

## Test Cases

### 1. Basic Marking
- Select text and mark it as "Ideas"
- Select text and mark it as "Draft" 
- Select text and mark it as "Done"

### 2. Text Insertion
- Mark some text as "Ideas"
- Insert new text in the middle of the marked text
- Verify that the new text inherits the marking status

### 3. Text Deletion
- Mark some text as "Draft"
- Delete part of the marked text
- Verify that the marking array shrinks correctly

### 4. Status Changes
- Mark text as "Ideas"
- Click on the marked text and change status to "Done"
- Verify the status change works

### 5. Marking Removal
- Mark text as "Draft"
- Click on the marked text and remove the marking
- Verify the text becomes unmarked

### 6. Array Synchronization
- Verify that the marking array length always equals text length
- Test with various text operations (insert, delete, replace)

## Expected Behavior

- Each character should have its own marking status (0-3)
- Text insertions should inherit marking from surrounding text
- Text deletions should remove corresponding marking values
- The marking array should always be the same length as the text
- No "broken" markings should occur
- All marking operations should be O(1) for character ranges 