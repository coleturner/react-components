import React from 'react';
import classNames from 'classnames';
import Button from '../Button';
import Icon from '../Icon';
import Schema from './Schema';
import View from '../View';

import defaultSchema from '../../Config/Schema.json';
import twitterHandle from '../../Config/TwitterHandle.json';

const popup = (url, inputOptions, callback) => {
  const defaults = { width: '850', height: '650', toolbar: 0, scrollbars: 1, location: 0, statusbar: 0, menubar: 0, resizable: 1 };
  const options = Object.assign({}, defaults, inputOptions);
  const name = options.name;

  const data = [];
  for (let [key, value] of Object.entries(options)) {
    data.push(key + '=' + encodeURIComponent(value));
  }

  const x = window.open(url, name, data.join(','));
  if (typeof callback === 'function') {
    const popUpInt = setInterval(() => {
      if (!x || x.closed) {
        callback();
        clearInterval(popUpInt);
      }
    }, 300);

  }

  return x;
};

const getTitleAttribute = (schema) => {
  return schema.headline;
};

const getBodyAttribute = (schema) => {
  return schema.description || null;
};

const getImageAttribute = (schema) => {
  if ('image' in schema) {
    return schema.image;
  } else if ('image' in schema.author) {
    return schema.author.image;
  } else if ('logo' in schema.publisher) {
    return schema.publisher.logo;
  } else {
    const deepFindImage = (object) => {
      if (typeof object === 'object' && '@type' in object && object['@type'] === 'ImageObject') {
        return object;
      } else if (typeof object === 'object') {
        return Object.values(object).find(a => deepFindImage(a));
      } else if (Array.isArray(object)) {
        return object.find(a => deepFindImage(a));
      }

      return null;
    };

    const foundImage = deepFindImage(schema);
    if (foundImage) {
      return foundImage;
    }
  }

  return null;
};

const getURLAttribute = (schema) => {
  if ('mainEntityOfPage' in schema && '@id' in schema.mainEntityOfPage) {
    return schema.mainEntityOfPage['@id'];
  } else if ('publisher' in schema) {
    return schema.publisher.url;
  } else if (typeof location !== 'undefined') {
    return location.href;
  }

  return null;
};

const shareEmail = (schema, meta) => {

  const url = getURLAttribute(schema);
  const options = {
    subject: getTitleAttribute(schema),
    body: getBodyAttribute(schema) + "\n" + url
  };

  const data = [];
  for (let [key, value] of Object.entries(options)) {
    data.push(key + '=' + encodeURIComponent(value));
  }
  window.location.href = 'mailto:?'+data.join('&');
};

const shareFacebook = (schema, meta) => {
  if ('facebookID' in meta && meta.facebookID) {
    return shareFacebookPost(meta.facebookID);
  }

  const url = new URL('https://www.facebook.com/sharer/sharer.php?s=100');
  url.searchParams.set('p[title]', getTitleAttribute(schema));
  url.searchParams.set('p[summary]', getBodyAttribute(schema));
  url.searchParams.set('p[url]', getURLAttribute(schema));

  const image = getImageAttribute(schema);
  if (image) {
    url.searchParams.set('p[images][0]', image.url);
  }
  popup(url.toString());
};

const sharePinterest = (schema, meta) => {
  const url = new URL('https://pinterest.com/pin/create/button');
  url.searchParams.set('description', getTitleAttribute(schema));
  url.searchParams.set('url', getURLAttribute(schema));

  const image = getImageAttribute(schema);
  if (image) {
    url.searchParams.set('media', image.url);
  }
  popup(url.toString());
};

const shareTumblr = (schema, meta) => {
  const url = new URL('https://www.tumblr.com/widgets/share/tool?posttype=photo');
  url.searchParams.set('title', getTitleAttribute(schema));
  url.searchParams.set('caption', getBodyAttribute(schema));
  url.searchParams.set('canonicalUrl', getURLAttribute(schema));

  const image = getImageAttribute(schema);
  if (image) {
    url.searchParams.set('content', image.url);
  }
  popup(url.toString());
};

const shareTwitter = (schema, meta) => {
  if ('twitterID' in meta && meta.twitterID) {
    return shareRetweet(meta.twitterID);
  }

  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', getTitleAttribute(schema));
  url.searchParams.set('url', getURLAttribute(schema));

  if (twitterHandle) {
    url.searchParams.set('via', twitterHandle);
  }

  popup(url.toString());
};

const shareRetweet = (tweetID) => {
    const url = new URL('https://twitter.com/intent/retweet');
    url.searchParams.set('tweet_id', tweetID);
    if (twitterHandle) {
      url.searchParams.set('related', twitterHandle);
    }

    popup(url.toString());
}

const shareFacebookPost = (postID) => {
    const url = new URL(location.href);
    url.pathname = '/public/embedapost.php';
    url.searchParams.set('fbid', postID);

    popup(url.toString());
}

const shareAction = (schema, name, meta) => {
  switch (name) {
    case 'FACEBOOK':
      return shareFacebook(schema, meta);
    case 'PINTEREST':
      return sharePinterest(schema, meta);
    case 'TUMBLR':
      return shareTumblr(schema, meta);
    case 'TWITTER':
      return shareTwitter(schema, meta);
    default:
      return shareEmail(schema, meta);
  }
};

const shareActionButton = (schema, name, meta) => (
  <Button onClick={() => shareAction(schema, name, meta)} className={name.toLowerCase()}>
    <Icon id={Icon.LIST[name]} />
  </Button>
);

export const ShareActions = props => {

  const { children, className, count, schema: inputSchema, twitterID, facebookID, ...otherProps } = props;
  const schema = Object.assign({}, defaultSchema, inputSchema);
  const meta = { twitterID, facebookID };

  return (
    <View className={classNames('share-actions', className)} {...otherProps}>
      <Schema schema={schema} />
      <View className="share-buttons">
        {shareActionButton(schema, 'TWITTER', meta)}
        {shareActionButton(schema, 'FACEBOOK', meta)}
        {shareActionButton(schema, 'TUMBLR', meta)}
        {shareActionButton(schema, 'PINTEREST', meta)}
        {shareActionButton(schema, 'EMAIL', meta)}
      </View>
      <Button className="btn btn-default share">
        <View className="text">Share</View>
        {count ? <View className="count">{count}</View> : null}
      </Button>
    </View>
  );
};

ShareActions.propTypes = {
  counts: React.PropTypes.number
};


export default ShareActions;
