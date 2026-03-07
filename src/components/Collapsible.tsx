import type { ReactNode } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

export function CollapsibleGroup({
  children,
  defaultValue,
}: {
  children: ReactNode;
  defaultValue?: string[];
}) {
  return (
    <Accordion.Root
      multiple
      defaultValue={defaultValue}
      className="flex flex-col gap-2"
    >
      {children}
    </Accordion.Root>
  );
}

export function Collapsible({
  value,
  title,
  icon,
  badge,
  children,
}: {
  value: string;
  title: string;
  icon: ReactNode;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Accordion.Item
      value={value}
      className="border border-border rounded-lg overflow-hidden"
    >
      <Accordion.Header>
        <Accordion.Trigger className="w-full flex items-center gap-2 px-3 py-2 bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors text-xs select-none [&>svg]:transition-transform [&>svg]:duration-200 [&>svg]:data-panel-open:rotate-180">
          <ChevronDown size={13} className="text-text-muted shrink-0" />
          {icon}
          <span className="font-medium text-text">{title}</span>
          {badge && (
            <span className="ml-auto px-1.5 py-0.5 text-[0.625rem] rounded-full bg-primary/10 text-primary font-medium">
              {badge}
            </span>
          )}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="px-3 py-3 border-t border-border-muted flex flex-col gap-3">
        {children}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
