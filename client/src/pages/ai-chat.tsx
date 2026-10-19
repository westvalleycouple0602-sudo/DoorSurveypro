import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Paywall } from "@/components/paywall";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChat() {
  const { toast } = useToast();
  const { hasFeatureAccess, currentTier } = useFeatureAccess();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      // Handle streaming response with buffering for partial frames
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantContent = "";
      let buffer = ""; // Buffer for partial SSE frames

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Split by newlines to get complete lines
        const lines = buffer.split("\n");
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Handle explicit error frames from server
              if (parsed.error) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: parsed.error,
                });
                // Remove the placeholder assistant message
                setMessages((prev) => prev.slice(0, -1));
                setIsStreaming(false);
                return;
              }
              
              if (parsed.content) {
                assistantContent += parsed.content;
                
                // Update the assistant message with new content
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return newMessages;
                });
              }
            } catch (e: any) {
              // Ignore parse errors for partial chunks (SyntaxError)
              // Only explicit {error: "..."} frames are handled above
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message",
      });

      // Remove the placeholder assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if user has access to AI Assistant (aiAudits feature, Enterprise-only)
  const hasAccess = hasFeatureAccess("aiAudits");

  if (!hasAccess) {
    return (
      <Paywall
        variant="fullPage"
        featureName="AI Assistant"
        featureDescription="Get instant answers about door surveys, building codes, hardware selection, and project workflows powered by advanced AI."
        requiredTier="enterprise"
        currentTier={currentTier}
        type="tier"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">AI Assistant</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Ask me about door surveys, building codes, hardware, and more
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 sm:space-y-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 shrink-0">
              <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <h2 className="text-lg sm:text-xl font-semibold">Start a conversation</h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-2">
                I can help you with door surveys, building code compliance, hardware
                selection, cost estimation, and project workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 max-w-2xl w-full mt-4 sm:mt-6">
              <Card
                className="p-3 sm:p-4 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setInput("What are the ADA requirements for door clearances?")}
                data-testid="card-suggestion-1"
              >
                <p className="text-xs sm:text-sm">What are the ADA requirements for door clearances?</p>
              </Card>
              <Card
                className="p-3 sm:p-4 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setInput("How do I select hardware for a hospital project?")}
                data-testid="card-suggestion-2"
              >
                <p className="text-xs sm:text-sm">How do I select hardware for a hospital project?</p>
              </Card>
              <Card
                className="p-3 sm:p-4 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setInput("What's the difference between tenant improvement and new construction quotes?")}
                data-testid="card-suggestion-3"
              >
                <p className="text-xs sm:text-sm">
                  What's the difference between tenant improvement and new construction
                  quotes?
                </p>
              </Card>
              <Card
                className="p-3 sm:p-4 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setInput("Help me understand BHMA finishes and grades")}
                data-testid="card-suggestion-4"
              >
                <p className="text-xs sm:text-sm">Help me understand BHMA finishes and grades</p>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 sm:gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`message-${message.role}-${index}`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-start justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 shrink-0">
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary mt-1.5 sm:mt-2" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="flex items-start justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary shrink-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground mt-1.5 sm:mt-2" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-3 sm:p-4">
        <div className="flex gap-2 min-w-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about DoorSurvey Pro..."
            disabled={isStreaming}
            data-testid="input-chat-message"
            className="flex-1 min-w-0 text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-message"
            size="sm"
            className="shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
