import * as core from '@actions/core'
import { SummaryTableCell } from '@actions/core/lib/summary'
// import { wait } from './wait'
import { exec } from '@actions/exec'
import { context, getOctokit } from '@actions/github'
import { validate } from 'cfn-guard'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('token')
  const octokit = getOctokit(token)

  const { pull_request } = context.payload

  try {
    const ref = context.payload.ref
    const repository = context.payload.repository?.full_name
    await exec('git init')
    await exec(`git remote add origin https://github.com/${repository}.git`)
    if (context.eventName === 'pull_request') {
      const prRef = `refs/pull/${context.payload.pull_request?.number}/merge`
      await exec(`git fetch origin ${prRef}`)
      await exec(`git checkout -qf FETCH_HEAD`)
      await exec(`ls`)
    } else {
      await exec(`git fetch origin ${ref}`)
      await exec(`git checkout FETCH_HEAD`)
      await exec(`ls`)
    }
  } catch (error) {
    core.setFailed(`Failed to checkout changes: ${error}`)
  }

  try {
    const rulesPath: string = core.getInput('rules')
    const dataPath: string = core.getInput('data')

    const {
      runs: [run]
    } = await validate({
      rulesPath,
      dataPath
    })

    if (run.results.length) {
      core.setFailed('Validation failure. CFN Guard found violations.')
      const mappedResults: string[][] = run.results.map(
        ({ locations: [location], ruleId, message: { text } }) => [
          `❌ ${location.physicalLocation.artifactLocation.uri}:L${location.physicalLocation.region.startLine},C${location.physicalLocation.region.startColumn}`,
          text,
          ruleId
        ]
      )
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

      if (pull_request) {
        const comments = run.results.map(result => ({
          body: result.message.text,
          path: result.locations[0].physicalLocation.artifactLocation.uri,
          position: result.locations[0].physicalLocation.region.startLine
        }))

        const filesChanged = octokit.rest.pulls.listFiles({
          ...context.repo,
          pull_number: pull_request.number
        })

        console.warn({
          filesChanged,
          filesWithViolations: comments.map(({ path }) => path)
        })

        await octokit.rest.pulls.createReview({
          ...context.repo,
          pull_number: pull_request.number,
          comments,
          event: 'REQUEST_CHANGES',
          commit_id: context.payload.head_commit
        })
      }
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
