// @flow
// list components

import * as React from 'react'
import classnames from 'classnames'

import styles from './lists.css'

type ListProps = {
  onClick?: (event: SyntheticEvent<>) => void,
  title?: string,
  className?: string,
  children?: React.Node
}

function List (props: ListProps) {
  return (
    <ol className={props.className}>
      {props.children}
    </ol>
  )
}

export default function TitledList (props: ListProps) {
  const className = classnames(styles.titled_list, props.className)

  return (
    <List {...props} className={className}>
      <h3 className={styles.list_title}>{props.title}</h3>
      {props.children}
    </List>
  )
}
