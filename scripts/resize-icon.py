#!/usr/bin/env python3
"""
Script untuk resize icon menjadi ukuran PWA
Usage: python scripts/resize-icon.py <input-image>
Example: python scripts/resize-icon.py icon.png
"""

import sys
from PIL import Image
import os

def resize_icon(input_path):
    """Resize icon ke ukuran 192x192 dan 512x512"""
    if not os.path.exists(input_path):
        print(f"Error: File {input_path} tidak ditemukan!")
        return
    
    try:
        # Buka gambar
        img = Image.open(input_path)
        
        # Resize ke 192x192
        img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
        output_192 = 'public/icon-192.png'
        img_192.save(output_192, 'PNG')
        print(f"✅ Created: {output_192}")
        
        # Resize ke 512x512
        img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
        output_512 = 'public/icon-512.png'
        img_512.save(output_512, 'PNG')
        print(f"✅ Created: {output_512}")
        
        print("\n🎉 Icon PWA berhasil dibuat!")
        print("   File tersimpan di: public/icon-192.png dan public/icon-512.png")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nPastikan:")
        print("1. File gambar valid (PNG, JPG, dll)")
        print("2. Pillow library terinstall: pip install Pillow")
        print("3. Folder 'public' sudah ada")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/resize-icon.py <input-image>")
        print("Example: python scripts/resize-icon.py icon.png")
        sys.exit(1)
    
    resize_icon(sys.argv[1])

