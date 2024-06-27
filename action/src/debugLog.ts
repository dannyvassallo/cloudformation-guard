import getConfig from './getConfig';

/**
 * Prints a message to the console when debug is true
 * @param {string} msg - The string to logged.
 * @returns {void}
 */
export function debugLog(msg: string): void {
  const { debug } = getConfig();
  if (debug) {
    console.debug(msg);
  }
}

export default debugLog;
