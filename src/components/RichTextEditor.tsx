import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

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
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="rounded bg-primary-main px-3 py-1 font-semibold text-primary-contrast hover:bg-primary-dark transition"
          >
            Exit Fullscreen (Esc)
          </button>
        </div>
      )}

      {/* ─── Toolbar Container ────────────────────────────────────────────── */}
      <div className="border-b border-divider bg-surface-neutral p-2 select-none rich-editor-dropdown-container">
        {/* ROW 1 */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
          {/* Group 1: Magic Wand Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs hover:bg-surface-neutral">
              <button
                type="button"
                onClick={() => setShowWandMenu((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-ink-primary hover:text-primary-main transition"
                title="AI & Templates"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h.01M12 2h.01M16 4h.01M5 8h.01M19 8h.01M12 11l-8 8"
                  />
                </svg>
                <span className="text-[10px] text-ink-secondary">▼</span>
              </button>
            </div>

            {showWandMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                <div className="px-3 py-1 font-bold text-ink-disabled uppercase tracking-wider text-[10px]">
                  Insert Policy Template
                </div>
                <button
                  type="button"
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
                  }
                  className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex items-center gap-2"
                >
                  <span>📋</span> Standard Policy Format
                </button>
                <button
                  type="button"
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
                  }
                  className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex items-center gap-2"
                >
                  <span>📊</span> Abbreviations Table
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>3.0 WORKING HOURS & ATTENDANCE</h3>
<p><strong>3.1 Working Hours / Attendance</strong></p>
<p>3.1.1 Regular office working hours are from 9:30 AM to 6:30 PM, Monday through Friday.</p>
<p>3.1.2 Every employee must record biometric or mobile clock-in upon arrival.</p>
<p>3.1.3 Core business hours are strictly maintained between 11:00 AM and 5:00 PM.</p>
<p>3.1.4 Minimum required work duration is 8.5 working hours per day.</p>
`)
                  }
                  className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex items-center gap-2"
                >
                  <span>⏰</span> Working Hours Template
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertTemplate(`
<h3>4.0 CODE OF PROFESSIONAL CONDUCT</h3>
<p>4.1 Employees are expected to act with integrity, professionalism, and mutual respect.</p>
<p>4.2 Company assets, confidentiality, and proprietary information must be protected.</p>
<p>4.3 Zero-tolerance policy toward harassment, discrimination, or conflict of interest.</p>
`)
                  }
                  className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex items-center gap-2"
                >
                  <span>🛡️</span> Code of Conduct Template
                </button>
              </div>
            )}
          </div>

          {/* Group 2: B | I | U | Eraser */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            <button
              type="button"
              onClick={() => execute('bold')}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral font-serif font-black text-sm transition"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => execute('italic')}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral font-serif italic font-bold text-sm transition"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => execute('underline')}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral font-serif font-bold text-sm underline underline-offset-2 transition"
              title="Underline (Ctrl+U)"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => execute('removeFormat')}
              className="px-2.5 py-1.5 text-ink-secondary hover:bg-surface-neutral hover:text-ink-primary transition"
              title="Remove Formatting (Ctrl+\)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          {/* Group 3: Font Family Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <button
                type="button"
                onClick={() => setShowFontMenu((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-ink-primary hover:bg-surface-neutral transition min-w-[95px] justify-between"
                title="Font Family"
              >
                <span className="truncate">{currentFont}</span>
                <span className="text-[10px] text-ink-secondary">▼</span>
              </button>
            </div>

            {showFontMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-40 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                {['sans-serif', 'Poppins', 'Arial', 'Inter', 'Georgia', 'Times New Roman', 'Courier New'].map(
                  (font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => handleFontSelect(font)}
                      className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark transition"
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Group 4: Highlight Color Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <button
                type="button"
                onClick={() => setShowColorMenu((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 text-ink-primary hover:bg-surface-neutral transition"
                title="Highlight Color"
              >
                <span className="bg-warning-light text-ink-primary px-1 py-0.5 rounded-xs font-black text-xs leading-none">
                  A
                </span>
                <span className="text-[10px] text-ink-secondary">▼</span>
              </button>
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
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleHighlight(item.color)}
                    className="h-6 w-full rounded border border-divider transition hover:scale-110"
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Group 5: Bullet List | Numbered List | Alignment */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            <button
              type="button"
              onClick={() => execute('insertUnorderedList')}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
              title="Bulleted List (Ctrl+Shift+8)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execute('insertOrderedList')}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
              title="Numbered List (Ctrl+Shift+7)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 6h14M7 12h14M7 18h14M3 5v3m0 0h2M3 11h2v3H3m0 3h2v3H3"
                />
              </svg>
            </button>

            {/* Alignment dropdown */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowAlignMenu((prev) => !prev)}
                className="flex items-center gap-0.5 px-2 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
                title="Text Alignment"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h10M4 18h14"
                  />
                </svg>
                <span className="text-[10px] text-ink-secondary">▼</span>
              </button>

              {showAlignMenu && (
                <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-divider bg-surface-paper py-1 shadow-lg text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      execute('justifyLeft');
                      setShowAlignMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex justify-between"
                  >
                    <span>Align Left</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+L</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execute('justifyCenter');
                      setShowAlignMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex justify-between"
                  >
                    <span>Align Center</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+E</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execute('justifyRight');
                      setShowAlignMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex justify-between"
                  >
                    <span>Align Right</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+R</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execute('justifyFull');
                      setShowAlignMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-ink-primary hover:bg-primary-lighter hover:text-primary-dark flex justify-between"
                  >
                    <span>Justify</span>
                    <span className="text-[10px] text-ink-disabled">Ctrl+Shift+J</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Group 6: 10x10 Table Grid Picker Dropdown */}
          <div className="relative inline-block">
            <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setShowTableMenu((prev) => !prev);
                  setHoverGrid({ cols: 1, rows: 1 });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
                title="Insert Table"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6h18M3 14h18M10 3v18M16 3v18"
                  />
                </svg>
                <span className="text-[10px] text-ink-secondary">▼</span>
              </button>
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
            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
              title="Insert Link (Ctrl+K)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </button>

            {/* Image */}
            <button
              type="button"
              onClick={handleOpenImageModal}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
              title="Insert Image (Ctrl+Alt+I)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={handleOpenVideoModal}
              className="px-2.5 py-1.5 text-ink-primary hover:bg-surface-neutral transition"
              title="Insert Video (Ctrl+Alt+V)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          {/* Group 2: Fullscreen | Code View </> | Help ? */}
          <div className="inline-flex items-center rounded border border-divider bg-surface-paper shadow-2xs divide-x divide-divider">
            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`px-2.5 py-1.5 transition ${
                isFullscreen
                  ? 'bg-primary-main text-primary-contrast hover:bg-primary-dark'
                  : 'text-ink-primary hover:bg-surface-neutral'
              }`}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Full Screen (Ctrl+Shift+F / F11)'}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
                <polyline points="6 9 6 6 9 6" />
                <polyline points="15 6 18 6 18 9" />
                <polyline points="18 15 18 18 15 18" />
                <polyline points="9 18 6 18 6 15" />
              </svg>
            </button>

            {/* Code View </> */}
            <button
              type="button"
              onClick={() => setIsCodeView((prev) => !prev)}
              className={`px-2.5 py-1.5 font-mono text-xs font-bold transition ${
                isCodeView ? 'bg-primary-main text-primary-contrast' : 'text-ink-primary hover:bg-surface-neutral'
              }`}
              title="Toggle HTML Code View (Ctrl+/)"
            >
              &lt;/&gt;
            </button>

            {/* Help ? */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-2.5 py-1.5 font-bold text-xs text-ink-primary hover:bg-surface-neutral transition"
              title="Help & Shortcuts"
            >
              ?
            </button>
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
          <button
            type="button"
            onClick={handleInsertRowBelow}
            title="Insert row below"
            className="relative z-10 p-1.5 text-ink-primary hover:text-primary-main hover:bg-surface-neutral rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="6" width="18" height="6" rx="1" />
              <line x1="9" y1="6" x2="9" y2="12" />
              <line x1="15" y1="6" x2="15" y2="12" />
              <path d="M12 15v5m0 0l-2.5-2.5M12 20l2.5-2.5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleInsertRowAbove}
            title="Insert row above"
            className="relative z-10 p-1.5 text-ink-primary hover:text-primary-main hover:bg-surface-neutral rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9V4m0 0l-2.5 2.5M12 4l2.5 2.5" />
              <rect x="3" y="12" width="18" height="6" rx="1" />
              <line x1="9" y1="12" x2="9" y2="18" />
              <line x1="15" y1="12" x2="15" y2="18" />
            </svg>
          </button>

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 2: Columns */}
          <button
            type="button"
            onClick={handleInsertColLeft}
            title="Insert column left"
            className="relative z-10 p-1.5 text-ink-primary hover:text-primary-main hover:bg-surface-neutral rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12H4m0 0l2.5-2.5M4 12l2.5 2.5" />
              <rect x="12" y="3" width="7" height="18" rx="1" />
              <line x1="12" y1="9" x2="19" y2="9" />
              <line x1="12" y1="15" x2="19" y2="15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleInsertColRight}
            title="Insert column right"
            className="relative z-10 p-1.5 text-ink-primary hover:text-primary-main hover:bg-surface-neutral rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="3" width="7" height="18" rx="1" />
              <line x1="5" y1="9" x2="12" y2="9" />
              <line x1="5" y1="15" x2="12" y2="15" />
              <path d="M15 12h5m0 0l-2.5-2.5M20 12l2.5 2.5" />
            </svg>
          </button>

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 3: Delete Row / Delete Column */}
          <button
            type="button"
            onClick={handleDeleteRow}
            title="Delete row"
            className="relative z-10 p-1.5 text-ink-primary hover:text-error-main hover:bg-error-lighter rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="7" rx="1" />
              <line x1="9" y1="11" x2="9" y2="18" />
              <line x1="15" y1="11" x2="15" y2="18" />
              <path d="M10 4l4 4m0-4l-4 4" strokeWidth="2" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleDeleteCol}
            title="Delete column"
            className="relative z-10 p-1.5 text-ink-primary hover:text-error-main hover:bg-error-lighter rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="3" width="7" height="18" rx="1" />
              <line x1="5" y1="9" x2="12" y2="9" />
              <line x1="5" y1="15" x2="12" y2="15" />
              <path d="M15 10l4 4m0-4l-4 4" strokeWidth="2" />
            </svg>
          </button>

          <div className="relative z-10 w-px h-5 bg-grey-200 mx-0.5" />

          {/* GROUP 4: Delete Table */}
          <button
            type="button"
            onClick={handleDeleteTable}
            title="Delete table"
            className="relative z-10 p-1.5 text-ink-primary hover:text-error-main hover:bg-error-lighter rounded transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
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
          <button
            type="button"
            onClick={() => {
              execute('unlink');
              setActiveLinkContext(null);
            }}
            title="Unlink"
            className="p-1 text-ink-primary hover:text-error-main hover:bg-error-lighter rounded transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1M3 3l18 18" />
            </svg>
          </button>
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
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="text-ink-disabled hover:text-ink-secondary text-lg leading-none"
                >
                  ✕
                </button>
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
                  <button
                    type="button"
                    onClick={(e) => handleInsertLinkSubmit(e)}
                    disabled={!linkUrl.trim()}
                    className="rounded bg-primary-main px-4 py-2 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-primary-dark disabled:opacity-50 transition cursor-pointer"
                  >
                    Insert Link
                  </button>
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
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="text-ink-disabled hover:text-ink-secondary text-lg leading-none"
                >
                  ✕
                </button>
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
                  <button
                    type="button"
                    onClick={(e) => handleInsertImageSubmit(e)}
                    disabled={!imageFile && !imagePreview && !imageUrl.trim()}
                    className="rounded bg-primary-main px-4 py-2 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-primary-dark disabled:opacity-50 transition cursor-pointer"
                  >
                    Insert Image
                  </button>
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
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="text-ink-disabled hover:text-ink-secondary text-lg leading-none"
                >
                  ✕
                </button>
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
                  <button
                    type="button"
                    onClick={(e) => handleInsertVideoSubmit(e)}
                    disabled={!videoUrl.trim()}
                    className="rounded bg-primary-main px-4 py-2 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-primary-dark disabled:opacity-50 transition cursor-pointer"
                  >
                    Insert Video
                  </button>
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
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="text-ink-disabled hover:text-ink-secondary text-lg leading-none p-1"
                >
                  ✕
                </button>
              </div>

              {/* Filter & Category Pills */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-divider">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(['All', 'Formatting', 'Navigation', 'Alignment', 'Structure', 'Media'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setHelpCategory(cat)}
                      className={`px-2.5 py-1 rounded transition text-xs font-medium cursor-pointer ${
                        helpCategory === cat
                          ? 'bg-primary-main text-primary-contrast'
                          : 'bg-surface-neutral text-ink-secondary hover:bg-grey-200'
                      }`}
                    >
                      {cat}
                    </button>
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
                    <button
                      type="button"
                      onClick={() => setHelpSearch('')}
                      className="absolute right-2 top-1 text-xs text-ink-disabled hover:text-ink-secondary"
                    >
                      ✕
                    </button>
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
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="rounded bg-primary-main px-4 py-1.5 text-xs font-semibold text-primary-contrast hover:bg-primary-dark transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
