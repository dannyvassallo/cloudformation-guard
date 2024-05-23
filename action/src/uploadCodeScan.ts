import { context, getOctokit } from '@actions/github';
import { SarifReport } from 'cfn-guard';
import { compressAndEncode } from './compressAndEncode';
import getConfig from './getConfig';
enum Endpoints {
  CodeScan = 'POST /repos/{owner}/{repo}/code-scanning/sarifs'
}

export type UploadCodeScanParams = {
  result: SarifReport;
};

/**
 * Uploads the SARIF report to the GitHub Code Scanning API.
 * @param {UploadCodeScanParams} params - The parameters for the code scan upload.
 * @returns {Promise<void>} - Resolves when the code scan has been uploaded successfully.
 */
export async function uploadCodeScan({
  result
}: UploadCodeScanParams): Promise<void> {
  const { token } = getConfig();
  const ref = context.payload.ref;
  const octokit = getOctokit(token);
  const headers = { 'X-GitHub-Api-Version': '2022-11-28' };
  const stringifiedResult = JSON.stringify(result);
  // https://docs.github.com/en/rest/code-scanning/code-scanning?apiVersion=2022-11-28#upload-an-analysis-as-sarif-data
  // SARIF reports must be gzipped and base64 encoded for the code scanning API
  const sarif = await compressAndEncode(stringifiedResult);
  const params = {
    ...context.repo,
    commit_sha: context.payload.head_commit.id,
    headers,
    ref,
    sarif
  };

  await octokit.request(Endpoints.CodeScan, params);
}
