// @flow
import mapValues from 'lodash/mapValues'
import range from 'lodash/range'

import {getWellsForTips} from '../step-generation/utils'
import {utils as steplistUtils} from '../steplist'

import {
  formHasErrors,
  type ValidFormAndErrors
} from './formProcessing'

import type {
  NamedIngredsByLabwareAllSteps,
  StepIdType,
  SubSteps,
  TransferLikeSubstepItem
} from './types'

import type {
  PipetteData,
  ConsolidateFormData,
  PauseFormData,
  TransferFormData
} from '../step-generation/types'

type AllPipetteData = {[pipetteId: string]: PipetteData} // TODO make general type, key by ID not mount?
type AllLabwareTypes = {[labwareId: string]: string}

function _transferSubsteps (
  form: TransferFormData,
  transferLikeFields: *
): TransferLikeSubstepItem {
  const {
    sourceWells,
    destWells
  } = form

  const {
    stepId,
    pipette,
    volume,
    sourceLabwareType,
    destLabwareType,
    sourceWellIngreds,
    destWellIngreds
  } = transferLikeFields

  const commonFields = {
    stepType: 'transfer',
    parentStepId: stepId
  }

  const channels = pipette.channels

  if (channels > 1) {
    // multichannel

    return {
      ...commonFields,
      multichannel: true,
      volume,
      multiRows: range(sourceWells.length).map(i => {
        const sourceWellsForTips = getWellsForTips(channels, sourceLabwareType, sourceWells[i]).wellsForTips
        const destWellsForTips = getWellsForTips(channels, destLabwareType, destWells[i]).wellsForTips

        return range(channels).map(channel => {
          const sourceWell = sourceWellsForTips[channel]
          const destWell = destWellsForTips[channel]

          const sourceIngredients = sourceWellIngreds[sourceWell]
          const destIngredients = destWellIngreds
            ? destWellIngreds[destWell]
            : []

          return {
            substepId: i,
            channelId: channel,
            sourceIngredients,
            destIngredients,
            sourceWell,
            destWell
          }
        })
      })
    }
  }

  return {
    ...commonFields,
    multichannel: false,
    // TODO Ian 2018-03-02 break up steps when pipette too small
    rows: range(sourceWells.length).map(i => {
      const sourceWell = sourceWells[i]
      const destWell = destWells[i]
      return {
        substepId: i,
        sourceIngredients: sourceWellIngreds[sourceWell],
        destIngredients: destWellIngreds ? destWellIngreds[destWell] : [],
        sourceWell,
        destWell,
        volume
      }
    })
  }
}

function _consolidateSubsteps (
  form: ConsolidateFormData,
  transferLikeFields: *
): TransferLikeSubstepItem {
  const {
    sourceWells,
    destWell
  } = form

  const {
    stepId,
    pipette,
    volume,
    sourceLabwareType,
    destLabwareType,
    sourceWellIngreds,
    destWellIngreds
  } = transferLikeFields

  const commonFields = {
    stepType: 'consolidate',
    parentStepId: stepId
  }

  const channels = pipette.channels

  if (channels > 1) {
    // multichannel

    const destWellsForTips = getWellsForTips(channels, destLabwareType, destWell).wellsForTips

    return {
      ...commonFields,
      multichannel: true,
      volume,
      multiRows: range(sourceWells.length).map(i => {
        const isLastGroup = i + 1 === sourceWells.length
        const sourceWellsForTips = getWellsForTips(channels, sourceLabwareType, sourceWells[i]).wellsForTips

        return range(channels).map(channel => {
          const sourceWell = sourceWellsForTips[channel]
          const destWell = destWellsForTips[channel]

          // only show dest ingreds on last group
          const destIngredients = isLastGroup ? destWellIngreds[destWell] : []

          return {
            substepId: i,
            channelId: channel,
            sourceIngredients: sourceWellIngreds[sourceWell],
            destIngredients,
            sourceWell,
            destWell: isLastGroup ? destWell : null // only show dest wells on last group
            // volume
          }
        })
      })
    }
  }

  // dest well is only shown at the end, last substep
  const destWellSubstep = {
    destWell,
    destIngredients: destWellIngreds[destWell],
    volume: volume * sourceWells.length,
    substepId: sourceWells.length
  }

  return {
    ...commonFields,
    multichannel: false,
    // TODO Ian 2018-03-02 break up steps when pipette too small
    rows: [
      ...sourceWells.map((sourceWell, i) => ({
        substepId: i,
        sourceWell,
        sourceIngredients: sourceWellIngreds[sourceWell],
        volume
      })),
      destWellSubstep
    ]
  }
}

// NOTE: This is the fn used by the `allSubsteps` selector
export function generateSubsteps (
  validatedForms: {[StepIdType]: ValidFormAndErrors},
  allPipetteData: AllPipetteData,
  allLabwareTypes: AllLabwareTypes,
  namedIngredsByLabwareAllSteps: NamedIngredsByLabwareAllSteps,
  orderedSteps: Array<StepIdType>
): SubSteps {
  return mapValues(validatedForms, (valForm: ValidFormAndErrors, stepId: StepIdType) => {
    const validatedForm = valForm.validatedForm
    const prevStepId = steplistUtils.getPrevStepId(orderedSteps, stepId)

    // Don't try to render with errors. TODO LATER: presentational error state of substeps?
    if (validatedForm === null || formHasErrors(valForm)) {
      return null
    }

    if (validatedForm.stepType === 'deck-setup') {
      // No substeps for Deck Setup
      return null
    }

    if (validatedForm.stepType === 'pause') {
      // just returns formData
      const formData: PauseFormData = validatedForm
      return formData
    }

    // Handle all TransferLike substeps
    if (
      validatedForm.stepType === 'transfer' ||
      validatedForm.stepType === 'consolidate'
    ) {
      const namedIngredsByLabware = namedIngredsByLabwareAllSteps[prevStepId]

      if (!namedIngredsByLabware) {
        // TODO Ian 2018-05-02 another assert candidate here
        console.warn(`No namedIngredsByLabware for previous step id ${prevStepId}`)
        return null
      }

      const {
        pipette: pipetteId,
        sourceLabware,
        destLabware,
        volume
      } = validatedForm

      // TODO Ian 2018-04-06 use assert here
      if (!allPipetteData[pipetteId]) {
        console.warn(`Pipette "${pipetteId}" does not exist, step ${stepId} can't determine channels`)
      }

      const sourceWellIngreds = namedIngredsByLabware[sourceLabware]
      const destWellIngreds = namedIngredsByLabware[destLabware]

      const sourceLabwareType = allLabwareTypes[sourceLabware]
      const destLabwareType = allLabwareTypes[destLabware]

      // fields common to all transferlike substep generator fns
      const transferLikeFields = {
        stepId,

        pipette: allPipetteData[pipetteId],
        volume,

        sourceLabwareType,
        destLabwareType,

        sourceWellIngreds,
        destWellIngreds
      }

      if (validatedForm.stepType === 'transfer') {
        return _transferSubsteps(
          validatedForm,
          transferLikeFields
        )
      }

      if (validatedForm.stepType === 'consolidate') {
        return _consolidateSubsteps(
          validatedForm,
          transferLikeFields
        )
      }

      // unreachable here
    }

    console.warn('allSubsteps doesnt support step type: ', validatedForm.stepType, stepId)
    return null
  })
}
