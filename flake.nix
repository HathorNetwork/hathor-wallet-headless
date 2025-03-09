{
  description = "virtual environments";

  inputs = {
    devshell.url = "github:numtide/devshell";
    flake-utils.url = "github:numtide/flake-utils";
    unstableNixPkgs.url = "nixpkgs/nixos-unstable";
  };

  outputs = { self, flake-utils, devshell, nixpkgs, unstableNixPkgs, ... }@inputs:
    let
      overlays.default = final: prev: 
        let
          packages = self.packages.${final.system};
          inherit (packages) node-packages;
        in
        {
          nodejs = final.nodejs-18_x;
          nodePackages = prev.nodePackages;
          yarn = (import unstableNixPkgs { system = final.system; }).yarn-berry;
        };
    in
    flake-utils.lib.eachDefaultSystem (system: {
      devShell =
        let pkgs = import nixpkgs {
          inherit system;

          overlays = [
            devshell.overlays.default
            overlays.default
          ];
        };
        in
        pkgs.devshell.mkShell {
          packages = with pkgs; [
            nixpkgs-fmt
            nodejs-18_x
            yarn
          ];
        };
    });
}
