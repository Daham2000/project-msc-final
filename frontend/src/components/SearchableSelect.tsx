import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { AppIcon } from "./AppIcon";

function matches(option: string, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || option.toLowerCase().includes(needle);
}

/**
 * Shared open/filter/keyboard behaviour for the single and multi variants.
 *
 * `handleKeyDown` takes the commit callback per event rather than at hook setup,
 * so each variant can define its own commit logic in terms of this hook's state.
 */
function useCombobox(options: string[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => options.filter((option) => matches(option, query)), [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Keep the highlighted row inside the scroll viewport during keyboard nav.
  useEffect(() => {
    if (open) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, onCommit: (option: string) => void) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (visible.length) {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) => (current + step + visible.length) % visible.length);
      }
      return;
    }

    if (event.key === "Enter") {
      // Only swallow Enter when it is actually choosing an option, so a closed
      // combobox still lets the surrounding form submit.
      if (open && visible[activeIndex]) {
        event.preventDefault();
        onCommit(visible[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return {
    activeIndex,
    containerRef,
    handleKeyDown,
    listRef,
    open,
    query,
    setActiveIndex,
    setOpen,
    setQuery,
    visible,
  };
}

interface OptionRowsProps {
  activeIndex: number;
  emptyMessage: string;
  isSelected: (option: string) => boolean;
  listId: string;
  listRef: RefObject<HTMLUListElement>;
  multi?: boolean;
  onCommit: (option: string) => void;
  onHover: (index: number) => void;
  visible: string[];
}

function OptionRows({
  activeIndex,
  emptyMessage,
  isSelected,
  listId,
  listRef,
  multi,
  onCommit,
  onHover,
  visible,
}: OptionRowsProps) {
  return (
    <ul
      aria-multiselectable={multi || undefined}
      className="searchable-options"
      id={listId}
      ref={listRef}
      role="listbox"
    >
      {visible.length ? (
        visible.map((option, index) => {
          const selected = isSelected(option);
          return (
            <li
              aria-selected={selected}
              className={`searchable-option ${index === activeIndex ? "active" : ""} ${selected ? "selected" : ""}`}
              key={option}
              // mousedown, not click: the input must not blur before we commit.
              onMouseDown={(event) => {
                event.preventDefault();
                onCommit(option);
              }}
              onMouseEnter={() => onHover(index)}
              role="option"
            >
              <span>{option}</span>
              {selected ? <AppIcon name="check" /> : null}
            </li>
          );
        })
      ) : (
        <li className="searchable-empty">{emptyMessage}</li>
      )}
    </ul>
  );
}

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}

/** Single-choice combobox: type to filter, click or press Enter to choose. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyMessage = "No matches found.",
  disabled = false,
  invalid = false,
  id,
}: SearchableSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;

  const { activeIndex, containerRef, handleKeyDown, listRef, open, query, setActiveIndex, setOpen, setQuery, visible } =
    useCombobox(options);

  const commit = (option: string) => {
    onChange(option);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="searchable-select" ref={containerRef}>
      <div
        className={`searchable-control ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${
          invalid ? "invalid" : ""
        }`}
      >
        <AppIcon className="searchable-leading-icon" name="search" />
        <input
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          autoComplete="off"
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => handleKeyDown(event, commit)}
          // Showing the committed value as placeholder keeps the field usable as
          // a search box without wiping the selection while the user types.
          placeholder={value || placeholder}
          role="combobox"
          type="text"
          value={query}
        />
        {value && !query ? (
          <button
            aria-label={`Clear selected city ${value}`}
            className="searchable-clear"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            type="button"
          >
            &times;
          </button>
        ) : null}
      </div>

      {open ? (
        <OptionRows
          activeIndex={activeIndex}
          emptyMessage={emptyMessage}
          isSelected={(option) => option === value}
          listId={listId}
          listRef={listRef}
          onCommit={commit}
          onHover={setActiveIndex}
          visible={visible}
        />
      ) : null}
    </div>
  );
}

interface MultiSearchableSelectProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
}

/** Multi-choice combobox: selections render as removable chips above the input. */
export function MultiSearchableSelect({
  options,
  values,
  onChange,
  placeholder = "Search...",
  emptyMessage = "No matches found.",
  disabled = false,
  invalid = false,
}: MultiSearchableSelectProps) {
  const inputId = useId();
  const listId = `${inputId}-listbox`;

  const { activeIndex, containerRef, handleKeyDown, listRef, open, query, setActiveIndex, setOpen, setQuery, visible } =
    useCombobox(options);

  const toggle = (option: string) => {
    onChange(values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  // Choosing from the list resets the search so the next city can be typed
  // straight away. Removing a chip leaves the search box alone.
  const commitFromList = (option: string) => {
    toggle(option);
    setQuery("");
  };

  return (
    <div className="searchable-select" ref={containerRef}>
      {values.length ? (
        <div className="searchable-chips">
          {values.map((item) => (
            <span className="searchable-chip" key={item}>
              {item}
              <button aria-label={`Remove ${item}`} disabled={disabled} onClick={() => toggle(item)} type="button">
                &times;
              </button>
            </span>
          ))}
          <button className="searchable-chip-clear" disabled={disabled} onClick={() => onChange([])} type="button">
            Clear all
          </button>
        </div>
      ) : null}

      <div
        className={`searchable-control ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${
          invalid ? "invalid" : ""
        }`}
      >
        <AppIcon className="searchable-leading-icon" name="search" />
        <input
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          autoComplete="off"
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => handleKeyDown(event, commitFromList)}
          placeholder={placeholder}
          role="combobox"
          type="text"
          value={query}
        />
      </div>

      {open ? (
        <OptionRows
          activeIndex={activeIndex}
          emptyMessage={emptyMessage}
          isSelected={(option) => values.includes(option)}
          listId={listId}
          listRef={listRef}
          multi
          onCommit={commitFromList}
          onHover={setActiveIndex}
          visible={visible}
        />
      ) : null}
    </div>
  );
}
