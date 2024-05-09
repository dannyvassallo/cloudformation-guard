import * as core from '@actions/core'
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
    // const ref = github.context.ref
    // const repository = github.context.repo.repo
    console.warn(context)
    // await exec('git init')
    // await exec(`git remote add origin https://github.com/${repository}.git`)
    // if (github?.context.eventName === 'pull_request') {
    //   const prRef = `refs/pull/${github?.context.payload.pull_request?.number}/merge`
    //   await exec(`git fetch origin ${prRef}`)
    //   await exec(`git checkout -qf FETCH_HEAD`)
    // } else {
    //   await exec(`git fetch origin ${ref}`)
    //   await exec(`git checkout FETCH_HEAD`)
    //   await exec(`ls`)
    // }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }

  try {
    const rulesPath: string = core.getInput('rules')
    const dataPath: string = core.getInput('data')

    const result = await validate({
      rulesPath,
      dataPath
    })

    core.setOutput('GUARD', JSON.stringify(result))
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
