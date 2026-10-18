import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { User } from "lucide-react";

interface MentionUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  displayName: string;
}

interface MentionAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onSelect: (user: MentionUser, startPos: number, endPos: number) => void;
}

export function MentionAutocomplete({ textareaRef, onSelect }: MentionAutocompleteProps) {
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const commandRef = useRef<HTMLDivElement>(null);

  // Fetch team members based on search query
  const { data } = useQuery<{ users: MentionUser[] }>({
    queryKey: ["/api/team/members/search", { q: searchQuery }],
    enabled: show,
  });

  const users = data?.users || [];

  // Detect @ character and calculate position
  const handleTextChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      setShow(false);
      return;
    }

    // Check if there's a space between @ and cursor (which would close the mention)
    const textSinceAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (/\s/.test(textSinceAt)) {
      setShow(false);
      return;
    }

    // Extract search query (text after @)
    const query = textSinceAt;

    // Calculate dropdown position
    const textareaRect = textarea.getBoundingClientRect();
    
    // Create a temporary span to measure text width
    const measureSpan = document.createElement("span");
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.style.whiteSpace = "pre";
    measureSpan.style.font = window.getComputedStyle(textarea).font;
    measureSpan.textContent = textBeforeCursor.split("\n").pop() || "";
    document.body.appendChild(measureSpan);
    
    const textWidth = measureSpan.offsetWidth;
    document.body.removeChild(measureSpan);

    setPosition({
      top: textareaRect.bottom + 4,
      left: textareaRect.left + Math.min(textWidth, textareaRect.width - 200),
    });

    setShow(true);
    setSearchQuery(query);
    setMentionStartPos(lastAtIndex);
    setSelectedIndex(0);
  }, [textareaRef]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!show || users.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
        break;
      case "Enter":
      case "Tab":
        if (users[selectedIndex]) {
          e.preventDefault();
          handleSelect(users[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShow(false);
        break;
    }
  }, [show, users, selectedIndex]);

  // Handle user selection
  const handleSelect = (user: MentionUser) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStartPos === -1) return;

    const cursorPos = textarea.selectionStart;
    onSelect(user, mentionStartPos, cursorPos);
    
    setShow(false);
    setSearchQuery("");
    setMentionStartPos(-1);
  };

  // Listen for text changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener("input", handleTextChange);
    textarea.addEventListener("click", handleTextChange);
    textarea.addEventListener("keyup", handleTextChange);

    return () => {
      textarea.removeEventListener("input", handleTextChange);
      textarea.removeEventListener("click", handleTextChange);
      textarea.removeEventListener("keyup", handleTextChange);
    };
  }, [textareaRef, handleTextChange]);

  // Listen for keyboard events
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener("keydown", handleKeyDown);
    return () => {
      textarea.removeEventListener("keydown", handleKeyDown);
    };
  }, [textareaRef, handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const commandList = commandRef.current?.querySelector('[cmdk-list]');
    const selectedItem = commandList?.children[selectedIndex] as HTMLElement;
    
    if (selectedItem && commandList) {
      const listRect = commandList.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();
      
      if (itemRect.bottom > listRect.bottom) {
        selectedItem.scrollIntoView({ block: "end", behavior: "smooth" });
      } else if (itemRect.top < listRect.top) {
        selectedItem.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!show) return null;

  return (
    <div
      className="fixed z-50 w-64"
      style={{ top: position.top, left: position.left }}
      data-testid="mention-autocomplete"
    >
      <Command ref={commandRef} className="rounded-lg border shadow-lg bg-popover">
        <CommandList>
          {users.length === 0 ? (
            <CommandEmpty>No team members found.</CommandEmpty>
          ) : (
            <CommandGroup heading="Team Members">
              {users.map((user, index) => {
                const initials = user.firstName && user.lastName
                  ? `${user.firstName[0]}${user.lastName[0]}`
                  : user.email?.[0]?.toUpperCase() || "?";

                return (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user)}
                    className={index === selectedIndex ? "bg-accent" : ""}
                    data-testid={`mention-user-${user.id}`}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.displayName}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
