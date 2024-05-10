import * as core from '@actions/core'
import { SummaryTableCell } from '@actions/core/lib/summary'
// import { wait } from './wait'
import { exec } from '@actions/exec'
import { context, getOctokit } from '@actions/github'
import { validate } from 'cfn-guard'

const compress = async (string: string): Promise<string> => {
  const blobToBase64 = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  };
  const byteArray = new TextEncoder().encode(string);
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  const response = new Response(cs.readable).blob();
  const base64 = await blobToBase64(await response);

  return base64;
};

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('token')
  const octokit = getOctokit(token)
  const ref = context.payload.ref
  const repository = context.payload.repository?.full_name
  const { pull_request } = context.payload

  try {
    await exec('git init')
    await exec(`git remote add origin https://github.com/${repository}.git`)
    await exec('git config --global user.name cfn-guard')
    await exec('git config --global user.email no-reply@amazon.com')
    if (context.eventName === 'pull_request') {
      const prRef = `refs/pull/${context.payload.pull_request?.number}/merge`
      await exec(`git fetch origin ${prRef}`)
      await exec(`git checkout -qf FETCH_HEAD`)
    } else {
      await exec(`git fetch origin ${ref}`)
      await exec(`git checkout FETCH_HEAD`)
    }
  } catch (error) {
    core.setFailed(`Failed to checkout changes: ${error}`)
  }

  try {
    const rulesPath: string = core.getInput('rules')
    const dataPath: string = core.getInput('data')

    const result = await validate({
      rulesPath,
      dataPath
    })

    const {
      runs: [run]
    } = result

    await octokit.request('POST /repos/{owner}/{repo}/code-scanning/sarifs', {
      ...context.repo,
      commit_sha: context.payload.head_commit,
      ref,
      sarif: await compress(JSON.stringify(result)),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (run.results.length) {
      core.setFailed('Validation failure. CFN Guard found violations.')

      let mappedResults: string[][]

      if (pull_request) {
        const tmpComments = run.results.map(result => ({
          body: result.message.text,
          path: result.locations[0].physicalLocation.artifactLocation.uri,
          position: result.locations[0].physicalLocation.region.startLine
        }))

        const listFiles = await octokit.rest.pulls.listFiles({
          ...context.repo,
          pull_number: pull_request.number,
          per_page: 3000
        })

        const filesChanged = listFiles.data.map(({ filename }) => filename)

        const filesWithViolations = tmpComments.map(({ path }) => path)

        const filesWithViolationsInPr = filesChanged.filter(value =>
          filesWithViolations.includes(value)
        )

        const comments = tmpComments.filter(comment =>
          filesWithViolationsInPr.includes(comment.path)
        )

        await octokit.rest.pulls.createReview({
          ...context.repo,
          pull_number: pull_request.number,
          comments,
          event: 'COMMENT',
          commit_id: context.payload.head_commit
        })

        mappedResults = run.results
          .map(({ locations: [location], ruleId, message: { text } }) =>
            filesWithViolationsInPr.includes(
              location.physicalLocation.artifactLocation.uri
            )
              ? [
                  `❌ ${location.physicalLocation.artifactLocation.uri}:L${location.physicalLocation.region.startLine},C${location.physicalLocation.region.startColumn}`,
                  text,
                  ruleId
                ]
              : []
          )
          .filter(result => result.some(Boolean))
      } else {
        mappedResults = run.results.map(
          ({ locations: [location], ruleId, message: { text } }) => [
            `❌ ${location.physicalLocation.artifactLocation.uri}:L${location.physicalLocation.region.startLine},C${location.physicalLocation.region.startColumn}`,
            text,
            ruleId
          ]
        )
      }

      await core.summary
        .addHeading('Validation Failures')
        .addTable([
          [
            { data: 'File', header: true },
            { data: 'Reason', header: true },
            { data: 'Rule', header: true }
          ],
          ...mappedResults
        ])
        .write()
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
