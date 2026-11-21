import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Iconify } from '@/components/Iconify';
import { Button, IconButton } from '@/components/ui/Button';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

interface ActiveTableContext {
  table: HTMLTableElement;
  row: HTMLTableRowElement;
  cell: HTMLTableCellElement;
  top: number;
  left: number;
}

interface ActiveLinkContext {
  link: HTMLAnchorElement;
  top: number;
  left: number;
  url: string;
}

interface ShortcutItem {
  key: string;
  label: string;
  category: 'Formatting' | 'Navigation' | 'Alignment' | 'Structure' | 'Media';
}

const SHORTCUTS_LIST: ShortcutItem[] = [
  // Formatting
  { key: 'CTRL+B', label: 'Set a bold style', category: 'Formatting' },
  { key: 'CTRL+I', label: 'Set a italic style', category: 'Formatting' },
  { key: 'CTRL+U', label: 'Set a underline style', category: 'Formatting' },
  { key: 'CTRL+SHIFT+S', label: 'Set a strikethrough style', category: 'Formatting' },
  { key: 'CTRL+\\', label: 'Clean a style / Remove formatting', category: 'Formatting' },
  { key: 'CTRL+K', label: 'Insert Link', category: 'Formatting' },

  // Navigation & Actions
  { key: 'ESC', label: 'Escape / Exit Fullscreen / Close dialogs', category: 'Navigation' },
  { key: 'CTRL+Z', label: 'Undo the last command', category: 'Navigation' },
  { key: 'CTRL+Y', label: 'Redo the last command', category: 'Navigation' },
  { key: 'ENTER', label: 'Insert Paragraph', category: 'Navigation' },
  { key: 'SHIFT+ENTER', label: 'Insert soft line break (<br>)', category: 'Navigation' },
  { key: 'TAB', label: 'Tab / Indent text', category: 'Navigation' },
  { key: 'SHIFT+TAB', label: 'Untab / Outdent text', category: 'Navigation' },
  { key: 'CTRL+[', label: 'Outdent selection', category: 'Navigation' },
  { key: 'CTRL+]', label: 'Indent selection', category: 'Navigation' },

  // Alignment
  { key: 'CTRL+SHIFT+L', label: 'Align text left', category: 'Alignment' },
  { key: 'CTRL+SHIFT+E', label: 'Align text center', category: 'Alignment' },
  { key: 'CTRL+SHIFT+R', label: 'Align text right', category: 'Alignment' },
  { key: 'CTRL+SHIFT+J', label: 'Justify text full', category: 'Alignment' },

  // Structure / Headings / Lists
  { key: 'CTRL+0', label: 'Format as Normal Paragraph (<p>)', category: 'Structure' },
  { key: 'CTRL+1', label: 'Format as Heading 1 (<h1>)', category: 'Structure' },
  { key: 'CTRL+2', label: 'Format as Heading 2 (<h2>)', category: 'Structure' },
  { key: 'CTRL+3', label: 'Format as Heading 3 (<h3>)', category: 'Structure' },
  { key: 'CTRL+4', label: 'Format as Heading 4 (<h4>)', category: 'Structure' },
  { key: 'CTRL+SHIFT+8', label: 'Bulleted List (unordered)', category: 'Structure' },
  { key: 'CTRL+SHIFT+7', label: 'Numbered List (ordered)', category: 'Structure' },

  // Media & View
  { key: 'CTRL+SHIFT+F', label: 'Toggle Full Screen mode (or F11)', category: 'Media' },
  { key: 'CTRL+/', label: 'Toggle HTML Code View (or CTRL+SHIFT+C)', category: 'Media' },
  { key: 'CTRL+ALT+I', label: 'Open Insert Image dialog', category: 'Media' },
  { key: 'CTRL+ALT+V', label: 'Open Insert Video dialog', category: 'Media' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  minHeight = '240px',
  className = '',
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const [isCodeView, setIsCodeView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dropdown states
  const [showWandMenu, setShowWandMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpenInNewWindow, setLinkOpenInNewWindow] = useState(true);
  const [linkUseDefaultProtocol, setLinkUseDefaultProtocol] = useState(true);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpCategory, setHelpCategory] = useState<'All' | 'Formatting' | 'Navigation' | 'Alignment' | 'Structure' | 'Media'>('All');

  // 10x10 Table grid hover state
  const [hoverGrid, setHoverGrid] = useState<{ cols: number; rows: number }>({ cols: 1, rows: 1 });

  // Floating Contextual Table Toolbar state
  const [activeTableContext, setActiveTableContext] = useState<ActiveTableContext | null>(null);

  // Floating Link Popover state
  const [activeLinkContext, setActiveLinkContext] = useState<ActiveLinkContext | null>(null);

  const [currentFont, setCurrentFont] = useState('sans-serif');

  // Keep editorRef innerHTML in sync when value changes externally (and not in code view)
  useEffect(() => {
    if (editorRef.current && !isCodeView) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isCodeView]);

  // Global ESC key to close open dialogs or exit fullscreen
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLinkModal) setShowLinkModal(false);
        else if (showImageModal) setShowImageModal(false);
        else if (showVideoModal) setShowVideoModal(false);
        else if (showHelpModal) setShowHelpModal(false);
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFullscreen, showLinkModal, showImageModal, showVideoModal, showHelpModal]);

  // Contextual Table & Link Detection
  const updateEditorContext = useCallback(() => {
    if (!editorRef.current || isCodeView) {
      setActiveTableContext(null);
      setActiveLinkContext(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    const el =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement;

    if (!el || !editorRef.current.contains(el)) {
      setActiveTableContext(null);
      setActiveLinkContext(null);
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();

    // Check Table Context
    const table = el.closest('table') as HTMLTableElement | null;
    const cell = el.closest('td, th') as HTMLTableCellElement | null;
    const row = el.closest('tr') as HTMLTableRowElement | null;

    if (table && cell && row && editorRef.current.contains(table) && containerRect) {
      const cellRect = cell.getBoundingClientRect();
      const popoverWidth = 265;
      let left = cellRect.left - containerRect.left + cellRect.width / 2 - 35;
      if (left < 8) left = 8;
      if (left + popoverWidth > containerRect.width - 8) {
        left = Math.max(8, containerRect.width - popoverWidth - 8);
      }

      let top = cellRect.bottom - containerRect.top + 8;
      if (top + 45 > containerRect.height && cellRect.top - containerRect.top > 50) {
        top = cellRect.top - containerRect.top - 46;
      }

      setActiveTableContext({
        table,
        row,
        cell,
        top,
        left,
      });
    } else {
      setActiveTableContext(null);
    }

    // Check Link Context
    const link = el.closest('a') as HTMLAnchorElement | null;
    if (link && editorRef.current.contains(link) && containerRect && !table) {
      const linkRect = link.getBoundingClientRect();
      const left = Math.max(8, linkRect.left - containerRect.left);
      const top = linkRect.bottom - containerRect.top + 6;
      setActiveLinkContext({
        link,
        top,
        left,
        url: link.getAttribute('href') || '',
      });
    } else {
      setActiveLinkContext(null);
    }
  }, [isCodeView]);

  // Close dropdowns and contextual popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rich-editor-dropdown-container')) {
        setShowWandMenu(false);
        setShowFontMenu(false);
        setShowColorMenu(false);
        setShowAlignMenu(false);
        setShowTableMenu(false);
      }
      if (!target.closest('table') && !target.closest('.table-floating-toolbar')) {
        setActiveTableContext(null);
      }
      if (!target.closest('a') && !target.closest('.link-floating-toolbar')) {
        setActiveLinkContext(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen to selectionchange to detect cursor inside table/link
  useEffect(() => {
    const handleSelectionChange = () => {
      updateEditorContext();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateEditorContext]);

  // Selection save and restore
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      return sel.toString();
    }
    return '';
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  // Safe HTML insertion at selection or appended to editor
  const insertHtmlAtSelection = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    restoreSelection();

    const sel = window.getSelection();
    let inserted = false;

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        try {
          inserted = document.execCommand('insertHTML', false, html);
          if (!inserted) {
            range.deleteContents();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node: ChildNode | null;
            while ((node = temp.firstChild)) {
              frag.appendChild(node);
            }
            range.insertNode(frag);
            inserted = true;
          }
        } catch {
          inserted = false;
        }
      }
    }

    if (!inserted) {
      editorRef.current.insertAdjacentHTML('beforeend', html);
    }

    onChange(editorRef.current.innerHTML);
    setTimeout(updateEditorContext, 30);
  };

  const execute = useCallback(
    (command: string, val: string | undefined = undefined) => {
      if (isCodeView) return;
      if (editorRef.current) {
        editorRef.current.focus();
      }
      document.execCommand(command, false, val);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [isCodeView, onChange]
  );

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateEditorContext();
  };

  const handleFontSelect = (font: string) => {
    setCurrentFont(font);
    execute('fontName', font);
    setShowFontMenu(false);
  };

  const handleHighlight = (color: string) => {
    execute('hiliteColor', color);
    setShowColorMenu(false);
  };

  // ─── Complete Functional Keyboard Shortcuts ──────────────────────────────
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // TAB / SHIFT+TAB
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isShift) {
        execute('outdent');
      } else {
        execute('indent');
      }
      return;
    }

    if (isCtrl) {
      const key = e.key.toLowerCase();

      // Bold: Ctrl+B
      if (key === 'b' && !isShift && !isAlt) {
        e.preventDefault();
        execute('bold');
        return;
      }

      // Italic: Ctrl+I
      if (key === 'i' && !isShift && !isAlt) {
        e.preventDefault();
        execute('italic');
        return;
      }

      // Underline: Ctrl+U
      if (key === 'u' && !isShift && !isAlt) {
        e.preventDefault();
        execute('underline');
        return;
      }

      // Strikethrough: Ctrl+Shift+S
      if (key === 's' && isShift) {
        e.preventDefault();
        execute('strikeThrough');
        return;
      }

      // Clean style: Ctrl+\ (Backslash)
      if (e.key === '\\') {
        e.preventDefault();
        execute('removeFormat');
        return;
      }

      // Insert Link: Ctrl+K
      if (key === 'k' && !isShift && !isAlt) {
        e.preventDefault();
        handleOpenLinkModal();
        return;
      }

      // Undo: Ctrl+Z
      if (key === 'z' && !isShift) {
        e.preventDefault();
        execute('undo');
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((key === 'y' && !isShift) || (key === 'z' && isShift)) {
        e.preventDefault();
        execute('redo');
        return;
      }

      // Indent: Ctrl+]
      if (e.key === ']') {
        e.preventDefault();
        execute('indent');
        return;
      }

      // Outdent: Ctrl+[
      if (e.key === '[') {
        e.preventDefault();
        execute('outdent');
        return;
      }

      // Alignments: Ctrl+Shift+L, Ctrl+Shift+E, Ctrl+Shift+R, Ctrl+Shift+J
      if (isShift && key === 'l') {
        e.preventDefault();
        execute('justifyLeft');
        return;
      }
      if (isShift && key === 'e') {
        e.preventDefault();
        execute('justifyCenter');
        return;
      }
      if (isShift && key === 'r') {
        e.preventDefault();
        execute('justifyRight');
        return;
      }
      if (isShift && key === 'j') {
        e.preventDefault();
        execute('justifyFull');
        return;
      }

      // Lists: Ctrl+Shift+8 (Bullet), Ctrl+Shift+7 (Numbered)
      if (isShift && (e.key === '8' || e.key === '*')) {
        e.preventDefault();
        execute('insertUnorderedList');
        return;
      }
      if (isShift && (e.key === '7' || e.key === '&')) {
        e.preventDefault();
        execute('insertOrderedList');
        return;
      }

      // Headings: Ctrl+0 to Ctrl+4
      if (['0', '1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tag = e.key === '0' ? 'p' : `h${e.key}`;
        document.execCommand('formatBlock', false, tag);
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
        return;
      }

      // Toggle Code View: Ctrl+/ or Ctrl+Shift+C
      if (e.key === '/' || (isShift && key === 'c')) {
        e.preventDefault();
        setIsCodeView((prev) => !prev);
        return;
      }

      // Fullscreen: Ctrl+Shift+F
      if (isShift && key === 'f') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
        return;
      }

      // Open Image Modal: Ctrl+Alt+I
      if (isAlt && key === 'i') {
        e.preventDefault();
        handleOpenImageModal();
        return;
      }

      // Open Video Modal: Ctrl+Alt+V
      if (isAlt && key === 'v') {
        e.preventDefault();
        handleOpenVideoModal();
        return;
      }
    }

    // F11 for Fullscreen
    if (e.key === 'F11') {
      e.preventDefault();
      setIsFullscreen((prev) => !prev);
      return;
    }
  };

  // ─── Table Insertion (10x10) ───────────────────────────────────────────────
  const handleInsertTable = (rows: number, cols: number) => {
    let html =
      '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #d1d5db;" border="1"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td style="border: 1px solid #d1d5db; padding: 8px 12px; min-width: 48px; vertical-align: top;">${
          r === 0 ? `<strong>Header ${c + 1}</strong>` : `<br>`
        }</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    insertHtmlAtSelection(html);
    setShowTableMenu(false);
    setHoverGrid({ cols: 1, rows: 1 });
  };

  // ─── Table Floating Toolbar Actions (Image 2) ──────────────────────────────
  const handleInsertRowBelow = () => {
    if (!activeTableContext) return;
    const { table, row } = activeTableContext;
    const nextRow = table.insertRow(row.rowIndex + 1);
    const colCount = row.cells.length || (table.rows[0]?.cells.length ?? 1);
    for (let i = 0; i < colCount; i++) {
      const newCell = nextRow.insertCell(i);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.style.minWidth = '48px';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '<br>';
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setTimeout(updateEditorContext, 20);
  };

  const handleInsertRowAbove = () => {
    if (!activeTableContext) return;
    const { table, row } = activeTableContext;
    const newRow = table.insertRow(row.rowIndex);
    const colCount = row.cells.length || (table.rows[0]?.cells.length ?? 1);
    for (let i = 0; i < colCount; i++) {
      const newCell = newRow.insertCell(i);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.style.minWidth = '48px';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = '<br>';
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setTimeout(updateEditorContext, 20);
  };

  const handleInsertColLeft = () => {
    if (!activeTableContext) return;
    const { table, cell } = activeTableContext;
    const colIdx = cell.cellIndex;
    for (let r = 0; r < table.rows.length; r++) {
      const curRow = table.rows[r];
      const isHeaderRow =
        curRow.parentElement?.tagName.toLowerCase() === 'thead' ||
        (r === 0 && curRow.cells[0]?.tagName.toLowerCase() === 'th');
      const newCell = curRow.insertCell(colIdx);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.style.minWidth = '48px';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = isHeaderRow ? '<strong>Col</strong>' : '<br>';
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setTimeout(updateEditorContext, 20);
  };

  const handleInsertColRight = () => {
    if (!activeTableContext) return;
    const { table, cell } = activeTableContext;
    const colIdx = cell.cellIndex + 1;
    for (let r = 0; r < table.rows.length; r++) {
      const curRow = table.rows[r];
      const isHeaderRow =
        curRow.parentElement?.tagName.toLowerCase() === 'thead' ||
        (r === 0 && curRow.cells[0]?.tagName.toLowerCase() === 'th');
      const newCell = curRow.insertCell(colIdx);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.style.minWidth = '48px';
      newCell.style.verticalAlign = 'top';
      newCell.innerHTML = isHeaderRow ? '<strong>Col</strong>' : '<br>';
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setTimeout(updateEditorContext, 20);
  };

  const handleDeleteRow = () => {
    if (!activeTableContext) return;
    const { table, row } = activeTableContext;
    table.deleteRow(row.rowIndex);
    if (table.rows.length === 0) {
      table.remove();
      setActiveTableContext(null);
    } else {
      setTimeout(updateEditorContext, 20);
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleDeleteCol = () => {
    if (!activeTableContext) return;
    const { table, cell } = activeTableContext;
    const colIdx = cell.cellIndex;
    const rowList = Array.from(table.rows);
    rowList.forEach((r) => {
      if (r.cells[colIdx]) {
        r.deleteCell(colIdx);
      }
    });
    if (table.rows.length === 0 || table.rows[0].cells.length === 0) {
      table.remove();
      setActiveTableContext(null);
    } else {
      setTimeout(updateEditorContext, 20);
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleDeleteTable = () => {
    if (!activeTableContext) return;
    const { table } = activeTableContext;
    table.remove();
    setActiveTableContext(null);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // ─── Modal 1: Insert Link (Image 1) ────────────────────────────────────────
  const handleOpenLinkModal = () => {
    const text = saveSelection();
    setLinkText(text);
    setLinkUrl('');
    setLinkOpenInNewWindow(true);
    setLinkUseDefaultProtocol(true);
    setShowLinkModal(true);
  };

  const handleInsertLinkSubmit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let url = linkUrl.trim();
    if (!url) return;

    if (
      linkUseDefaultProtocol &&
      !/^https?:\/\//i.test(url) &&
      !url.startsWith('/') &&
      !url.startsWith('#') &&
      !url.startsWith('mailto:')
    ) {
      url = `http://${url}`;
    }

    const text = linkText.trim() || url;
    const targetAttr = linkOpenInNewWindow
      ? ' target="_blank" rel="noopener noreferrer"'
      : '';
    const anchorHtml = `<a href="${url}"${targetAttr} class="text-primary-main underline hover:text-primary-dark">${text}</a>`;

    insertHtmlAtSelection(anchorHtml);
    setShowLinkModal(false);
  };

  // ─── Modal 2: Insert Image (Image 2) ───────────────────────────────────────
  const handleOpenImageModal = () => {
    saveSelection();
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setShowImageModal(true);
  };

  const handleImageFileChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleInsertImageSubmit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const doInsert = (src: string) => {
      const imgHtml = `<p><img src="${src}" alt="Uploaded Image" style="max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; display: block;" /></p><p><br></p>`;
      insertHtmlAtSelection(imgHtml);
      setShowImageModal(false);
      setImageUrl('');
      setImageFile(null);
      setImagePreview(null);
    };

    if (imagePreview) {
      doInsert(imagePreview);
    } else if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) doInsert(src);
      };
      reader.readAsDataURL(imageFile);
    } else if (imageUrl.trim()) {
      doInsert(imageUrl.trim());
    }
  };

  // ─── Modal 3: Insert Video (Image 5) ───────────────────────────────────────
  const handleOpenVideoModal = () => {
    saveSelection();
    setVideoUrl('');
    setShowVideoModal(true);
  };

  const handleInsertVideoSubmit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let url = videoUrl.trim();
    if (!url) return;

    let embedUrl = url;
    const ytMatch = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (ytMatch && ytMatch[1]) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    } else {
      const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
      if (vimeoMatch && vimeoMatch[3]) {
        embedUrl = `https://player.vimeo.com/video/${vimeoMatch[3]}`;
      } else {
        const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
        if (dmMatch && dmMatch[1]) {
          embedUrl = `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
        }
      }
    }

    const iframeHtml = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 12px 0; border-radius: 6px;"><iframe src="${embedUrl}" style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen></iframe></div><p><br></p>`;
    insertHtmlAtSelection(iframeHtml);
    setShowVideoModal(false);
    setVideoUrl('');
  };

  // ─── Template Insertion ────────────────────────────────────────────────────
  const handleInsertTemplate = (templateHtml: string) => {
    if (isCodeView) {
      onChange(`${value}\n${templateHtml}`);
    } else {
      insertHtmlAtSelection(templateHtml);
    }
    setShowWandMenu(false);
  };

  // Filtered Help Shortcuts
  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS_LIST.filter((item) => {
      const matchesCat = helpCategory === 'All' || item.category === helpCategory;
      const q = helpSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.key.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [helpCategory, helpSearch]);

  return (
    <div
      ref={containerRef}
      className={`transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex flex-col bg-surface-paper h-screen w-screen overflow-hidden'
          : `relative rounded-md border border-divider bg-surface-paper shadow-2xs ${className}`
      }`}
    >
      <style>{`
        .rich-editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          border: 1px solid rgb(var(--grey-300));
        }
        .rich-editor-content th,
        .rich-editor-content td {
          border: 1px solid rgb(var(--grey-300));
          padding: 8px 12px;
          min-width: 48px;
          vertical-align: top;
        }
        .rich-editor-content th {
          background-color: rgb(var(--grey-100));
          font-weight: 600;
        }
        .rich-editor-content td:focus,
        .rich-editor-content th:focus {
          outline: 2px solid rgb(var(--primary-main));
          outline-offset: -2px;
        }
        .rich-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          display: inline-block;
        }
      `}</style>

      {/* ─── Fullscreen Banner ───────────────────────────────────────────── */}
      {isFullscreen && (
        <div className="flex items-center justify-between border-b border-primary-light bg-primary-lighter px-4 py-2 text-xs text-primary-darker select-none">
          <div className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-primary-main animate-pulse" />
            <span>Full Screen Policy Editor</span>
            <span className="text-ink-secondary font-normal hidden sm:inline">(Press Esc or click the fullscreen icon to exit)</span>
          </div>
          <Button size="small"
            onClick={() => setIsFullscreen(false)}>Exit Fullscreen (Esc)</Button>
        </div>
      )}

      {/* ─── Toolbar Container ────────────────────────────────────────────── */}
      <div className="border-b border-divider bg-surface-neutral p-2 select-none rich-editor-dropdown-container">
        {/* ROW 1 */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
          {/* Group 1: Magic Wand Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs hover:bg-surface-neutral">
              <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="magic-wand" />} endIcon={<Iconify icon="chevron-down" />} className="!rounded-none"
                onClick={() => setShowWandMenu((prev) => !prev)}
                title="AI & Templates" />
            </div>

            {showWandMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                <div className="px-3 py-1 font-bold text-ink-disabled uppercase tracking-wider text-[10px]">
                  Insert Policy Template
                </div>
                <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="policies" />} className="w-full !h-auto !justify-start !rounded-none !px-3 py-1.5 text-left !font-normal"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>1.0 TABLE OF CONTENTS</h3>
<p><strong>1.0 TABLE OF CONTENTS</strong></p>
<p><strong>2.0 ABBREVIATIONS</strong></p>
<p><strong>3.0 POLICY OVERVIEW</strong></p>
<p><strong>4.0 WORKPLACE POLICY & CODE OF CONDUCT</strong></p>
<p><strong>5.0 ANNEXURES</strong></p>
<hr/>
<p>This policy outlines official operational rules, standards, and employee guidelines.</p>
`)
                  }>Standard Policy Format</Button>
                <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="table" />} className="w-full !h-auto !justify-start !rounded-none !px-3 py-1.5 text-left !font-normal"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>2.0 ABBREVIATIONS</h3>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #d1d5db;" border="1">
  <thead>
    <tr style="background-color: #f9fafb;">
      <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; width: 35%;">Abbreviations</th>
      <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: left;">Extended Form</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;"><strong>CGPA</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Cumulative Grade Point Average</td>
    </tr>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;"><strong>CV</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Curriculum Vitae</td>
    </tr>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;"><strong>ETMS</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Employee Training Management Software</td>
    </tr>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;"><strong>HR</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Human Resource</td>
    </tr>
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;"><strong>HRMS</strong></td>
      <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Human Resource Management System</td>
    </tr>
  </tbody>
</table>
<p><br></p>
`)
                  }>Abbreviations Table</Button>
                <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="overtime" />} className="w-full !h-auto !justify-start !rounded-none !px-3 py-1.5 text-left !font-normal"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>3.0 WORKING HOURS & ATTENDANCE</h3>
<p><strong>3.1 Working Hours / Attendance</strong></p>
<p>3.1.1 Regular office working hours are from 9:30 AM to 6:30 PM, Monday through Friday.</p>
<p>3.1.2 Every employee must record biometric or mobile clock-in upon arrival.</p>
<p>3.1.3 Core business hours are strictly maintained between 11:00 AM and 5:00 PM.</p>
<p>3.1.4 Minimum required work duration is 8.5 working hours per day.</p>
`)
                  }>Working Hours Template</Button>
                <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="compliance" />} className="w-full !h-auto !justify-start !rounded-none !px-3 py-1.5 text-left !font-normal"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>4.0 CODE OF PROFESSIONAL CONDUCT</h3>
<p>4.1 Employees are expected to act with integrity, professionalism, and mutual respect.</p>
<p>4.2 Company assets, confidentiality, and proprietary information must be protected.</p>
<p>4.3 Zero-tolerance policy toward harassment, discrimination, or conflict of interest.</p>
`)
                  }>Code of Conduct Template</Button>
              </div>
            )}
          </div>

          {/* Group 2: B | I | U | Eraser */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            <Button variant="text" color="inherit" size="small" className="!rounded-none font-serif !font-black"
              onClick={() => execute('bold')}
              title="Bold (Ctrl+B)">B</Button>
            <Button variant="text" color="inherit" size="small" className="!rounded-none font-serif italic"
              onClick={() => execute('italic')}
              title="Italic (Ctrl+I)">I</Button>
            <Button variant="text" color="inherit" size="small" className="!rounded-none font-serif underline underline-offset-2"
              onClick={() => execute('underline')}
              title="Underline (Ctrl+U)">U</Button>
            <IconButton icon="clear-format" size="small" className="!rounded-none"
              onClick={() => execute('removeFormat')}
              title="Remove Formatting (Ctrl+\)"
             aria-label="Remove Formatting (Ctrl+\)" />
          </div>

          {/* Group 3: Font Family Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <Button variant="text" color="inherit" size="small" endIcon={<Iconify icon="chevron-down" />} className="min-w-[95px] !justify-between"
                onClick={() => setShowFontMenu((prev) => !prev)}
                title="Font Family"><span className="truncate">{currentFont}</span></Button>
            </div>

            {showFontMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-40 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                {['sans-serif', 'Poppins', 'Arial', 'Inter', 'Georgia', 'Times New Roman', 'Courier New'].map(
                  (font) => (
                    <Button variant="text" color="inherit" size="small" className="w-full !h-auto !justify-start !rounded-none !px-3 py-1.5 text-left !font-normal"
                      key={font}
                      onClick={() => handleFontSelect(font)}
                      style={{ fontFamily: font }}>{font}</Button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Group 4: Highlight Color Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <Button variant="text" color="inherit" size="small" endIcon={<Iconify icon="chevron-down" />}
                onClick={() => setShowColorMenu((prev) => !prev)}
                title="Highlight Color"><span className="bg-warning-light text-ink-primary px-1 py-0.5 rounded-xs font-black text-xs leading-none">A</span></Button>
            </div>

            {showColorMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-32 rounded-md border border-divider bg-surface-paper p-2 shadow-lg text-xs grid grid-cols-3 gap-1.5">
                {[
                  { name: 'Yellow', color: '#fef08a' },
                  { name: 'Green', color: '#bbf7d0' },
                  { name: 'Cyan', color: '#a5f3fc' },
                  { name: 'Pink', color: '#fbcfe8' },
                  { name: 'Orange', color: '#fed7aa' },
                  { name: 'Clear', color: 'transparent' },
                ].map((item) => (
                  <Button variant="text" color="inherit" size="small" aria-label={item.name} className="!h-6 w-full !rounded border border-divider hover:scale-110"
                    key={item.name}
                    onClick={() => handleHighlight(item.color)}
                    style={{ backgroundColor: item.color }}
                    title={item.name} />
                ))}
              </div>
            )}
          </div>

          {/* Group 5: Bullet List | Numbered List | Alignment */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            <IconButton icon="list-bulleted" size="small" className="!rounded-none"
              onClick={() => execute('insertUnorderedList')}
              title="Bulleted List (Ctrl+Shift+8)"
             aria-label="Bulleted List (Ctrl+Shift+8)" />

            <IconButton icon="list-numbered" size="small" className="!rounded-none"
              onClick={() => execute('insertOrderedList')}
              title="Numbered List (Ctrl+Shift+7)"
             aria-label="Numbered List (Ctrl+Shift+7)" />

            {/* Alignment dropdown */}
            <div className="relative inline-block">
              <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="align-left" />} endIcon={<Iconify icon="chevron-down" />} className="!rounded-none"
                onClick={() => setShowAlignMenu((prev) => !prev)}
                title="Text Alignment" />

              {showAlignMenu && (
                <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                  <Button variant="text" color="inherit" size="small" className="w-full !h-auto !justify-between !rounded-none !px-3 py-1.5 text-left !font-normal"
                    onClick={() => {
                      execute('justifyLeft');
                      setShowAlignMenu(false);
                    }}><span>Align Left</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+L</span></Button>
                  <Button variant="text" color="inherit" size="small" className="w-full !h-auto !justify-between !rounded-none !px-3 py-1.5 text-left !font-normal"
                    onClick={() => {
                      execute('justifyCenter');
                      setShowAlignMenu(false);
                    }}><span>Align Center</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+E</span></Button>
                  <Button variant="text" color="inherit" size="small" className="w-full !h-auto !justify-between !rounded-none !px-3 py-1.5 text-left !font-normal"
                    onClick={() => {
                      execute('justifyRight');
                      setShowAlignMenu(false);
                    }}><span>Align Right</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+R</span></Button>
                  <Button variant="text" color="inherit" size="small" className="w-full !h-auto !justify-between !rounded-none !px-3 py-1.5 text-left !font-normal"
                    onClick={() => {
                      execute('justifyFull');
                      setShowAlignMenu(false);
                    }}><span>Justify</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+J</span></Button>
                </div>
              )}
            </div>
          </div>

          {/* Group 6: 10x10 Table Grid Picker Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="table" />} endIcon={<Iconify icon="chevron-down" />} className="!rounded-none"
                onClick={() => {
                  setShowTableMenu((prev) => !prev);
                  setHoverGrid({ cols: 1, rows: 1 });
                }}
                title="Insert Table" />
            </div>

            {/* Interactive 10x10 Grid Table Selector */}
            {showTableMenu && (
              <div
                className="absolute left-0 top-full z-30 mt-1 rounded-md border border-divider bg-surface-paper p-2.5 shadow-lg select-none"
                onMouseLeave={() => setHoverGrid({ cols: 0, rows: 0 })}
              >
                <div className="grid grid-cols-10 gap-1" style={{ width: '190px' }}>
                  {Array.from({ length: 10 }, (_, r) => r + 1).map((row) =>
                    Array.from({ length: 10 }, (_, c) => c + 1).map((col) => {
                      const isHighlighted =
                        col <= hoverGrid.cols && row <= hoverGrid.rows;
                      return (
                        <div
                          key={`${row}-${col}`}
                          onMouseEnter={() => setHoverGrid({ cols: col, rows: row })}
                          onClick={() => handleInsertTable(row, col)}
                          className={`h-3.5 w-3.5 cursor-pointer rounded-xs border transition-colors ${
                            isHighlighted
                              ? 'border-primary-main bg-primary-lighter'
                              : 'border-divider bg-surface-neutral/50 hover:border-divider'
                          }`}
                        />
                      );
                    })
                  )}
                </div>
                <div className="mt-2 text-left text-xs font-normal text-ink-primary">
                  {hoverGrid.cols > 0 && hoverGrid.rows > 0
                    ? `${hoverGrid.cols} x ${hoverGrid.rows}`
                    : '1 x 1'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Link | Image | Video | Fullscreen | Code View | Help */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Group 1: Link | Image | Video */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            {/* Link */}
            <IconButton icon="link" size="small" className="!rounded-none"
              onClick={handleOpenLinkModal}
              title="Insert Link (Ctrl+K)"
             aria-label="Insert Link (Ctrl+K)" />

            {/* Image */}
            <IconButton icon="image" size="small" className="!rounded-none"
              onClick={handleOpenImageModal}
              title="Insert Image (Ctrl+Alt+I)"
             aria-label="Insert Image (Ctrl+Alt+I)" />

            {/* Video */}
            <IconButton icon="video" size="small" className="!rounded-none"
              onClick={handleOpenVideoModal}
              title="Insert Video (Ctrl+Alt+V)"
             aria-label="Insert Video (Ctrl+Alt+V)" />
          </div>

          {/* Group 2: Fullscreen | Code View </> | Help ? */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            {/* Fullscreen */}
            <IconButton icon={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size="small" variant={isFullscreen ? 'soft' : 'text'} color={isFullscreen ? 'primary' : 'inherit'} className="!rounded-none"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Full Screen (Ctrl+Shift+F / F11)'}
             aria-label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Full Screen (Ctrl+Shift+F / F11)'} />

            {/* Code View </> */}
            <IconButton icon="code" size="small" variant={isCodeView ? 'soft' : 'text'} color={isCodeView ? 'primary' : 'inherit'} className="!rounded-none"
              onClick={() => setIsCodeView((prev) => !prev)}
              title="Toggle HTML Code View (Ctrl+/)"
             aria-label="Toggle HTML Code View (Ctrl+/)" />

            {/* Help ? */}
            <IconButton icon="help" size="small" className="!rounded-none"
              onClick={() => setShowHelpModal(true)}
              title="Help & Shortcuts"
             aria-label="Help & Shortcuts" />
          </div>
        </div>
      </div>

      {/* ─── Editor Surface ──────────────────────────────────────────────── */}
      {isCodeView ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter raw HTML content here..."
          className="w-full flex-1 p-4 font-mono text-xs text-ink-primary focus:outline-none bg-surface-neutral/50 leading-relaxed rounded-b-md resize-y"
          style={{ minHeight: isFullscreen ? 'calc(100vh - 120px)' : minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={updateEditorContext}
          onKeyUp={updateEditorContext}
          onMouseUp={updateEditorContext}
          onScroll={updateEditorContext}
          onKeyDown={handleEditorKeyDown}
          data-placeholder={placeholder}
          className={`rich-editor-content prose prose-sm max-w-none w-full flex-1 p-4 text-sm text-ink-primary focus:outline-none leading-relaxed overflow-y-auto ${
            isFullscreen ? 'max-w-5xl mx-auto py-6' : 'rounded-b-md'
          }`}
          style={{ minHeight: isFullscreen ? 'calc(100vh - 120px)' : minHeight }}
        />
      )}

      {/* ─── Floating Contextual Table Toolbar (Image 2) ────────────────── */}
      {activeTableContext && (
        <div
          className="table-floating-toolbar absolute z-40 bg-surface-paper border border-divider rounded-md shadow-lg flex items-center p-1 gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: `${activeTableContext.top}px`,
            left: `${activeTableContext.left}px`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Caret pointing up */}
          <div className="absolute -top-1.5 left-5 w-3 h-3 bg-surface-paper border-t border-l border-divider rotate-45 transform pointer-events-none" />

          {/* GROUP 1: Rows */}
          <IconButton icon="row-below" size="small" className="relative z-10"
            onClick={handleInsertRowBelow}
            title="Insert row below"
           aria-label="Insert row below" />

          <IconButton icon="row-above" size="small" className="relative z-10"
            onClick={handleInsertRowAbove}
            title="Insert row above"
           aria-label="Insert row above" />

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 2: Columns */}
          <IconButton icon="arrow-left" size="small" className="relative z-10"
            onClick={handleInsertColLeft}
            title="Insert column left"
           aria-label="Insert column left" />

          <IconButton icon="arrow-right" size="small" className="relative z-10"
            onClick={handleInsertColRight}
            title="Insert column right"
           aria-label="Insert column right" />

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 3: Delete Row / Delete Column */}
          <IconButton icon="close" size="small" color="error" className="relative z-10"
            onClick={handleDeleteRow}
            title="Delete row"
           aria-label="Delete row" />

          <IconButton icon="close" size="small" color="error" className="relative z-10"
            onClick={handleDeleteCol}
            title="Delete column"
           aria-label="Delete column" />

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 4: Delete Table */}
          <IconButton icon="trash" size="small" color="error" className="relative z-10"
            onClick={handleDeleteTable}
            title="Delete table"
           aria-label="Delete table" />
        </div>
      )}

      {/* ─── Floating Link Popover ────────────────────────────────────────── */}
      {activeLinkContext && (
        <div
          className="link-floating-toolbar absolute z-40 bg-surface-paper border border-divider rounded shadow-md flex items-center p-1 gap-1 select-none animate-in fade-in duration-100"
          style={{
            top: `${activeLinkContext.top}px`,
            left: `${activeLinkContext.left}px`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="absolute -top-1.5 left-4 w-2.5 h-2.5 bg-surface-paper border-t border-l border-divider rotate-45 transform" />
          <a
            href={activeLinkContext.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link in new window"
            className="p-1 text-ink-primary hover:text-primary-main hover:bg-surface-neutral rounded transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <IconButton icon="unlink" size="small" color="error"
            onClick={() => {
              execute('unlink');
              setActiveLinkContext(null);
            }}
            title="Unlink"
           aria-label="Unlink" />
        </div>
      )}

      {/* ─── MODAL 1: Insert Link (Portal) ────────────────────────────────── */}
      {showLinkModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-grey-900/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-surface-paper p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-divider">
                <h3 className="text-base font-normal text-ink-primary">Insert Link</h3>
                <IconButton icon="close" size="small" aria-label="Close"
                  onClick={() => setShowLinkModal(false)} />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Text to display
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInsertLinkSubmit(e);
                    }}
                    placeholder="Text"
                    className="w-full rounded border border-divider px-3 py-1.5 text-xs text-ink-primary focus:border-primary-main focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    To what URL should this link go?
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInsertLinkSubmit(e);
                    }}
                    placeholder="https://example.com"
                    className="w-full rounded border border-divider px-3 py-1.5 text-xs text-ink-primary focus:border-primary-main focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-xs text-ink-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkOpenInNewWindow}
                      onChange={(e) => setLinkOpenInNewWindow(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-divider text-primary-main focus:ring-primary-main"
                    />
                    <span>Open in new window</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkUseDefaultProtocol}
                      onChange={(e) => setLinkUseDefaultProtocol(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-divider text-primary-main focus:ring-primary-main"
                    />
                    <span>Use default protocol</span>
                  </label>
                </div>

                <div className="flex justify-end pt-3">
                  <Button size="small"
                    onClick={(e) => handleInsertLinkSubmit(e)}
                    disabled={!linkUrl.trim()}>Insert Link</Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─── MODAL 2: Insert Image (Portal) ───────────────────────────────── */}
      {showImageModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-grey-900/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-surface-paper p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-divider">
                <h3 className="text-base font-normal text-ink-primary">Insert Image</h3>
                <IconButton icon="close" size="small" aria-label="Close"
                  onClick={() => setShowImageModal(false)} />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Select from files
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)}
                    className="w-full text-xs text-ink-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-divider file:bg-surface-neutral file:text-xs file:font-medium file:text-ink-primary hover:file:bg-surface-neutral cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="mt-2 p-1.5 border border-divider rounded bg-surface-neutral max-h-32 overflow-hidden flex items-center justify-center">
                      <img src={imagePreview} alt="Preview" className="max-h-28 object-contain rounded" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInsertImageSubmit(e);
                    }}
                    placeholder="https://example.com/image.png"
                    className="w-full rounded border border-divider px-3 py-1.5 text-xs text-ink-primary focus:border-primary-main focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <Button size="small"
                    onClick={(e) => handleInsertImageSubmit(e)}
                    disabled={!imageFile && !imagePreview && !imageUrl.trim()}>Insert Image</Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─── MODAL 3: Insert Video (Portal) ───────────────────────────────── */}
      {showVideoModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-grey-900/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-surface-paper p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-divider">
                <h3 className="text-base font-normal text-ink-primary">Insert Video</h3>
                <IconButton icon="close" size="small" aria-label="Close"
                  onClick={() => setShowVideoModal(false)} />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Video URL (YouTube, Vimeo, Vine, Instagram, DailyMotion or Youku)
                  </label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInsertVideoSubmit(e);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded border border-divider px-3 py-1.5 text-xs text-ink-primary focus:border-primary-main focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <Button size="small"
                    onClick={(e) => handleInsertVideoSubmit(e)}
                    disabled={!videoUrl.trim()}>Insert Video</Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─── MODAL 4: Full Categorized Functional Help (Portal) ───────────── */}
      {showHelpModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-grey-900/40 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-surface-paper p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-divider">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-normal text-ink-primary">Editor Help &amp; Keyboard Shortcuts</h3>
                  <span className="text-xs bg-primary-lighter text-primary-dark font-semibold px-2 py-0.5 rounded-full">
                    {filteredShortcuts.length} Shortcuts
                  </span>
                </div>
                <IconButton icon="close" size="small" aria-label="Close"
                  onClick={() => setShowHelpModal(false)} />
              </div>

              {/* Filter & Category Pills */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-divider">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(['All', 'Formatting', 'Navigation', 'Alignment', 'Structure', 'Media'] as const).map((cat) => (
                    <Button size="small" variant={helpCategory === cat ? 'contained' : 'soft'} color={helpCategory === cat ? 'primary' : 'inherit'}
                      key={cat}
                      onClick={() => setHelpCategory(cat)}>{cat}</Button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={helpSearch}
                    onChange={(e) => setHelpSearch(e.target.value)}
                    placeholder="Search shortcuts..."
                    className="w-44 rounded border border-divider px-2.5 py-1 text-xs text-ink-primary placeholder-ink-disabled focus:outline-none focus:border-primary-main"
                  />
                  {helpSearch && (
                    <IconButton icon="close" size="small" aria-label="Clear search" className="absolute right-0.5 top-1/2 -translate-y-1/2"
                      onClick={() => setHelpSearch('')} />
                  )}
                </div>
              </div>

              {/* Shortcuts Table */}
              <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-1 text-xs divide-y divide-divider">
                {filteredShortcuts.length > 0 ? (
                  filteredShortcuts.map((item) => (
                    <div
                      key={item.key + item.label}
                      className="flex items-center justify-between py-1.5 px-1 hover:bg-surface-neutral rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-block bg-grey-900 text-primary-contrast text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs tracking-wider shadow-2xs min-w-[70px] text-center">
                          {item.key}
                        </span>
                        <span className="text-ink-primary font-normal">{item.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-disabled bg-surface-neutral px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-ink-disabled">
                    No shortcuts found matching &quot;{helpSearch}&quot;
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between text-xs text-ink-secondary">
                <span className="text-primary-main text-[11px] font-medium">
                  Summernote 0.8.18 · All Shortcuts Active in Editor
                </span>
                <Button size="small"
                  onClick={() => setShowHelpModal(false)}>Close</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
