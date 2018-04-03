// @flow
import flatMap from 'lodash/flatMap'
import zip from 'lodash/zip'
import mix from './mix'
import aspirate from './aspirate'
import dispense from './dispense'
import replaceTip from './replaceTip'
import {reduceCommandCreators} from './utils'
// blowout, repeatArray, touchTip
import type {TransferFormData, RobotState, CommandCreator} from './'

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
  console.log({data, prevRobotState})
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

  // volume of each chunk in a sub-transfer
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
        (subTransferVol: number, chunkIdx: number): Array<CommandCreator> => {
          // TODO IMMEDIATELY disposal vol ^^^
          const tipCommands: Array<CommandCreator> = (
            (data.changeTip === 'once' && chunkIdx === 0) ||
            data.changeTip === 'always')
              ? [replaceTip(data.pipette)]
              : []

          const preWetTipCommands = (data.preWetTip && chunkIdx === 0)
            ? mix(data.pipette, data.sourceLabware, sourceWell, Math.max(subTransferVol), 1)
            : []

          return [
            ...tipCommands,
            ...preWetTipCommands,
            aspirate({
              pipette: data.pipette,
              volume: subTransferVol,
              labware: data.sourceLabware,
              well: sourceWell
            }),
            dispense({
              pipette: data.pipette,
              volume: subTransferVol,
              labware: data.destLabware,
              well: destWell
            })
          ]
        }
      )
    }
  )

  return reduceCommandCreators(CommandCreators)(prevRobotState)
}

export default transfer
