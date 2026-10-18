import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, UserCog } from "lucide-react";

export function UserMenu() {
  const { user, logout, switchUser } = useAuth();

  if (!user) {
    return null;
  }

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.email || "User";

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.email?.[0]?.toUpperCase() || "U";

  const handleSignOut = () => {
    logout();
  };

  const handleSwitchUser = () => {
    // Clear session and redirect to login page for account switching
    switchUser();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="Open user menu"
          data-testid="button-user-menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="text-menu-user-name">
              {displayName}
            </p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground" data-testid="text-menu-user-email">
                {user.email}
              </p>
            )}
            {user.organization && (
              <p className="text-xs leading-none text-muted-foreground mt-1" data-testid="text-menu-user-org">
                {user.organization.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSwitchUser}
          data-testid="button-switch-user"
        >
          <UserCog className="mr-2 h-4 w-4" />
          <span>Switch User</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSignOut}
          data-testid="button-sign-out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
