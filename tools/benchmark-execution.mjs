/** Never retry timed device work; preserve its failure before aborting the stage. */
export async function measureOnce(measure, checkpointFailure) {
  try { return await measure(); }
  catch (error) { await checkpointFailure(error); throw error; }
}
