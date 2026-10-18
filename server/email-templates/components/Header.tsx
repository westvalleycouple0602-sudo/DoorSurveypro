import React from "react";
import { Section, Img, Heading } from "@react-email/components";

export function EmailHeader() {
  return (
    <Section style={header}>
      <Heading style={title}>DoorSurvey Pro</Heading>
    </Section>
  );
}

const header = {
  backgroundColor: "#2563eb",
  padding: "24px",
  textAlign: "center" as const,
};

const title = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};
