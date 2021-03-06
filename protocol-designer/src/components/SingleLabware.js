// @flow
import * as React from 'react'
import cx from 'classnames'
import {SLOT_WIDTH, SLOT_HEIGHT} from '../constants.js'
import styles from './SingleLabware.css'

type Props = {
  className?: string,
  children?: React.Node
}

/** Simply wraps SVG components like Plate/SelectablePlate with correct dimensions */
export default function SingleLabware (props: Props) {
  return (
    <div className={cx(styles.single_labware, props.className)}>
      <svg viewBox={`0 0 ${SLOT_WIDTH} ${SLOT_HEIGHT}`}>
        {props.children}
      </svg>
    </div>
  )
}
