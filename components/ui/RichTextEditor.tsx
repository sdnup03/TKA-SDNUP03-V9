import React, { useRef, useEffect, useState } from 'react';
import { Button } from './brutalist';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Sigma } from 'lucide-react';
import { MathInput } from './MathInput';
import { DialogOverlay } from './brutalist';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className, autoFocus }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const savedSelection = useRef<Range | null>(null);

  // Sync value to innerHTML when value changes externally (e.g. loading saved data), 
  // but NOT when the user is typing (to avoid cursor jumping).
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value && !isFocused.current) {
       contentRef.current.innerHTML = value;
    }
    // Handle empty case explicitly to clear editor
    if (value === '' && contentRef.current) {
      contentRef.current.innerHTML = '';
    }
  }, [value]);

  // Auto-focus when autoFocus prop is true
  useEffect(() => {
    if (autoFocus && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const exec = (command: string, val: string = '') => {
    document.execCommand(command, false, val);
    if (contentRef.current) {
        onChange(contentRef.current.innerHTML);
        contentRef.current.focus();
    }
  };

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (savedSelection.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }
  };

  const handleInsertMath = (latex: string) => {
    if (contentRef.current && latex) {
      // Restore selection first
      contentRef.current.focus();
      restoreSelection();
      
      // Insert math as a special tag that MathRenderer will process
      const mathHtml = `<span class="math-formula" data-latex="${latex}" contenteditable="false" style="background: #E0F2F1; padding: 2px 6px; border-radius: 4px; font-family: serif; cursor: default;">[MATH]${latex}[/MATH]</span>&nbsp;`;
      
      // Try to insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = mathHtml;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = tempDiv.firstChild)) {
          frag.appendChild(node);
        }
        range.insertNode(frag);
        
        // Move cursor after inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Fallback: append to end
        contentRef.current.innerHTML += mathHtml;
      }
      
      onChange(contentRef.current.innerHTML);
      contentRef.current.focus();
    }
    setShowMathModal(false);
  };

  return (
    <>
    <div className={`border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b-2 border-black bg-gray-50 select-none">
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('bold')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Bold"><Bold className="w-4 h-4"/></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('italic')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Italic"><Italic className="w-4 h-4"/></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('underline')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Underline"><Underline className="w-4 h-4"/></Button>
        
        <div className="w-[2px] h-6 bg-black/20 mx-1"></div>
        
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('formatBlock', 'H3')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Heading"><Heading1 className="w-4 h-4"/></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('formatBlock', 'H4')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Subheading"><Heading2 className="w-4 h-4"/></Button>
        
        <div className="w-[2px] h-6 bg-black/20 mx-1"></div>

        <Button type="button" size="sm" variant="ghost" onClick={() => exec('insertUnorderedList')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Bullet List"><List className="w-4 h-4"/></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => exec('insertOrderedList')} className="h-8 w-8 p-0 hover:bg-black hover:text-white" title="Number List"><ListOrdered className="w-4 h-4"/></Button>
        
        <div className="w-[2px] h-6 bg-black/20 mx-1"></div>
        
        <Button 
          type="button" 
          size="sm" 
          variant="ghost" 
          onClick={() => {
            saveSelection();
            setShowMathModal(true);
          }} 
          className="h-8 px-2 hover:bg-[#4F46E5] hover:text-white flex items-center gap-1" 
          title="Sisipkan Rumus Matematika"
        >
          <Sigma className="w-4 h-4"/>
          <span className="text-xs font-bold hidden sm:inline">Rumus</span>
        </Button>
      </div>
      
      {/* Editor Content Area */}
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => { isFocused.current = false; }}
        className="flex-1 min-h-[150px] p-4 focus:outline-none focus:bg-yellow-50/30 overflow-y-auto 
          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 
          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2
          [&>h3]:text-xl [&>h3]:font-black [&>h3]:mb-2 
          [&>h4]:text-lg [&>h4]:font-bold [&>h4]:mb-1
          [&>p]:mb-2 [&>div]:mb-1
          [&_.math-formula]:inline-block [&_.math-formula]:mx-1"
        data-placeholder={placeholder}
      />
    </div>
    
    {/* Math Input Modal */}
    <DialogOverlay isOpen={showMathModal} onClose={() => setShowMathModal(false)}>
      <div>
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <Sigma className="w-5 h-5" /> Sisipkan Rumus Matematika
        </h3>
        <MathInput 
          onConfirm={handleInsertMath}
          onCancel={() => setShowMathModal(false)}
        />
      </div>
    </DialogOverlay>
    </>
  );
};