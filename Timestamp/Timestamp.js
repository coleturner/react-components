import React from 'react';
import moment from 'moment';

import Time from '../Time';

export const Timestamp = (props) => {
  const { children, dateTime, format, ...otherProps } = props;
  return (
    <Time {...otherProps}>
      {format(dateTime || children)}
    </Time>
  );
};

Timestamp.propTypes = {
  children: React.PropTypes.node,
  dateTime: React.PropTypes.string,
  format: React.PropTypes.func.isRequired
};

Timestamp.defaultProps = {
  format: (ts) => {
    return moment.utc(ts, "YYYY-MM-DD HH:mm:ss Z").fromNow();
  }
};

export default Timestamp;
