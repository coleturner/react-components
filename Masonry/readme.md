# Masonry

**Unmaintained warning**

Use at your own risk. This is not an official release and is not supported or maintained. It will get you 99% of the way to what you need if you're looking for a performant masonry layout in React/JS. However, you can expect that it will not work out of the box and will require some tweaks. 

If you would like to volunteer as a maintainer and discuss support in an official open source capacity, please reach out to @coleturner.

## Useage

This is a two step setup, first you need to create your component that will utilize the Masonry component, and you will also need to supply the Masonry component with a list of data as well as a item component that will receive the data.

As this:
```jsx
import React from 'react'
import Masonry from './path/to/components/Masonry'
import MyMasonryItem from './path/to/components/MyMasonryItem'

class MyComp extends React.Component {
  state = {
    items: null,
    hasMore: null,
    isLoading: true,
  }

  componentDidMount() {
    this.fetch()
  }

  fetch () {
    // update isLoading flag appropriately
    const additionalData = getMoreData()
    this.setState((prevState) => ({
      items: prevState.items.concat(additionalData.items),
      hasMore: additionalData.hasMore,
    }))
  }

  getState = () => this.state

  render () {
    if (!this.state.items) { return }
    const myArrayOfItems = [{ name: 'Hello' }, { name: 'World' }]
    return (<Masonry
      items={this.state.items}
      itemComponent={(props) => (<MyMasonryItem />)}
      alignCenter={true}
      containerClassName="masonry"
      layoutClassName="masonry-view"
      pageClassName="masonry-page"
      loadingElement={<span>Loading...</span>}
      columnWidth={columnWidth}
      numColumns={numColumns}
      columnGutter={columnGutter}
      hasMore={this.state.hasMore}
      isLoading={this.state.isFetching}
      onInfiniteLoad={this.fetch}
      getState={this.getState}
    />)
  }
}
```

And the item:
```jsx
class MyMasonryItem extends React.Component {
  static getColumnSpanFromProps = ({ isFeatured }, getState) => {
    if (isFeatured) {
      return 2;
    }
    return 1;
  }
  static getHeightFromProps = (getState, props, columnSpan, columnGutter) => {
    return IMAGE_HEIGHT + TITLE_HEIGHT + FOOTER_HEIGHT;
  }

  render() {
    ...
  }
}
```

## Options
```
items (Array)
  - Array of data to populate `itemComponent`
```

```
itemComponent (React.Component)
  - Component to be populated with the data in `items`
```

```
containerClassName (String | Array)
  - Optional, css class name(s) for the main container
```

```
layoutClassName (String | Array)
  - Optional, css class name(s) for the `pages` container
```

```
pageClassName (String | Array)
  - Optional, css class name(s) for the `MyMasonryItem`s container
```

```
loadingElement (DOM node)
  - Element to display while loading
```

```
numColumns (Integer)
  - Optional, but one of `columnWidth` and `numColumns` needs to be set,
    if this is set, column width will be calculated
```

```
columnWidth (Integer)
  - Optional, but one of `columnWidth` and `numColumns` needs to be set,
    will be ignored if `numColumns` are set
```

```
alignCenter (Boolean)
  - Will have no effect if numColumns is set, else it determin wether to
    center or left align the content
```

```
columnGutter (Integer)
  - Optional (default: 0), gutter width
```

```
hasMore (Boolean)
  - Flag to indicate if infinite scroll function should be triggered
```

```
isLoading (Boolean)
  - Flag do indicate wether to show the `loadingElement` or not
```

```
onInfiniteLoad (Function)
  - Function to fetch more data, this data
```

```
getState (Function)
  - Function to return state from `MyComp`
```
