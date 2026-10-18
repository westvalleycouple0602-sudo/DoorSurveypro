import { useClerk } from "@clerk/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export function SessionManagement() {
  const { openUserProfile } = useClerk();
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Account Security</CardTitle>
      <CardDescription>Manage your password, connected accounts, and active devices.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button data-testid="button-manage-security" onClick={() => openUserProfile()}>
        Manage Security &amp; Sessions
      </Button>
    </CardContent>
  </Card>;
}
