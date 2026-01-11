 import React, { useEffect, useRef, useState } from 'react';
 import { Button } from './brutalist';
 import { Check, X } from 'lucide-react';
 import 'mathlive';
 
 declare global {
   namespace JSX {
     interface IntrinsicElements {
       'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
         ref?: React.Ref<any>;
         'virtual-keyboard-mode'?: string;
       }, HTMLElement>;
     }
   }
 }
 
 interface MathInputProps {
   initialValue?: string;
   onConfirm: (latex: string) => void;
   onCancel: () => void;
 }
 
 export const MathInput: React.FC<MathInputProps> = ({ initialValue = '', onConfirm, onCancel }) => {
   const mathFieldRef = useRef<any>(null);
   const [latex, setLatex] = useState(initialValue);
 
   useEffect(() => {
     const mf = mathFieldRef.current;
     if (mf) {
       mf.value = initialValue;
       
       const handleInput = () => {
         setLatex(mf.value);
       };
       
       mf.addEventListener('input', handleInput);
       
       setTimeout(() => {
         mf.focus();
       }, 100);
       
       return () => {
         mf.removeEventListener('input', handleInput);
       };
     }
   }, [initialValue]);
 
   const handleConfirm = () => {
     if (latex.trim()) {
       onConfirm(latex);
     }
   };
 
   return (
     <div className="space-y-4">
       <div className="border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_#000]">
         <math-field
           ref={mathFieldRef}
           virtual-keyboard-mode="manual"
           style={{
             width: '100%',
             minHeight: '60px',
             fontSize: '1.25rem',
             border: 'none',
             outline: 'none',
           }}
         />
       </div>
       
       <div className="text-xs text-gray-500 font-medium">
         <p className="mb-1">Tips: Gunakan keyboard virtual atau ketik langsung:</p>
         <ul className="list-disc pl-4 space-y-0.5">
           <li><code className="bg-gray-100 px-1">^</code> untuk pangkat (contoh: x^2)</li>
           <li><code className="bg-gray-100 px-1">/</code> untuk pecahan (contoh: 1/2)</li>
           <li><code className="bg-gray-100 px-1">sqrt</code> untuk akar kuadrat</li>
           <li><code className="bg-gray-100 px-1">pi</code> untuk π</li>
         </ul>
       </div>
 
       <div className="flex justify-end gap-2">
         <Button variant="outline" size="sm" onClick={onCancel}>
           <X className="w-4 h-4 mr-1" /> Batal
         </Button>
         <Button variant="primary" size="sm" onClick={handleConfirm} disabled={!latex.trim()}>
           <Check className="w-4 h-4 mr-1" /> Sisipkan Rumus
         </Button>
       </div>
     </div>
   );
 };
