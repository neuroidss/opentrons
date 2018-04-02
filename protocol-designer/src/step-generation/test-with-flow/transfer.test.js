// @flow
import merge from 'lodash/merge'
import {createRobotState} from './fixtures' // getTipColumn, getTiprackTipstate, createEmptyLiquidState
import transfer from '../transfer'

let transferArgs
let robotInitialState

beforeEach(() => {
  transferArgs = {
    stepType: 'transfer',
    name: 'Transfer Test',
    description: 'test blah blah',
    pipette: 'p300SingleId',

    sourceLabware: 'sourcePlateId',
    destLabware: 'destPlateId',

    preWetTip: false,
    touchTipAfterAspirate: false,
    disposalVolume: null,
    mixFirstAspirate: null,

    touchTipAfterDispense: false,
    mixInDestination: null,
    delayAfterDispense: null,
    blowout: null
  }

  robotInitialState = createRobotState({
    sourcePlateType: '96-flat',
    destPlateType: '96-flat',
    tipracks: [200],
    fillPipetteTips: true,
    fillTiprackTips: true
  })
})

test('single transfer: 1 source & 1 dest', () => {
  transferArgs = {
    ...transferArgs,
    sourceWells: ['A1'],
    destWells: ['B2'],
    changeTip: 'never',
    volume: 30
  }

  robotInitialState.liquidState.labware.sourcePlateId.A1 = {'0': {volume: 200}}

  const result = transfer(transferArgs)(robotInitialState)
  expect(result.commands).toEqual([
    {
      command: 'aspirate',
      labware: 'sourcePlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'A1'
    },
    {
      command: 'dispense',
      labware: 'destPlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'B2'
    }
  ])

  expect(result.robotState.liquidState).toEqual(merge(
    {},
    robotInitialState.liquidState,
    {
      labware: {
        sourcePlateId: {A1: {'0': {volume: 200 - 30}}},
        destPlateId: {B2: {'0': {volume: 30}}}
      },
      pipettes: {
        p300SingleId: {'0': {'0': {volume: 0}}} // pipette's Tip 0 has 0uL of Ingred 0 (contamination)
      }
    }
  ))
})

test('transfer with multiple sets of wells', () => {
  transferArgs = {
    ...transferArgs,
    sourceWells: ['A1', 'A2'],
    destWells: ['B2', 'C2'],
    changeTip: 'never',
    volume: 30
  }
  const result = transfer(transferArgs)(robotInitialState)
  expect(result.commands).toEqual([
    {
      command: 'aspirate',
      labware: 'sourcePlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'A1'
    },
    {
      command: 'dispense',
      labware: 'destPlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'B2'
    },

    {
      command: 'aspirate',
      labware: 'sourcePlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'A2'
    },
    {
      command: 'dispense',
      labware: 'destPlateId',
      pipette: 'p300SingleId',
      volume: 30,
      well: 'C2'
    }
  ])

  // TODO Ian 2018-04-02 robotState, liquidState checks
})

