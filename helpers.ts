import validateProjectName from 'validate-npm-package-name'
import { lstatSync, readdirSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { green, blue, yellow } from 'picocolors'
import { W_OK } from 'node:constants'
import { copyFile, mkdir, access } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { lookup } from 'node:dns/promises'
import { async as glob } from 'fast-glob'
import url from 'node:url'
import spawn from 'cross-spawn'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export function getPkgManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || ''

  if (userAgent.startsWith('yarn')) {
    return 'yarn'
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm'
  }

  if (userAgent.startsWith('bun')) {
    return 'bun'
  }

  return 'npm'
}

type ValidateNpmNameResult =
  | {
      valid: true
    }
  | {
      valid: false
      problems: string[]
    }

export function validateNpmName(name: string): ValidateNpmNameResult {
  const nameValidation = validateProjectName(name)
  if (nameValidation.validForNewPackages) {
    return { valid: true }
  }

  return {
    valid: false,
    problems: [
      ...(nameValidation.errors || []),
      ...(nameValidation.warnings || []),
    ],
  }
}

export function isFolderEmpty(root: string, name: string): boolean {
  const validFiles = [
    '.DS_Store',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'LICENSE',
    'Thumbs.db',
    'docs',
    'mkdocs.yml',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    'yarnrc.yml',
    '.yarn',
  ]

  const conflicts = readdirSync(root).filter(
    (file) =>
      !validFiles.includes(file) &&
      // Support IntelliJ IDEA-based editors
      !/\.iml$/.test(file)
  )

  if (conflicts.length > 0) {
    console.log(
      `The directory ${green(name)} contains files that could conflict:`
    )
    console.log()
    for (const file of conflicts) {
      try {
        const stats = lstatSync(join(root, file))
        if (stats.isDirectory()) {
          console.log(`  ${blue(file)}/`)
        } else {
          console.log(`  ${file}`)
        }
      } catch {
        console.log(`  ${file}`)
      }
    }
    console.log('-----------------------------------------------------------------')
    console.log(
      'Either try using a new directory name, or remove the files listed above.'
    )
    console.log('-----------------------------------------------------------------')
    return false
  }

  return true
}

export async function isWriteable(directory: string): Promise<boolean> {
  try {
    await access(directory, W_OK)
    return true
  } catch (err) {
    return false
  }
}

function getProxy(): string | undefined {
  if (process.env.https_proxy) {
    return process.env.https_proxy
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim()
    return httpsProxy !== 'null' ? httpsProxy : undefined
  } catch (e) {
    return
  }
}

export async function getOnline(): Promise<boolean> {
  try {
    await lookup('registry.yarnpkg.com')
    return true
  } catch {
    const proxy = getProxy()
    if (!proxy) {
      return false
    }

    const { hostname } = url.parse(proxy)
    if (!hostname) {
      // Invalid proxy URL
      return false
    }

    try {
      await lookup(hostname)
      return true
    } catch {
      return false
    }
  }
}

interface CopyOption {
  cwd?: string
  rename?: (basename: string) => string
  parents?: boolean
}

const identity = (x: string) => x

export const copy = async (
  src: string | string[],
  dest: string,
  { cwd, rename = identity, parents = true }: CopyOption = {}
) => {
  const source = typeof src === 'string' ? [src] : src

  if (source.length === 0 || !dest) {
    throw new TypeError('`src` and `dest` are required')
  }

  const sourceFiles = await glob(source, {
    cwd,
    dot: true,
    absolute: false,
    stats: false,
  })

  const destRelativeToCwd = cwd ? resolve(cwd, dest) : dest

  return Promise.all(
    sourceFiles.map(async (p) => {
      const dirName = dirname(p)
      const baseName = rename(basename(p))

      const from = cwd ? resolve(cwd, p) : p
      const to = parents
        ? join(destRelativeToCwd, dirName, baseName)
        : join(destRelativeToCwd, baseName)

      // Ensure the destination directory exists
      await mkdir(dirname(to), { recursive: true })

      return copyFile(from, to)
    })
  )
}

/**
 * Spawn a package manager installation based on user preference.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export async function install(
  packageManager: PackageManager,
  isOnline: boolean
): Promise<void> {
  const args: string[] = ['install']
  if (!isOnline) {
    console.log(
      yellow('You appear to be offline.\nFalling back to the local cache.')
    )
    return;
  }
  /**
   * Return a Promise that resolves once the installation is finished.
   */
  return new Promise((resolve, reject) => {
    const child = spawn(packageManager, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ADBLOCK: '1',
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${packageManager} ${args.join(' ')}` })
        return
      }
      resolve()
    })
  })
}