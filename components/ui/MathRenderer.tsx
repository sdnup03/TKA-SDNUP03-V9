 import React, { useEffect, useRef, memo } from 'react';
 import katex from 'katex';
 import 'katex/dist/katex.min.css';
 
 interface MathRendererProps {
   text: string;
   className?: string;
 }
 
 const renderMathInText = (text: string): string => {
   if (!text) return '';
   
   let result = text;
   
  // Process block math first: $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    try {
      const html = katex.renderToString(latex.trim(), { 
        displayMode: true,
        throwOnError: false,
        output: 'html'
      });
      return `<div class="math-block" style="text-align: center; margin: 0.5rem 0; max-width: 100%; overflow-x: auto;">${html}</div>`;
    } catch (e) {
      console.warn('Math render error (block):', e);
      return `<code class="math-error" style="word-break: break-word; background: #fee; padding: 2px 4px; border-radius: 2px;">$$${latex}$$</code>`;
    }
  });
   
  // Process inline math: $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, latex) => {
    try {
      const html = katex.renderToString(latex.trim(), { 
        displayMode: false,
        throwOnError: false,
        output: 'html'
      });
      return `<span class="math-inline" style="max-width: 100%; overflow-x: auto; display: inline-block;">${html}</span>`;
    } catch (e) {
      console.warn('Math render error (inline):', e);
      return `<code class="math-error" style="word-break: break-word; background: #fee; padding: 2px 4px; border-radius: 2px;">$${latex}$</code>`;
    }
  });
   
  // Process [MATH]...[/MATH] tags (from RichTextEditor)
  result = result.replace(/\[MATH\]([\s\S]*?)\[\/MATH\]/g, (_, latex) => {
    try {
      const html = katex.renderToString(latex.trim(), { 
        displayMode: false,
        throwOnError: false,
        output: 'html'
      });
      return `<span class="math-inline" style="max-width: 100%; overflow-x: auto; display: inline-block;">${html}</span>`;
    } catch (e) {
      console.warn('Math render error (tag):', e);
      return `<code class="math-error" style="word-break: break-word; background: #fee; padding: 2px 4px; border-radius: 2px;">[MATH]${latex}[/MATH]</code>`;
    }
  });
   
   return result;
 };
 
 export const MathRenderer: React.FC<MathRendererProps> = memo(({ text, className = '' }) => {
   const containerRef = useRef<HTMLDivElement>(null);
   
   useEffect(() => {
     if (containerRef.current && text) {
       const rendered = renderMathInText(text);
       containerRef.current.innerHTML = rendered;
     }
   }, [text]);
   
   if (!text) return null;
   
   // Check if text contains any math delimiters
   const hasMath = /\$[\s\S]*?\$|\[MATH\][\s\S]*?\[\/MATH\]/.test(text);
   
  if (!hasMath) {
    // No math, render as plain text/HTML
    return (
      <span 
        className={`${className} max-w-full break-words`}
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }
   
  return (
    <span 
      ref={containerRef} 
      className={`${className} max-w-full break-words`}
      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
    />
  );
 });
 
 MathRenderer.displayName = 'MathRenderer';
