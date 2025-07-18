"use client";
import { cn } from "@/lib/utils";
import { polkadotIcon } from "@polkadot/ui-shared/icons/polkadot";
import { Circle } from "@polkadot/ui-shared/icons/types";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";

function renderCircle(
  { cx, cy, fill, r }: Circle,
  key: number,
): React.ReactNode {
  const isBackground = key === 0;
  return (
    <circle
      cx={cx}
      cy={cy}
      fill={isBackground ? "none" : fill}
      key={key}
      r={r}
    />
  );
}

function Icon({
  value,
  isAlternative = false,
  size,
  className,
}: {
  value: string;
  isAlternative?: boolean;
  size?: number;
  className: string;
}) {
  const circles = useMemo(
    () => polkadotIcon(value, { isAlternative }),
    [value, isAlternative],
  );

  const copyToClipboard = useCallback(() => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Address copied to clipboard!"))
      .catch(() => toast.error("Failed to copy address."));
  }, [value]);

  return (
    <div
      onClick={copyToClipboard}
      className="flex items-center justify-center hover:cursor-copy"
    >
      <svg
        height={size}
        className={cn(className)}
        id={value}
        name={value}
        fill="none"
        viewBox="0 0 64 64"
        width={size}
      >
        {circles.map(renderCircle)}
      </svg>
    </div>
  );
}

export const Identicon = memo(Icon);
