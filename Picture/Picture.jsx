import React from 'react';
import Image from '../Image';

export default class Picture extends React.PureComponent {

  static propTypes = {
    backupSrc: React.PropTypes.string,
    onAlreadyLoaded: React.PropTypes.func,
    onError: React.PropTypes.func,
    src: React.PropTypes.string
  };

  static defaultProps = {
    backupSrc: null,
    onAlreadyLoaded: () => { },
    onError: () => { }
  };

  constructor(...args) {
    super(...args);

    this.boundSetRef = (ref) => {
      if (ref && ref.complete) {
        this.props.onAlreadyLoaded(ref);
      }

      this.element = ref;
    };

    this.boundOnError = (evt) => this.onError(evt);
  }

  element = null;

  onError(evt) {
    this.props.onError(evt);

    if (this.element && this.props.backupSrc && this.props.src !== this.props.backupSrc) {
      this.element.src = this.props.backupSrc;
    }
  }

  render() {
    const props = this.props;
    const { onAlreadyLoaded, onError, backupSrc, src, ...otherProps } = props;

    return (
      <Image onError={this.boundOnError} ref={this.boundSetRef} src={src || backupSrc} {...otherProps} />
    );
  }
}
