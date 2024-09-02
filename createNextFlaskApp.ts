import { mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { green } from 'picocolors'
import { PackageManager, isWriteable, isFolderEmpty, getOnline } from './helpers'
import { installTemplate } from './templates'

export async function create_app ({
  appPath,
  packageManager,
}: {
  appPath: string
  packageManager: PackageManager
}) {
  const root = resolve(appPath)

  if (!(await isWriteable(dirname(root)))) {
    console.error(
      'The application path is not writable, please check folder permissions and try again.'
    )
    console.error(
      'It is likely you do not have write permissions for this folder.'
    )
    process.exit(1)
  }

  const appName = basename(root)
  mkdirSync(root, { recursive: true })
  if (!isFolderEmpty(root, appName)) {
    process.exit(1)
  }

  const useYarn = packageManager === 'yarn'
  const isOnline = !useYarn || (await getOnline())
  const originalDirectory = process.cwd()

  console.log(`Creating a new Next.js app in ${green(root)}.`)
  console.log()

  process.chdir(root)

  await installTemplate({
    appName,
    root,
    packageManager,
    isOnline,
    template: "default",
  })

  let cdpath: string
  if (join(originalDirectory, appName) === appPath) {
    cdpath = appName
  } else {
    cdpath = appPath
  }

  console.log(`${green('Success!')} Created ${appName} at ${appPath}`)

}

