"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Check, X, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

type FieldType = "text" | "textarea" | "number" | "price";

interface InlineEditableProps {
  value: string | number | null | undefined;
  fieldName: string;
  fieldType?: FieldType;
  productId: string;
  onSave: (productId: string, field: string, value: string) => Promise<void>;
  isAdmin: boolean;
  className?: string;
  children: ReactNode;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
}

export function InlineEditable({
  value,
  fieldName,
  fieldType = "text",
  productId,
  onSave,
  isAdmin,
  className,
  children,
  placeholder = "Click to edit...",
  suffix,
  prefix,
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const displayValue = value?.toString() ?? "";

  // Format value for editing based on type
  const getEditValue = useCallback(() => {
    if (fieldType === "price") {
      // Convert cents to dollars for editing
      const cents = parseInt(displayValue) || 0;
      return (cents / 100).toFixed(2);
    }
    return displayValue;
  }, [displayValue, fieldType]);

  const startEditing = useCallback(() => {
    if (!isAdmin || isSaving) return;
    setEditValue(getEditValue());
    setIsEditing(true);
  }, [isAdmin, isSaving, getEditValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  const saveValue = useCallback(async () => {
    let saveVal = editValue.trim();

    // Convert price back to cents
    if (fieldType === "price") {
      const dollars = parseFloat(saveVal);
      if (isNaN(dollars) || dollars < 0) {
        toast.error("Please enter a valid price");
        return;
      }
      saveVal = Math.round(dollars * 100).toString();
    }

    // Number validation
    if (fieldType === "number") {
      const num = parseFloat(saveVal);
      if (saveVal !== "" && isNaN(num)) {
        toast.error("Please enter a valid number");
        return;
      }
    }

    // Skip if unchanged
    if (saveVal === displayValue) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(productId, fieldName, saveVal);
      toast.success(
        `Updated ${fieldName.replace(/([A-Z])/g, " $1").toLowerCase()}`,
      );
      setIsEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    editValue,
    fieldType,
    displayValue,
    cancelEditing,
    onSave,
    productId,
    fieldName,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && fieldType !== "textarea") {
        e.preventDefault();
        saveValue();
      }
      if (e.key === "Enter" && fieldType === "textarea" && e.metaKey) {
        e.preventDefault();
        saveValue();
      }
      if (e.key === "Escape") {
        cancelEditing();
      }
    },
    [fieldType, saveValue, cancelEditing],
  );

  if (!isAdmin) {
    return <>{children}</>;
  }

  if (isEditing) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        {prefix && (
          <span className='text-muted-foreground shrink-0'>{prefix}</span>
        )}
        {fieldType === "textarea" ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                if (isEditing && !isSaving) saveValue();
              }, 200);
            }}
            rows={3}
            className='min-w-[200px] rounded-md border border-primary/50 bg-background px-2 py-1 text-sm ring-2 ring-primary/20 focus:outline-none focus:ring-primary/40 resize-y'
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={
              fieldType === "price" || fieldType === "number"
                ? "number"
                : "text"
            }
            step={
              fieldType === "price"
                ? "0.01"
                : fieldType === "number"
                  ? "any"
                  : undefined
            }
            min={fieldType === "price" ? "0" : undefined}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                if (isEditing && !isSaving) saveValue();
              }, 200);
            }}
            className='min-w-[120px] rounded-md border border-primary/50 bg-background px-2 py-0.5 text-[inherit] font-[inherit] ring-2 ring-primary/20 focus:outline-none focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            placeholder={placeholder}
          />
        )}
        {suffix && (
          <span className='text-muted-foreground shrink-0'>{suffix}</span>
        )}
        <span className='inline-flex items-center gap-0.5 shrink-0'>
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  saveValue();
                }}
                className='p-1 rounded hover:bg-green-100 text-green-600 transition-colors'
                title='Save (Enter)'
              >
                <Check className='h-4 w-4' />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  cancelEditing();
                }}
                className='p-1 rounded hover:bg-red-100 text-red-600 transition-colors'
                title='Cancel (Escape)'
              >
                <X className='h-4 w-4' />
              </button>
            </>
          )}
        </span>
      </span>
    );
  }

  return (
    <span
      onDoubleClick={startEditing}
      className={cn(
        "group/editable cursor-pointer inline",
        "border-b-2 border-transparent hover:border-primary/30 transition-colors duration-150",
        className,
      )}
      title='Double-click to edit'
    >
      {children}
      <Pencil className='inline-block ml-1 h-3 w-3 text-primary/50 opacity-0 group-hover/editable:opacity-100 transition-opacity pointer-events-none align-[2px]' />
    </span>
  );
}
