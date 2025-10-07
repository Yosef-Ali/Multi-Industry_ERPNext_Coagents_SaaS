'use client';

import { Fragment, useCallback } from 'react';
import { Streamdown } from 'streamdown';
import { CodeBlock, CodeBlockCopyButton } from '@/components/elements/code-block';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/components/toast';

type RichResponseProps = {
  text: string;
  className?: string;
};

type Segment =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

function splitMarkdownIntoSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  const codeFence = /```([\w-]+)?\n([\s\S]*?)```/g; // language optional
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeFence.exec(input)) !== null) {
    const [full, langRaw, code] = match;
    const start = match.index;
    const end = match.index + full.length;

    if (start > lastIndex) {
      segments.push({ type: 'text', content: input.slice(lastIndex, start) });
    }

    const language = (langRaw || 'plaintext').toLowerCase();
    segments.push({ type: 'code', language, content: code.replace(/\n$/, '') });
    lastIndex = end;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', content: input.slice(lastIndex) });
  }

  return segments;
}

export function RichResponse({ text, className }: RichResponseProps) {
  const segments = splitMarkdownIntoSegments(text);

  const handleInlineCodeCopy = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    if (target.tagName !== 'CODE') return;
    // Ignore fenced code blocks (inside <pre>)
    if (target.closest('pre')) return;
    const codeText = target.textContent || '';
    if (!codeText.trim()) return;
    navigator.clipboard.writeText(codeText).then(
      () => toast({ type: 'success', description: 'Copied code' }),
      () => toast({ type: 'error', description: 'Copy failed' })
    );
  }, []);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {segments.map((seg, idx) => (
        <Fragment key={idx}>
          {seg.type === 'text' ? (
            <div onClick={handleInlineCodeCopy} className="[&_code]:cursor-copy">
              <MaybeCollapsibleText content={seg.content} />
            </div>
          ) : (
            <MaybeCollapsibleCode content={seg.content} language={seg.language} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

const TEXT_COLLAPSE_LINES = 24;
const CODE_COLLAPSE_LINES = 24;

function countLines(s: string) {
  return s.split(/\r?\n/).length;
}

function MaybeCollapsibleText({ content }: { content: string }) {
  const lines = countLines(content);
  if (lines <= TEXT_COLLAPSE_LINES) {
    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          '[&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto'
        )}
      >
        {content}
      </Streamdown>
    );
  }

  return (
    <Collapsible className="not-prose w-full rounded-md border">
      <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
        <span>Long section ({lines} lines)</span>
        <CollapsibleTrigger className="rounded border px-2 py-1 hover:bg-muted">
          Show more
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t">
        <div className="p-2">
          <Streamdown
            className={cn(
              'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
              '[&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto'
            )}
          >
            {content}
          </Streamdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MaybeCollapsibleCode({ content, language }: { content: string; language: string }) {
  const lines = countLines(content);
  const codeBlock = (
    <CodeBlock code={content} language={language}>
      <CodeBlockCopyButton aria-label="Copy code" />
    </CodeBlock>
  );

  if (lines <= CODE_COLLAPSE_LINES) {
    return codeBlock;
  }

  return (
    <Collapsible className="not-prose w-full rounded-md border">
      <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
        <span>Code block ({lines} lines)</span>
        <CollapsibleTrigger className="rounded border px-2 py-1 hover:bg-muted">
          Show more
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t p-2">
        {codeBlock}
      </CollapsibleContent>
    </Collapsible>
  );
}
