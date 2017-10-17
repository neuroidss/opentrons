import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router-dom'

import Labware from './Labware'
import styles from './DeckConfig.css'

DeckMap.propTypes = {
  tipracksConfirmed: PropTypes.bool.isRequired,
  labwareReviewed: PropTypes.bool.isRequired,
  labware: PropTypes.arrayOf(PropTypes.shape({
    slot: PropTypes.number.isRequired
  })).isRequired
}

function DeckMap (props) {
  const {tipracksConfirmed, labwareReviewed, currentLabwareConfirmation} = props
  const {isMoving} = currentLabwareConfirmation
  const labware = props.labware.map((lab) => (<Labware
    {...lab}
    key={lab.slot}
    isDisabled={!lab.isTiprack && !tipracksConfirmed}
    labwareReviewed={labwareReviewed}
    isMoving={isMoving}
  />))

  return (
    <div className={styles.deck}>
      {labware}
    </div>
  )
}

LabwareNotification.propTypes = {
  labware: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    slot: PropTypes.number.isRequired
  }),
  isMoving: PropTypes.bool.isRequired,
  isOverWell: PropTypes.bool.isRequired,
  moveToContainer: PropTypes.func.isRequired,
  setLabwareConfirmed: PropTypes.func.isRequired
}

function LabwareNotification (props) {
  const {
    labware,
    isMoving,
    isOverWell,
    moveToContainer,
    setLabwareConfirmed
  } = props

  if (!labware) return null
  if (isMoving) return null
  if (isOverWell) {
    return (
      <ConfirmCalibrationPrompt
        {...props}
        onYesClick={setLabwareConfirmed(labware.slot)}
      />
    )
  }
  // Move This to setupPanel, ifIsCalibrated
  return (
    <BeginCalibrationPrompt
      {...labware}
      onClick={moveToContainer(labware.slot)}
    />
  )
}

function BeginCalibrationPrompt (props) {
  const {name, type, slot, isConfirmed, onClick} = props

  const title = isConfirmed
    ? `${name} (${type}, slot ${slot}, confirmed)`
    : `${name} (${type}, slot ${slot})`

  const message = isConfirmed
    ? 'Click [Move To Well] to initiate calibration sequence again.'
    : 'Click [Move To Well] to initiate calibration sequence'

  return (
    <div className={styles.prompt}>
      <h3>{title}</h3>
      <p>{message}</p>
      <button className={styles.robot_action} onClick={onClick}>
        Move To Well A1
      </button>
    </div>
  )
}

// function RobotIsMovingPrompt () {
//   return (
//     <div className={styles.prompt}>
//       <h3>Robot Moving To well A1</h3>
//     </div>
//   )
// }

ConfirmCalibrationPrompt.propTypes = {
  labware: PropTypes.shape({
    slot: PropTypes.number.isRequired
  }).isRequired,
  onYesClick: PropTypes.func.isRequired
}

function ConfirmCalibrationPrompt (props) {
  const {labware, onYesClick} = props

  // TODO(mc, 2017-10-06): use props for no button href
  return (
    <div className={styles.prompt}>
      <h3>
        {`Is Pipette accurately centered over slot ${labware.slot} A1 well?`}
      </h3>
      <button
        className={styles.confirm}
        onClick={onYesClick}
      >
        Yes
      </button>
      <Link className={styles.btn_modal} to='/setup-deck/jog'>
        No
      </Link>
    </div>
  )
}

DeckConfig.propTypes = {
  labwareReviewed: PropTypes.bool.isRequired,
  setLabwareReviewed: PropTypes.func.isRequired,
  currentLabware: PropTypes.object,
  currentLabwareConfirmation: PropTypes.object.isRequired,
  moveToContainer: PropTypes.func.isRequired,
  setLabwareConfirmed: PropTypes.func.isRequired
}

export default function DeckConfig (props) {
  const {
    labwareReviewed,
    currentLabware,
    currentLabwareConfirmation,
    moveToContainer,
    setLabwareConfirmed,
    slot
  } = props
  const onConfirmClick = moveToContainer(slot)

  const deckMap = (<DeckMap {...props} />)

  // TODO: current labware needs to be set while navigating to route
  if (!labwareReviewed) {
    return (
      <section className={styles.review_deck}>
        <div>
          {deckMap}
        </div>
        <div className={styles.review_message}>
          <p>
            Before entering Labware Setup, check that your labware is positioned correctly in the deck slots as illustrated above.
          </p>
          <button className={styles.continue} onClick={onConfirmClick}>
            CONTINUE MOVING TO {currentLabware.type}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className={styles.deck_calibration}>
        {deckMap}
      </div>
      <LabwareNotification
        {...currentLabwareConfirmation}
        labware={currentLabware}
        moveToContainer={moveToContainer}
        setLabwareConfirmed={setLabwareConfirmed}
      />
    </section>
  )
}
