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

  state = {
    isPanning: false,
    objectPositionX: null,
    objectPositionY: null,
    backgroundPositionX: null,
    backgroundPositionY: null,
    scale: null
  }

  activationTimeout = null
  activatePanning = () => {
    this.activationTimeout = setTimeout(() => {
      this.setState({ isPanning: true });
    }, 1000);
  }

  deactivatePanning = () => {
    clearTimeout(this.activationTimeout);
    this.setState({ isPanning: false });
  }

  getPositionProperties(x, y) {
    const normalX = Math.max(1, Math.min(99, x)) + '%';
    const normalY = Math.max(1, Math.min(99, y)) + '%';

    const anchor = 50;
    const scale = Math.max(1, 1.5 * (anchor - ((Math.max(anchor, x) - Math.min(anchor, x)) / 2)) / anchor);

    if (useBGImage) {
      return {
        backgroundPositionX: normalX,
        backgroundPositionY: normalY,
        scale
      };
    }

    return {
      objectPositionX: normalX,
      objectPositionY: normalY,
      scale
    };
  }

  onTouchMove = (e) => {
    if (!this.state.isPanning) {
      return;
    }

    e.preventDefault();

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
      scale: null,
      isPanning: false,
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
      scale
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

    if (scale) {
      imgStyle.transform = `scale(${scale})`;
    }

    const anchorStyle = {
      left: useBGImage ? backgroundPositionX : objectPositionX
    };

    return (
      <View
        onMouseDown={this.activatePanning}
        onMouseUp={this.deactivatePanning}
        onTouchStart={this.activatePanning}
        onTouchMove={this.onTouchMove}
        onTouchEnd={this.onTouchEnd}
        onMouseOut={this.onMouseOut}
        onMouseMove={this.onMouseMove}
        className={classNames(['panorama', className])}
        style={bgStyle}>
        {useBGImage ? null : <img src={src} style={imgStyle} />}
        {children}
        <span
          className="anchor"
          style={anchorStyle}
        />
      </View>
    );
  }
}
