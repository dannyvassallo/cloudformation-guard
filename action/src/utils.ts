import getConfig from './getConfig';

/**
 * Handle adding the root when a user supplies a path
 *
 * @function removeRootPath
 * @param {string} path - A file path
 * @returns {string}
 */
export function addRootPath(path: string): string {
  const { path: root } = getConfig();
  if (path.startsWith('./')) {
    return `${root}${path.slice(1)}`;
  } else if (!path.startsWith(root)) {
    return `${root}/${path}`;
  }
  return path;
}

/**
 * Handle removing the root when a user supplies a path
 *
 * @function removeRootPath
 * @param {string} uri - File location URI
 * @returns {string}
 */
export function removeRootPath(uri: string): string {
  const { path } = getConfig();
  if (uri.startsWith(path)) {
    return uri.slice(path.length);
  }
  return uri;
}
