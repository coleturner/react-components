# React -Masonry Layout 
*Cole Turner - turner.cole@gmail.com | www.cole.codes*
 * Please PR any new features you add so that others can enjoy
 * the blood sweat and tears of open source.

 ### Features:
 >Masonry Layout
 
 >Items must have fixed column width.
 
 >Items can span multiple columns.
 
 >Layout will be precalculated but only if the number of items has changed.
 
 >This engine was designed for a static order placement
  and was not designed for reordering.
  
 >New items will layout if the previous layout parameters still apply.
 
 >Function `getState` returns either Redux or local component state.
 
 >Infinite Scroll
---
 ### How to use:
    const myArrayOfItems = [{ name: 'Hello' }, { name: 'World' }]
    <Masonry
      items={myArrayOfItems}
      itemComponent={MyMasonryItem}
      alignCenter={true}
      containerClassName="masonry"
      layoutClassName="masonry-view"
      pageClassName="masonry-page"
      loadingElement={<span>Loading...</span>}
      columnWidth={columnWidth}
      columnGutter={columnGutter}
      hasMore={this.props.hasMore}
      isLoading={this.props.isFetching}
      onInfiniteLoad={this.onFetch}
      getState={this.props.getState}
    />

### How to layout your item:
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
