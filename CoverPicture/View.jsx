import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import View from '../View';

export const useBGImage =
  ('objectFit' in document.documentElement.style) !== true;

export default class CoverPicture extends React.PureComponent {

  static propTypes = {
    className: PropTypes.any,
    children: PropTypes.node,
    pannable: PropTypes.bool,
    src: PropTypes.string.isRequired
  };

  static defaultProps = {
    pannable: true
  }

  getPositionProperties(x, y) {
    const normalX = Math.max(1, Math.min(99, x)) + '%';
    const normalY = Math.max(1, Math.min(99, y)) + '%';

    if (useBGImage) {
      return {
        backgroundPositionX: normalX,
        backgroundPositionY: normalY,
      };
    }

    return {
      objectPositionX: normalX,
      objectPositionY: normalY,
    };
  }

  state = { focus: false, objectPositionX: null, objectPositionY: null, backgroundPositionX: null, backgroundPositionY: null }

  onTouchMove = (e) => {
    if (!this.props.pannable) {
      return;
    }

    const touch = e.touches[0];
    if (!touch) {
      return;
    }

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = Math.ceil(((touch.clientX - bounds.left) / bounds.width) * 100);
    const y = Math.ceil(((touch.clientY - bounds.top) / bounds.height) * 100);

    this.setState(this.getPositionProperties(x, y));
  }

  onTouchEnd = (e) => {
    this.onMouseOut(e);
  }

  onMouseOut = () => {
    this.setState({
      backgroundPositionX: null, backgroundPositionY: null,
      objectPositionX: null, objectPositionY: null,
    });
  }

  onMouseMove = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = Math.ceil(((e.clientX - bounds.left) / bounds.width) * 100);
    const y = Math.ceil(((e.clientY - bounds.top) / bounds.height) * 100);

    this.setState(this.getPositionProperties(x, y));
  }

  render()  {
    const { children, className, src } = this.props;
    const {
      objectPositionX,
      objectPositionY,
      backgroundPositionX,
      backgroundPositionY,
    } = this.state;

    const bgStyle = useBGImage
      ? { backgroundPositionX, backgroundPositionY }
      : {};

    const imgStyle =
      useBGImage ? null :
      { objectPosition: objectPositionX && objectPositionY ? `${objectPositionX} ${objectPositionY}` : '' };

    if (useBGImage) {
      bgStyle.backgroundImage = 'url(' + src + ')';
    }

    return (
      <View
        onTouchMove={this.onTouchMove}
        onTouchEnd={this.onTouchEnd}
        onMouseOut={this.onMouseOut}
        onMouseMove={this.onMouseMove}
        className={classNames(['cover-picture', className])}
        style={bgStyle}>
        {useBGImage ? null : <img src={src} style={imgStyle} />}
        {children}
      </View>
    );
  }
}
