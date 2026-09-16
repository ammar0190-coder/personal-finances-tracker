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
import { categoryOptions } from "@/lib/select-options";

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
  id,
}: {
  categories: Category[];
  kind: "expense" | "income";
  value: string;
  onChange: (categoryId: string) => void;
  /** Associates the caller's <Label htmlFor> with the trigger, giving it an accessible name. */
  id?: string;
}) {
  const groups = categoryOptions(categories, kind);

  return (
    <Select items={groups} value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.key}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