describe('single transfer exceeding pipette max', () => {
  beforeEach(() => {
    transferArgs = {
      ...transferArgs,
      sourceWells: ['A1'],
      destWells: ['B2'],
      volume: 350
    }
    // tip setup: tiprack's A1 has tip, pipette has no tip
    robotInitialState.tipState.tipracks.tiprack1Id.A1 = true
    robotInitialState.tipState.pipettes.p300SingleId = false
    // liquid setup
    robotInitialState.liquidState.labware.sourcePlateId.A1 = {'0': {volume: 400}}
  })

  test('changeTip="once"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'once'
    }

    const result = transfer(transferArgs)(robotInitialState)
    expect(result.commands).toEqual([
      {
        command: 'pick-up-tip',
        pipette: 'p300SingleId',
        labware: 'tiprack1Id',
        well: 'A1'
      },

      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'B2'
      },

      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'B2'
      }
    ])

    expect(result.robotState.liquidState).toEqual(merge(
      {},
      robotInitialState.liquidState,
      {
        labware: {
          sourcePlateId: {A1: {'0': {volume: 400 - 350}}},
          destPlateId: {B2: {'0': {volume: 350}}}
        },
        pipettes: {
          p300SingleId: {'0': {'0': {volume: 0}}} // pipette's Tip 0 has 0uL of Ingred 0 (contamination)
        }
      }
    ))
  })

  test('changeTip="always"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'always'
    }

    const result = transfer(transferArgs)(robotInitialState)
    expect(result.commands).toEqual([
      {
        command: 'pick-up-tip',
        pipette: 'p300SingleId',
        labware: 'tiprack1Id',
        well: 'A1'
      },

      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'B2'
      },

      // replace tip before next asp-disp chunk
      {
        command: 'drop-tip',
        pipette: 'p300SingleId',
        labware: 'trashId',
        well: 'A1'
      },
      {
        command: 'pick-up-tip',
        pipette: 'p300SingleId',
        labware: 'tiprack1Id',
        well: 'B1'
      },

      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'B2'
      }
    ])

    expect(result.robotState.liquidState).toEqual(merge(
      {},
      robotInitialState.liquidState,
      {
        labware: {
          sourcePlateId: {A1: {'0': {volume: 400 - 350}}},
          destPlateId: {B2: {'0': {volume: 350}}},
          trashId: result.robotState.liquidState.labware.trashId // Ignore liquid contents of trash. TODO LATER make this more elegant
        },
        pipettes: {
          p300SingleId: {'0': {'0': {volume: 0}}} // pipette's Tip 0 has 0uL of Ingred 0 (contamination)
        }
      }
    ))
  })

  test('changeTip="never"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'never'
    }
    // begin with tip on pipette
    robotInitialState.tipState.pipettes.p300SingleId = true

    const result = transfer(transferArgs)(robotInitialState)
    expect(result.commands).toEqual([
      // no pick up tip
      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 300,
        well: 'B2'
      },

      {
        command: 'aspirate',
        labware: 'sourcePlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'A1'
      },
      {
        command: 'dispense',
        labware: 'destPlateId',
        pipette: 'p300SingleId',
        volume: 50,
        well: 'B2'
      }
    ])

    expect(result.robotState.liquidState).toEqual(merge(
      {},
      robotInitialState.liquidState,
      {
        labware: {
          sourcePlateId: {A1: {'0': {volume: 400 - 350}}},
          destPlateId: {B2: {'0': {volume: 350}}}
        },
        pipettes: {
          p300SingleId: {'0': {'0': {volume: 0}}} // pipette's Tip 0 has 0uL of Ingred 0 (contamination)
        }
      }
    ))
  })
})

describe('advanced options', () => {
  beforeEach(() => {
    transferArgs = {
      ...transferArgs,
      sourceWells: ['A1'],
      destWells: ['B1'],
      changeTip: 'never'
    }
  })
  describe('...aspirate options', () => {
    test('pre-wet tip should aspirate and dispense transfer volume from source well of each subtransfer', () => {
      transferArgs = {
        ...transferArgs,
        volume: 350,
        preWetTip: true
      }

      const result = transfer(transferArgs)(robotInitialState)
      expect(result.commands).toEqual([
        // pre-wet aspirate/dispense
        {
          command: 'aspirate',
          labware: 'sourcePlateId',
          pipette: 'p300SingleId',
          volume: 300,
          well: 'A1'
        },
        {
          command: 'dispense',
          labware: 'sourcePlateId',
          pipette: 'p300SingleId',
          volume: 300,
          well: 'A1'
        },

        // "real" aspirate/dispenses
        {
          command: 'aspirate',
          labware: 'sourcePlateId',
          pipette: 'p300SingleId',
          volume: 300,
          well: 'A1'
        },
        {
          command: 'dispense',
          labware: 'destPlateId',
          pipette: 'p300SingleId',
          volume: 300,
          well: 'B1'
        },

        {
          command: 'aspirate',
          labware: 'sourcePlateId',
          pipette: 'p300SingleId',
          volume: 50,
          well: 'A1'
        },
        {
          command: 'dispense',
          labware: 'destPlateId',
          pipette: 'p300SingleId',
          volume: 50,
          well: 'B1'
        }
      ])
    })

    test('touch-tip after aspirate should touch-tip on each source well, for every aspirate')
    test('mix before aspirate')
    test('air gap => ???') // TODO determine behavior
    test('disposal volume => ???') // TODO determine behavior
  })

  describe('...dispense options', () => {
    test('mix after dispense')
    test('delay after dispense')
    test('blowout should blowout in specified labware after each dispense')
  })
})
