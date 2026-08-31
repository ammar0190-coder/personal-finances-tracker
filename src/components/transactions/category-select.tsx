"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/data/categories";

/**
 * PRD §4: a transaction's category can be either a top-level category
 * (a blended entry, e.g. "Food ₹340") or one of its subcategories (full
 * detail, e.g. "Swiggy/Zomato ₹180") — both are equally valid, the app never
 * forces a choice. One flat, grouped list lets either be picked directly.
 */
export function CategorySelect({
  categories,
  kind,
  value,
  onChange,
}: {
  categories: Category[];
  kind: "expense" | "income";
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const relevant = categories.filter((c) => c.kind === kind);
  const parents = relevant.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of relevant) {
    if (!c.parent_id) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c);
    childrenByParent.set(c.parent_id, list);
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        {parents.map((parent) => {
          const children = childrenByParent.get(parent.id) ?? [];
          return (
            <SelectGroup key={parent.id}>
              <SelectLabel>{parent.name}</SelectLabel>
              <SelectItem value={parent.id}>{parent.name} (blended)</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
