
import { copy, install } from "../helpers"
import path from "path";
import { PackageManager } from "../helpers";

export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
}: {
  appName: string,
  root: string,
  packageManager: PackageManager,
  isOnline: boolean,
  template: string,
}) => {
  const templatePath = path.join(__dirname, template);
  const copySource = ["**"];

  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename(name) {
      switch (name) {
        case "gitignore":
        case "eslintrc.json": {
          return `.${name}`;
        }
        case "README-template.md": {
          return "README.md";
        }
        default: {
          return name;
        }
      }
    },
  });

  await install(packageManager, isOnline);
}