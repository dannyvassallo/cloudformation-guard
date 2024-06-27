import * as core from '@actions/core';

export type Config = {
  rulesPath: string;
  dataPath: string;
  debug: boolean;
  token: string;
  analyze: boolean;
  checkout: boolean;
  createReview: boolean;
};

/**
 * Returns the config values in JSON format
 * @returns {Config}
 */
export function getConfig(): Config {
  return {
    analyze: core.getBooleanInput('analyze'),
    checkout: core.getBooleanInput('checkout'),
    createReview: core.getBooleanInput('create-review'),
    dataPath: core.getInput('data'),
    debug: core.getBooleanInput('debug'),
    rulesPath: core.getInput('rules'),
    token: core.getInput('token')
  };
}

export default getConfig;
