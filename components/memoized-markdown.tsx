/* eslint-disable @typescript-eslint/no-unused-vars */
import { CodeBlock } from "@/components/code-block";
import { marked } from "marked";
import Link from "next/link";
import { memo, ReactNode, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const SafeParagraph = (({
  children,
  ...props
}: {
  children?: ReactNode;
  [key: string]: unknown;
}) => {
  const hasBlockElement = (children: ReactNode): boolean => {
    if (!children) return false;
    const childArray = Array.isArray(children) ? children : [children];

    return childArray.some((child: unknown) => {
      if (!child || typeof child !== "object") return false;

      const reactChild = child as { type?: string | { name?: string } };

      if (reactChild.type) {
        const typeName =
          typeof reactChild.type === "string"
            ? reactChild.type
            : (reactChild.type.name ?? "");
        const blockElements = [
          "div",
          "pre",
          "table",
          "ul",
          "ol",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "blockquote",
          "form",
          "CodeBlock",
        ];
        return blockElements.some((el) =>
          typeName.toLowerCase().includes(el.toLowerCase()),
        );
      }
      return false;
    });
  };
  if (hasBlockElement(children)) {
    return <>{children}</>;
  }
  return <p {...props}>{children}</p>;
}) as Components["p"];

const components: Partial<Components> = {
  code: CodeBlock as Components["code"],
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <ol className="ml-4 list-outside list-decimal" {...restProps}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <li className="py-1" {...restProps}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <ul className="ml-4 list-outside list-disc" {...restProps}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <span className="font-semibold" {...restProps}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error - react-markdown a props href type compatibility with Next.js Link
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h1 className="mt-6 mb-2 text-3xl font-semibold" {...restProps}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h2 className="mt-6 mb-2 text-2xl font-semibold" {...restProps}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h3 className="mt-6 mb-2 text-xl font-semibold" {...restProps}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h4 className="mt-6 mb-2 text-lg font-semibold" {...restProps}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h5 className="mt-6 mb-2 text-base font-semibold" {...restProps}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    const { ref: _ref, ...restProps } = props as {
      ref?: unknown;
      [key: string]: unknown;
    };
    return (
      <h6 className="mt-6 mb-2 text-sm font-semibold" {...restProps}>
        {children}
      </h6>
    );
  },
  p: SafeParagraph,
};

const remarkPlugins = [remarkGfm];

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock
        content={block}
        key={`${id}-block_${index.toString()}`}
      />
    ));
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
