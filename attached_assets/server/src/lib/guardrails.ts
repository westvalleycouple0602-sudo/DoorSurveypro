export function isDangerousSQL(sql: string): boolean {
  const lowered = sql.toLowerCase();
  return /(drop|alter|truncate|delete\s+from|insert\s+into|update\s+\w+)/.test(lowered);
}
