// @flow
import {createRobotState} from './fixtures' // getTipColumn, getTiprackTipstate, createEmptyLiquidState
import transfer from '../transfer'

describe('transfer single-channel', () => {
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

    // TODO Ian 2018-04-02 robotState, liquidState checks
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
    test('changeTip="once"', () => {
      transferArgs = {
        ...transferArgs,
        sourceWells: ['A1'],
        destWells: ['B2'],
        changeTip: 'once',
        volume: 350
      }
      const result = transfer(transferArgs)(robotInitialState)
      expect(result.commands).toEqual([
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

      // TODO Ian 2018-04-02 robotState, liquidState checks
    })

    test('changeTip="always"')

    test('changeTip="never"')
  })
})

describe('advanced options', () => {
  describe('...aspirate options', () => {
    test('pre-wet tip should aspirate and dispense transfer volume from source well of each transfer')
    test('touch-tip after aspirate should touch-tip on each source well, for every aspirate')
    test('air gap => ???') // TODO determine behavior
    test('mix before aspirate')
    test('disposal volume => ???') // TODO determine behavior
  })

  describe('...dispense options', () => {
    test('mix after dispense')
    test('delay after dispense')
    test('blowout should blowout in specified labware after each dispense')
  })
})

describe('transfer multi-channel', () => {
  test('simple transfer')
  test('transfer with multiple sets of wells')
})
