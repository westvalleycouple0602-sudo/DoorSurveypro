{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.nodePackages.ts-node
    pkgs.postgresql
    pkgs.git
  ];
}