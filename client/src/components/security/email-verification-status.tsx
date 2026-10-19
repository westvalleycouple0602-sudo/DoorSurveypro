import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EmailVerificationStatus() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress;
  if (!email) return <p>No email address is associated with this account.</p>;
  const verified = email.verification.status === "verified";
  return <div className="space-y-3">
    <div className="flex items-center gap-2">{email.emailAddress} <Badge variant={verified ? "default" : "secondary"}>
      {verified ? "Verified" : "Pending verification"}
    </Badge></div>
    <Button variant="outline" data-testid="button-manage-email" onClick={() => openUserProfile()}>
      {verified ? "Manage Email Addresses" : "Verify Email Address"}
    </Button>
  </div>;
}
