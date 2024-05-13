import { SarifRun } from 'cfn-guard'
import { context, getOctokit } from '@actions/github'
import getConfig from './getConfig'

enum HandlePullRequestRunStrings {
  Error = 'Tried to handle pull request result but could not find PR context.'
}

type HandlePullRequestRunParams = {
  run: SarifRun
}

/**
 * Handles formatting the reported execution of a pull request run for the CFN Guard action.
 * @param {HandlePullRequestRunParams} params - The parameters for the pull request run.
 * @param {SarifRun} params.run - The SARIF run object containing the validation results.
 * @returns {Promise<string[][]>} - An array of arrays, where each inner array represents a violation with the following format: [file path, violation message, rule ID].
 * @throws {Error} - Throws an error if the pull request context cannot be found.
 */
export const handlePullRequestRun = async ({
  run
}: HandlePullRequestRunParams): Promise<string[][]> => {
  const { token, createReview } = getConfig()
  const octokit = getOctokit(token)
  const { pull_request } = context.payload

  if (!pull_request) {
    throw new Error(HandlePullRequestRunStrings.Error)
  }

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

  createReview &&
    (await octokit.rest.pulls.createReview({
      ...context.repo,
      pull_number: pull_request.number,
      comments,
      event: 'COMMENT',
      commit_id: context.payload.head_commit
    }))

  return run.results
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
}
