/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core';
import { run } from './main';

core.info('Running...');
// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
