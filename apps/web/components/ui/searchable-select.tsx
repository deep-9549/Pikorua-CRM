"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: React.ReactNode
  searchText?: string
  disabled?: boolean
}

type SearchableSelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allowCustomValue?: boolean
  customOptionLabel?: (value: string) => React.ReactNode
  className?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  align?: "start" | "center" | "end"
}

export function SearchableSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyMessage = "No option found.",
  allowCustomValue = false,
  customOptionLabel,
  className,
  triggerClassName,
  contentClassName,
  disabled,
  align = "start",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const selectedValue = value ?? internalValue
  const selectedOption = options.find(option => option.value === selectedValue)
  const customValue = searchValue.trim()
  const hasExactOption = options.some(option => {
    const haystack = [option.value, option.searchText]
      .filter(Boolean)
      .map(text => String(text).toLowerCase())
    return haystack.includes(customValue.toLowerCase())
  })
  const showCustomOption = allowCustomValue && customValue.length > 0 && !hasExactOption

  function handleSelect(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
    setSearchValue("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between px-3 font-normal", triggerClassName, className)}
        >
          <span className={cn("truncate", !selectedOption && !selectedValue && "text-muted-foreground")}>
            {selectedOption?.label ?? (selectedValue || placeholder)}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)} align={align}>
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={`${option.searchText ?? ""} ${option.value}`.trim()}
                  keywords={[option.value]}
                  disabled={option.disabled}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  key={`custom-${customValue}`}
                  value={customValue}
                  onSelect={() => handleSelect(customValue)}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="truncate">
                    {customOptionLabel?.(customValue) ?? `Use "${customValue}"`}
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
