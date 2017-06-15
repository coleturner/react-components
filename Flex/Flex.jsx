import React from 'react';
import classNames from 'classnames';

import View from './View';

const Flex = (props) => {
  const { children, direction, ...otherProps } = props;
  otherProps.className = classNames('flex', otherProps.className, 'flex-' + direction);

  return (
    <View {...otherProps}>
      {children}
    </View>
  );
};

Flex.propTypes = {
  children: React.PropTypes.node.isRequired,
  direction: React.PropTypes.string
};

Flex.defaultProps = {
  direction: 'row'
};

export default Flex;
