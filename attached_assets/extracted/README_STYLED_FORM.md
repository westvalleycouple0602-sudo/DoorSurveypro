# Styled Door Opening Form (Tailwind + shadcn/ui + zod)

**Files**
- `StyledFormDoorOpening.tsx` — Styled form component using shadcn/ui components and Tailwind.
- `validation.ts` — Zod schema mirroring your OpeningRecord shape.
- `ruleTooltips.ts` — Short, code-tied tooltips with Rule IDs (from your compliance engine).

## Install deps
```bash
npm i react-hook-form zod @hookform/resolvers
# shadcn/ui (if not already in your app)
# https://ui.shadcn.com - ensure Button, Input, Label, Select, Switch, Card, Tooltip are generated under @/components/ui
```

## Use
```tsx
import StyledFormDoorOpening from "./StyledFormDoorOpening";

<StyledFormDoorOpening onSubmit={(record)=>{
  // persist record and/or run compliance engine
}}/>
```

### Notes
- Tooltips show the *why* for each field (e.g., 34–48 in AFF) and include rule IDs so findings map 1:1 to UI.
- Tailwind classes assume your app is configured with Tailwind.