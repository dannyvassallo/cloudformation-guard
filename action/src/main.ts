import * as core from '@actions/core'
import { SummaryTableCell } from '@actions/core/lib/summary'
// import { wait } from './wait'
import { exec } from '@actions/exec'
import { context } from '@actions/github'
import { validate } from 'cfn-guard'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
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
        ({ locations: [location], ruleId }) => [
          location.physicalLocation.artifactLocation.uri,
          location.physicalLocation.region.startLine.toString(),
          ruleId
        ]
      )
      await core.summary
        .addHeading('Validation Failures')
        .addTable([
          [
            { data: 'File', header: true },
            { data: 'Line', header: true },
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
