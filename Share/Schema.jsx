import React from 'react';

export const ShareSchema = props => {
  const { schema, ...otherProps } = props;
  const obj = { __html: JSON.stringify(schema) };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={obj} {...otherProps} />
  );
};

ShareSchema.propTypes = {
  schema: React.PropTypes.object.isRequired
};


export default ShareSchema;
