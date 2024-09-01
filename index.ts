#!/usr/bin/env node

import { init } from './createNextFlaskApp';

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

init();