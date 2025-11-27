'use client';

import React, { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { langs } from '@uiw/codemirror-extensions-langs';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { xcodeLight } from '@uiw/codemirror-theme-xcode';
import { useTheme } from 'next-themes';
import { EditorView } from '@codemirror/view';

interface CodeRendererProps {
  content: string;
  language?: string;
  className?: string;
}

// Map of language aliases to CodeMirror language support
// We cast `langs` to `any` so TypeScript stops complaining about missing properties.
const languageMap: Record<string, any> = {
  js: (langs as any).javascript,
  javascript: (langs as any).javascript,

  jsx: (langs as any).jsx ?? (langs as any).javascript,

  ts: (langs as any).typescript,
  typescript: (langs as any).typescript,
  tsx: (langs as any).tsx ?? (langs as any).typescript,

  json: (langs as any).json,
  py: (langs as any).python,
  python: (langs as any).python,

  html: (langs as any).html,
  css: (langs as any).css,

  sql: (langs as any).sql,

  bash: (langs as any).bash,
  sh: (langs as any).bash,
  shell: (langs as any).bash,

  md: (langs as any).markdown,
  markdown: (langs as any).markdown,

  yaml: (langs as any).yaml,
  yml: (langs as any).yaml,
};


export function CodeRenderer({
  content,
  language = '',
  className,
}: CodeRendererProps) {
  // Get current theme
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Set mounted state to true after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the language extension to use
  const langExtension =
    language && languageMap[language] ? [languageMap[language]()] : [];

  // Add line wrapping extension
  const extensions = [...langExtension, EditorView.lineWrapping];

  // Select the theme based on the current theme
  const theme = mounted && resolvedTheme === 'dark' ? vscodeDark : xcodeLight;

  return (
    <ScrollArea className={cn('w-full h-full', className)}>
      <div className="w-full">
        <CodeMirror
          value={content}
          theme={theme}
          extensions={extensions}
          basicSetup={{
            lineNumbers: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            foldGutter: false,
          }}
          editable={false}
          className="text-sm w-full min-h-full"
          style={{ maxWidth: '100%' }}
          height="auto"
        />
      </div>
    </ScrollArea>
  );
}
