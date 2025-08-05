/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ReactNode } from "react";

interface CodeBlockProps {
  node: unknown;
  inline: boolean;
  className: string;
  children: ReactNode;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className="w-full overflow-x-auto rounded-lg bg-zinc-800 p-4 font-mono text-sm text-zinc-100 shadow-inner ring-1 ring-zinc-700"
        >
          <code className="break-words whitespace-pre-wrap">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} rounded-md bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
