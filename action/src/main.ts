import * as core from '@actions/core'
import { context } from '@actions/github'
import { checkoutRepository } from './checkoutRepository'
import { uploadCodeScan } from './uploadCodeScan'
import { handleValidate } from './handleValidate'
import { handlePullRequestRun } from './handlePullRequestRun'
import { handlePushRun } from './handlePushRun'
import { handleWriteActionSummary } from './handleWriteActionSummary'
import getConfig from './getConfig'

enum RunStrings {
  ValidationFailed = 'Validation failure. CFN Guard found violations.',
  Error = 'Action failed with error'
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const { analyze, checkout } = getConfig()

  const { pull_request } = context.payload

  checkout && (await checkoutRepository())

  try {
    const result = await handleValidate()

    const {
      runs: [run]
    } = result

    // If there are any results, that's a failure.
    const hasViolations = run.results.length

    if (hasViolations) {
      core.setFailed(RunStrings.ValidationFailed)

      // Only upload SARIF report if analyze is set
      analyze && (await uploadCodeScan({ result }))

      if (!analyze) {
        let mappedResults: string[][]

        if (pull_request) {
          mappedResults = await handlePullRequestRun({ run })
        } else {
          mappedResults = await handlePushRun({ run })
        }

        await handleWriteActionSummary({ results: mappedResults })
      }
    }
  } catch (error) {
    core.setFailed(`${RunStrings.Error}: ${error}`)
  }
}
