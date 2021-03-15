import React from 'react'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton' // (https://github.com/dvtng/react-loading-skeleton#readme)

const scaleWidth = width => {
  const MY_SCREEN_WIDTH = 1440
  const CURRENT_SCREEN_WIDTH = parseInt(document.documentElement.clientWidth)

  return (width * CURRENT_SCREEN_WIDTH) / MY_SCREEN_WIDTH
}

const scaleHeight = height => {
  const MY_SCREEN_HEIGHT = 788
  const CURRENT_SCREEN_HEIGHT = parseInt(document.documentElement.clientHeight)

  return (height * CURRENT_SCREEN_HEIGHT) / MY_SCREEN_HEIGHT
}

export const ReSpeakLoader = () => {
  const MenuGhost = () => {
    const menuGhost = []
    for (let i = 1; i <= 7; i++) {
      menuGhost.push(
        <li className="menu-item-ghost" key={i}>
          <Skeleton width={182} height={41} />
        </li>,
      )
    }
    return menuGhost
  }

  return (
    <React.Fragment>
      <div className="toolbar-ghost">
        <Skeleton width={200} height={40} />
        <span className="autosave-ghost">
          <Skeleton width={180} height={40} />
        </span>
      </div>
      <div className="waveform-ghost">
        <Skeleton height={130} />
      </div>
      <div className="recorder-ghost">
        <div className="menu-ghost">
          <ul>
            <MenuGhost />
          </ul>
        </div>
        <div className="side-segment-ghost">
          <Skeleton height={367} width={880} />
        </div>
      </div>
    </React.Fragment>
  )
}

export const EditorLoader = () => {
  const AnnotationGhost = props => {
    const ghostAnnotation = []
    for (let i = 0; i < props.count; i++) {
      ghostAnnotation.push(
        <li className="list-ghost" key={i}>
          <span className="row-ghost">
            <Skeleton width={scaleWidth(15)} height={scaleHeight(20)} />
          </span>
          <span className="row-ghost">
            <Skeleton width={scaleWidth(84)} height={scaleHeight(20)} />
          </span>
          <span className="row-ghost">
            <Skeleton width={scaleWidth(84)} height={scaleHeight(20)} />
          </span>
          <span className="row-ghost">
            <Skeleton width={scaleWidth(800)} height={scaleHeight(65)} />
          </span>
        </li>,
      )
    }
    return ghostAnnotation
  }

  return (
    <React.Fragment>
      <div className="toolbar-ghost">
        <Skeleton width={400} height={40} />
        <span className="autosave-ghost">
          <Skeleton width={180} height={40} />
        </span>
      </div>
      <div className="waveform-ghost">
        <Skeleton height={130} />
      </div>
      <ul className="sentence-ghost-container">
        <AnnotationGhost count={10} />
      </ul>
    </React.Fragment>
  )
}

export const SkeletonLoader = skeletonProps => {
  return (
    <SkeletonTheme
      color="rgba(0, 0, 0, 0.4)"
      highlightColor="rgba(0, 0, 0, 0.5)"
    >
      <Skeleton {...skeletonProps} />
    </SkeletonTheme>
  )
}
