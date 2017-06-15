import React from 'react';

export const createElement = (Element, props) => {
  const { children, ...otherProps } = props;
  return (
    <Element {...otherProps}>
      {props.children}
    </Element>
  );
};

export default createElement;
