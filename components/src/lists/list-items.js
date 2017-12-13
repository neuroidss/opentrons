// @flow
// list components

import * as React from 'react'
import {Link} from 'react-router-dom'
import classnames from 'classnames'

import styles from './lists.css'

type ListItemProps = {
  onClick?: (event: SyntheticEvent<>) => void,
  url?: string,
  className?: string,
  disabled?: boolean,
  confirmed?: boolean, // TODO: remove this prop, just pass icons from parent
  children: React.Node
}

export default function ListItem (props: ListItemProps) {
  const className = classnames(styles.list_item, props.className)
  // TODO(ka: 2017-12-13) receive icon as prop
  const iconStyle = props.confirmed
    ? classnames(styles.icon, styles.confirmed)
    : styles.icon

  if (props.url) {
    return (
      <li className={className}>
        <Link
          to={props.url}
          onClick={props.onClick}
          disabled={props.disabled}
          >
          <span className={iconStyle} />
          <span className={styles.info}>{props.children}</span>
        </Link>
      </li>
    )
  }

  return (
    <li onClick={props.onClick} className={className}>
      <span className={iconStyle} />
      <span className={styles.info}>
        {props.children}
      </span>
    </li>
  )
}
