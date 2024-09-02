#!/usr/bin/env node

import { create_app } from './createNextFlaskApp';
import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { bold, cyan, green, red, yellow } from 'picocolors';
import { PackageManager, getPkgManager, isFolderEmpty, validateNpmName } from './helpers';
import packageJson from './package.json'
import updateCheck from 'update-check'

const currentNodeVersion: string = process.versions.node;
const semver: string[] = currentNodeVersion.split('.');
const major: string = semver[0];

if (Number(major) < 18) {
  console.error(
    'You are running Node ' + 
    currentNodeVersion + '.\n' + 
    'Create Next App requires Node 18 or higher. \n' + 
    'Please update your version of Node.'
  );
  process.exit(1);
}
let projectPath: string = '';
const program = new Command(packageJson.name)
  .version(
    packageJson.version,
    '-v, --version',
    'Output the current version of create-next-app.'
  )
  .arguments('[directory]')
  .usage('[directory] [options]')
  .helpOption('-h, --help', 'Display this help message.')
  .option(
    '--use-npm',
    'Explicitly tell the CLI to bootstrap the application using npm.'
  )
  .option(
    '--use-pnpm',
    'Explicitly tell the CLI to bootstrap the application using pnpm.'
  )
  .option(
    '--use-yarn',
    'Explicitly tell the CLI to bootstrap the application using Yarn.'
  )
  .option(
    '--use-bun',
    'Explicitly tell the CLI to bootstrap the application using Bun.'
  )
  .action((name: string) => {
    if (name && !name.startsWith('--no-')) {
      projectPath = name
    }
  })
  .parse(process.argv);

const opts = program.opts()
const { args } = program

const packageManager: PackageManager = !!opts.useNpm
  ? 'npm'
  : !!opts.usePnpm
    ? 'pnpm'
    : !!opts.useYarn
      ? 'yarn'
      : !!opts.useBun
        ? 'bun'
        : getPkgManager()
;

async function run(): Promise<void> {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim()
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${cyan(opts.name())} ${green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${cyan(opts.name())} ${green('my-next-app')}\n\n` +
        `Run ${cyan(`${opts.name()} --help`)} to see all options.`
    )
    process.exit(1)
  }

  const appPath = resolve(projectPath)
  const appName = basename(appPath)

  // if (!appName) {
  //   console.error('Invalid project name')
  //   process.exit(1)
  // }

  const validation = validateNpmName(appName)
  if (!validation.valid) {
    console.error(
      `Could not create a project called ${red(
        `"${appName}"`
      )} because of npm naming restrictions:`
    )

    validation.problems.forEach((p) =>
      console.error(`    ${red(bold('*'))} ${p}`)
    )
    process.exit(1)
  }
  
  if (existsSync(appPath) && !isFolderEmpty(appPath, appName)) {
    process.exit(1)
  }

  try {
    await create_app({
      appPath,
      packageManager,
    })
  } catch (error) { 
    console.error(red(error as string))
    process.exit(1)
  }
}

const update = updateCheck(packageJson).catch(() => null)

async function notifyUpdate(): Promise<void> {
  try {
    if ((await update)?.latest) {
      const global = {
        npm: 'npm i -g',
        yarn: 'yarn global add',
        pnpm: 'pnpm add -g',
        bun: 'bun add -g',
      }
      const updateMessage = `${global[packageManager]} create-next-flask`
      console.log(
        yellow(bold('A new version of `create-next-flask` is available!')) +
          '\n' +
          'You can update by running: ' +
          cyan(updateMessage) +
          '\n'
      )
    }
    process.exit(0)
  } catch {
    // ignore error
  }
}

async function exit(reason: { command?: string }) {
  console.log()
  console.log('Aborting installation.')
  if (reason.command) {
    console.log(`  ${cyan(reason.command)} has failed.`)
  } else {
    console.log(
      red('Unexpected error. Please report it as a bug:') + '\n',
      reason
    )
  }
  console.log()
  await notifyUpdate()
  process.exit(1)
}

run().then(notifyUpdate).catch(exit)
