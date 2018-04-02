// @flow
import type {TransferFormData, RobotState, CommandCreator} from './'
import {aspirate, dispense, reduceCommandCreators} from './' // blowout, replaceTip, repeatArray, touchTip
import flatMap from 'lodash/flatMap'
// import range from 'lodash/range'
import zip from 'lodash/zip'

const transfer = (data: TransferFormData): CommandCreator => (prevRobotState: RobotState) => {
  /**
    Transfer will iterate through a set of 1 or more source and destination wells.
    For each pair, it will aspirate from the source well, then dispense into the destination well.
    This pair of 1 source well and 1 dest well is internally called a "sub-transfer".

    If the volume to aspirate from a source well exceeds the max volume of the pipette,
    then each sub-transfer will be chunked into multiple asp-disp, asp-disp commands.

    A single uniform volume will be aspirated from every source well and dispensed into every dest well.
    In other words, all the sub-transfers will use the same uniform volume.
  */

  // TODO Ian 2018-04-02 following ~10 lines are identical to first lines of consolidate.js...
  const pipetteData = prevRobotState.instruments[data.pipette]
  if (!pipetteData) {
    throw new Error('Consolidate called with pipette that does not exist in robotState, pipette id: ' + data.pipette) // TODO test
  }

  // TODO error on negative data.disposalVolume?
  const disposalVolume = (data.disposalVolume && data.disposalVolume > 0)
    ? data.disposalVolume
    : 0

  const effectiveTransferVol = pipetteData.maxVolume - disposalVolume

  const chunksPerSubTransfer = Math.ceil(
    data.volume / effectiveTransferVol
  )
  const lastSubTransferVol = data.volume - ((chunksPerSubTransfer - 1) * effectiveTransferVol)
  const subTransferVolumes: Array<number> = Array(chunksPerSubTransfer - 1)
    .fill(effectiveTransferVol)
    .concat(lastSubTransferVol)

  const sourceDestPairs = zip(data.sourceWells, data.destWells)
  const CommandCreators = flatMap(
    sourceDestPairs,
    (wellPair: [string, string], pairIdx: number): Array<CommandCreator> => {
      const [sourceWell, destWell] = wellPair

      return flatMap(
        subTransferVolumes,
        (subTransferVol: number, subTransferIdx: number): Array<CommandCreator> => [
          aspirate({
            pipette: data.pipette,
            volume: subTransferVol, // TODO disposal vol
            labware: data.sourceLabware,
            well: sourceWell
          }),
          dispense({
            pipette: data.pipette,
            volume: subTransferVol, // TODO
            labware: data.destLabware,
            well: destWell
          })
        ]
      )
    }
  )

  return reduceCommandCreators(CommandCreators)(prevRobotState)
}

export default transfer
