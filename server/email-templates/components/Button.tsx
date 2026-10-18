import React from "react";
import { Button as EmailButton } from "@react-email/components";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const style = variant === "primary" ? primaryButton : secondaryButton;
  
  return (
    <EmailButton href={href} style={style}>
      {children}
    </EmailButton>
  );
}

const baseButton = {
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: "6px",
};

const primaryButton = {
  ...baseButton,
  backgroundColor: "#2563eb",
  color: "#ffffff",
};

const secondaryButton = {
  ...baseButton,
  backgroundColor: "#ffffff",
  color: "#2563eb",
  border: "1px solid #2563eb",
};
